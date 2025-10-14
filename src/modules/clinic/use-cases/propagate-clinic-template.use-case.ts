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
  ClinicConfigurationVersion,
  ClinicTemplatePropagationInput,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IPropagateClinicTemplateUseCase,
  IPropagateClinicTemplateUseCase as IPropagateClinicTemplateUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/propagate-clinic-template.use-case.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicTemplateOverrideService } from '../services/clinic-template-override.service';

@Injectable()
export class PropagateClinicTemplateUseCase
  extends BaseUseCase<ClinicTemplatePropagationInput, ClinicConfigurationVersion[]>
  implements IPropagateClinicTemplateUseCase
{
  protected readonly logger = new Logger(PropagateClinicTemplateUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly auditService: ClinicAuditService,
    private readonly messageBus: MessageBus,
    private readonly templateOverrideService: ClinicTemplateOverrideService,
  ) {
    super();
  }

  protected async handle(
    input: ClinicTemplatePropagationInput,
  ): Promise<ClinicConfigurationVersion[]> {
    const templateClinic = await this.clinicRepository.findById(input.templateClinicId);

    if (!templateClinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica template nao encontrada');
    }

    if (templateClinic.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.invalidClinicData(
        'Clinica template nao pertence ao tenant informado',
      );
    }

    const sections = Array.from(new Set(input.sections ?? []));

    if (sections.length === 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        'propagate',
        'Informe pelo menos uma secao para propagacao',
      );
    }

    const targetClinicIds = Array.from(
      new Set(
        (input.targetClinicIds ?? []).filter((clinicId) => clinicId !== input.templateClinicId),
      ),
    );

    if (targetClinicIds.length === 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        'propagate',
        'Informe pelo menos uma clinica alvo valida',
      );
    }

    const propagatedVersions: ClinicConfigurationVersion[] = [];

    for (const section of sections) {
      const templateVersion = await this.configurationRepository.findLatestAppliedVersion(
        templateClinic.id,
        section,
      );

      if (!templateVersion) {
        throw ClinicErrorFactory.configurationVersionNotFound(
          `A clinica template nao possui versao aplicada para a secao "${section}"`,
        );
      }

      for (const targetClinicId of targetClinicIds) {
        const targetClinic = await this.clinicRepository.findById(targetClinicId);

        if (!targetClinic) {
          throw ClinicErrorFactory.clinicNotFound(`Clinica alvo ${targetClinicId} nao encontrada`);
        }

        if (targetClinic.tenantId !== templateClinic.tenantId) {
          throw ClinicErrorFactory.invalidClinicData(
            `Clinica alvo ${targetClinicId} pertence a outro tenant`,
          );
        }

        const { payload: mergedPayload, override } =
          await this.templateOverrideService.mergeWithActiveOverride({
            clinic: targetClinic,
            section,
            templateVersion,
          });

        const versionNotes =
          input.versionNotes ??
          `Propagado da clinica ${templateClinic.id} (secao ${section}, versao ${templateVersion.version})`;

        const createdVersion = await this.configurationRepository.createVersion({
          clinicId: targetClinic.id,
          tenantId: targetClinic.tenantId,
          section,
          payload: mergedPayload,
          versionNotes,
          createdBy: input.triggeredBy,
          autoApply: true,
        });

        const appliedAt = new Date();

        await this.configurationRepository.applyVersion({
          clinicId: targetClinic.id,
          tenantId: targetClinic.tenantId,
          section,
          versionId: createdVersion.id,
          appliedBy: input.triggeredBy,
        });

        createdVersion.appliedAt = appliedAt;

        await this.clinicRepository.setCurrentConfigurationVersion({
          clinicId: targetClinic.id,
          tenantId: targetClinic.tenantId,
          section,
          versionId: createdVersion.id,
          updatedBy: input.triggeredBy,
        });

        if (override) {
          await this.templateOverrideService.markOverrideApplied({
            clinic: targetClinic,
            section,
            override,
            appliedVersionId: createdVersion.id,
            appliedAt,
            updatedBy: input.triggeredBy,
          });
        } else {
          await this.clinicRepository.updateTemplateOverrideMetadata({
            clinicId: targetClinic.id,
            tenantId: targetClinic.tenantId,
            section,
            override: null,
          });
        }

        await this.clinicRepository.updateTemplatePropagationMetadata({
          clinicId: targetClinic.id,
          tenantId: targetClinic.tenantId,
          section,
          templateClinicId: templateClinic.id,
          templateVersionId: templateVersion.id,
          templateVersionNumber: templateVersion.version,
          propagatedVersionId: createdVersion.id,
          propagatedAt: appliedAt,
          triggeredBy: input.triggeredBy,
        });

        await this.auditService.register({
          tenantId: targetClinic.tenantId,
          clinicId: targetClinic.id,
          performedBy: input.triggeredBy,
          event: 'clinic.configuration.template_propagated',
          detail: {
            templateClinicId: templateClinic.id,
            templateVersionId: templateVersion.id,
            propagatedVersionId: createdVersion.id,
            section,
          },
        });

        await this.messageBus.publish(
          DomainEvents.clinicTemplatePropagated(templateClinic.id, {
            tenantId: targetClinic.tenantId,
            templateVersionId: templateVersion.id,
            propagatedVersionId: createdVersion.id,
            targetClinicId: targetClinic.id,
            section,
            triggeredBy: input.triggeredBy,
          }),
        );

        propagatedVersions.push(createdVersion);
      }
    }

    return propagatedVersions;
  }
}

export const PropagateClinicTemplateUseCaseToken = IPropagateClinicTemplateUseCaseToken;
