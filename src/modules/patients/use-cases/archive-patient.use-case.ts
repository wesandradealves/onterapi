import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IArchivePatientUseCase } from '../../../domain/patients/interfaces/use-cases/archive-patient.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import { ArchivePatientInput } from '../../../domain/patients/types/patient.types';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';
import { PatientNotificationService } from '../../../infrastructure/patients/services/patient-notification.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class ArchivePatientUseCase
  extends BaseUseCase<ArchivePatientInput, void>
  implements IArchivePatientUseCase
{
  protected readonly logger = new Logger(ArchivePatientUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    private readonly auditService: PatientAuditService,
    private readonly notificationService: PatientNotificationService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: ArchivePatientInput): Promise<void> {
    const existing = await this.patientRepository.findById(input.tenantId, input.patientId);

    if (!existing) {
      throw PatientErrorFactory.notFound();
    }

    const role = input.requesterRole?.toUpperCase();
    if (!['CLINIC_OWNER', 'SUPER_ADMIN', 'GESTOR', 'MANAGER'].includes(role ?? '')) {
      throw PatientErrorFactory.unauthorized();
    }

    const { requesterRole, ...payload } = input as any;
    await this.patientRepository.archive(payload);

    await this.auditService.register('patient.archived', {
      tenantId: input.tenantId,
      patientId: input.patientId,
      reason: input.reason,
      requestedBy: input.requestedBy,
    });

    await this.notificationService.notifyArchive(input.patientId, input.tenantId, input.reason);

    const event = DomainEvents.patientArchived(
      input.patientId,
      { tenantId: input.tenantId, reason: input.reason },
      { userId: input.requestedBy },
    );

    await this.messageBus.publish(event);
  }
}
