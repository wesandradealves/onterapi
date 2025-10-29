import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  GetClinicSecuritySettingsInput,
  type IGetClinicSecuritySettingsUseCase,
  IGetClinicSecuritySettingsUseCase as IGetClinicSecuritySettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-security-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  ClinicSecurityComplianceDocument,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class GetClinicSecuritySettingsUseCase
  extends BaseUseCase<GetClinicSecuritySettingsInput, ClinicConfigurationVersion>
  implements IGetClinicSecuritySettingsUseCase
{
  protected readonly logger = new Logger(GetClinicSecuritySettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly telemetryService: ClinicConfigurationTelemetryService,
    private readonly configurationCache: ClinicConfigurationCacheService,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicSecuritySettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const cached = await this.configurationCache.get({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'security',
    });

    if (cached) {
      return cached;
    }

    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'security',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configuracoes de seguranca nao encontradas para a clinica',
      );
    }

    version.payload = this.applyComplianceDocuments(version.payload, clinic.metadata?.compliance);

    version.telemetry = this.telemetryService.ensureTelemetry({
      clinic,
      section: 'security',
      payload: version.payload ?? {},
      appliedAt: version.appliedAt,
      createdBy: version.createdBy,
      autoApply: version.autoApply,
    });

    await this.configurationCache.set({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'security',
      version,
    });

    return version;
  }

  private applyComplianceDocuments(
    payload: Record<string, unknown> | null | undefined,
    complianceMetadata: unknown,
  ): Record<string, unknown> {
    const securityPayload =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

    const target =
      securityPayload.securitySettings && typeof securityPayload.securitySettings === 'object'
        ? (securityPayload.securitySettings as Record<string, unknown>)
        : securityPayload;

    const documents = this.extractComplianceDocuments(complianceMetadata);

    if (documents.length > 0) {
      target.compliance = {
        documents: documents.map((document) => this.serializeComplianceDocument(document)),
      };
    } else if (target.compliance) {
      delete target.compliance;
    }

    if (target !== securityPayload) {
      securityPayload.securitySettings = target;
    }

    return securityPayload;
  }

  private extractComplianceDocuments(metadata: unknown): ClinicSecurityComplianceDocument[] {
    if (!metadata || typeof metadata !== 'object') {
      return [];
    }

    const record = metadata as Record<string, unknown>;
    const rawDocuments = record.documents;

    if (!Array.isArray(rawDocuments)) {
      return [];
    }

    const documents: ClinicSecurityComplianceDocument[] = [];

    rawDocuments.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const doc = entry as Record<string, unknown>;
      const typeValue = doc.type;
      if (typeof typeValue !== 'string' || typeValue.trim().length === 0) {
        return;
      }

      const document: ClinicSecurityComplianceDocument = {
        type: typeValue.trim(),
        required: typeof doc.required === 'boolean' ? doc.required : true,
      };

      if (typeof doc.id === 'string' && doc.id.trim().length > 0) {
        document.id = doc.id.trim();
      }

      if (typeof doc.name === 'string' && doc.name.trim().length > 0) {
        document.name = doc.name.trim();
      }

      if (typeof doc.status === 'string' && doc.status.trim().length > 0) {
        document.status = doc.status.trim() as ClinicSecurityComplianceDocument['status'];
      }

      if (doc.expiresAt === null) {
        document.expiresAt = null;
      } else if (typeof doc.expiresAt === 'string') {
        const parsed = new Date(doc.expiresAt);
        if (!Number.isNaN(parsed.getTime())) {
          document.expiresAt = parsed;
        }
      }

      if (
        doc.metadata &&
        typeof doc.metadata === 'object' &&
        Object.keys(doc.metadata as Record<string, unknown>).length > 0
      ) {
        document.metadata = JSON.parse(JSON.stringify(doc.metadata));
      }

      if (typeof doc.updatedAt === 'string') {
        const parsedUpdatedAt = new Date(doc.updatedAt);
        if (!Number.isNaN(parsedUpdatedAt.getTime())) {
          document.updatedAt = parsedUpdatedAt;
        }
      }

      if (typeof doc.updatedBy === 'string' && doc.updatedBy.trim().length > 0) {
        document.updatedBy = doc.updatedBy.trim();
      }

      documents.push(document);
    });

    return documents;
  }

  private serializeComplianceDocument(
    document: ClinicSecurityComplianceDocument,
  ): Record<string, unknown> {
    return {
      id: document.id,
      type: document.type,
      name: document.name,
      required: document.required,
      status: document.status,
      expiresAt:
        document.expiresAt === null
          ? null
          : document.expiresAt instanceof Date
            ? document.expiresAt.toISOString()
            : undefined,
      metadata: document.metadata,
      updatedAt:
        document.updatedAt instanceof Date ? document.updatedAt.toISOString() : document.updatedAt,
      updatedBy: document.updatedBy,
    };
  }
}

export const GetClinicSecuritySettingsUseCaseToken = IGetClinicSecuritySettingsUseCaseToken;
