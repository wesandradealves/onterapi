import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type ICreateClinicUseCase,
  ICreateClinicUseCase as ICreateClinicUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/create-clinic.use-case.interface';
import {
  Clinic,
  ClinicHoldSettings,
  CreateClinicInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class CreateClinicUseCase
  extends BaseUseCase<CreateClinicInput, Clinic>
  implements ICreateClinicUseCase
{
  protected readonly logger = new Logger(CreateClinicUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(input: CreateClinicInput): Promise<Clinic> {
    const normalizedSlug = input.slug.trim().toLowerCase();

    const existingBySlug = await this.clinicRepository.findBySlug(input.tenantId, normalizedSlug);
    if (existingBySlug) {
      throw ClinicErrorFactory.clinicSlugInUse('Slug de clinica ja esta em uso');
    }

    if (input.document?.value) {
      const documentExists = await this.clinicRepository.existsByDocument(
        input.tenantId,
        input.document.value,
      );
      if (documentExists) {
        throw ClinicErrorFactory.clinicDocumentInUse('Documento de clinica ja cadastrado');
      }
    }

    const holdSettings = this.validateHoldSettings(input.holdSettings);

    const clinic = await this.clinicRepository.create({
      ...input,
      slug: normalizedSlug,
      holdSettings,
    });

    await this.auditService.register({
      event: 'clinic.created',
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
      performedBy: clinic.primaryOwnerId,
      detail: {
        slug: clinic.slug,
        document: clinic.document ?? undefined,
        metadata: clinic.metadata ?? undefined,
      },
    });

    return clinic;
  }

  private validateHoldSettings(
    holdSettings?: ClinicHoldSettings | null,
  ): ClinicHoldSettings | undefined {
    if (!holdSettings) {
      return {
        ttlMinutes: 30,
        minAdvanceMinutes: 60,
        allowOverbooking: false,
        resourceMatchingStrict: true,
      };
    }

    if (holdSettings.ttlMinutes <= 0 || holdSettings.minAdvanceMinutes < 0) {
      throw ClinicErrorFactory.invalidClinicData(
        'Configuracoes de hold invalidas: TTL deve ser positivo e antecedencia minima nao pode ser negativa',
      );
    }

    return holdSettings;
  }
}

export const CreateClinicUseCaseToken = ICreateClinicUseCaseToken;
