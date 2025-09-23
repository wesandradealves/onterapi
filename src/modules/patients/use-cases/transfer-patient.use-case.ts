import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ITransferPatientUseCase } from '../../../domain/patients/interfaces/use-cases/transfer-patient.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import { Patient, TransferPatientInput } from '../../../domain/patients/types/patient.types';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';
import { PatientNotificationService } from '../../../infrastructure/patients/services/patient-notification.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class TransferPatientUseCase
  extends BaseUseCase<TransferPatientInput, Patient>
  implements ITransferPatientUseCase
{
  protected readonly logger = new Logger(TransferPatientUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    private readonly auditService: PatientAuditService,
    private readonly notificationService: PatientNotificationService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: TransferPatientInput): Promise<Patient> {
    const patient = await this.patientRepository.findById(input.tenantId, input.patientId);

    if (!patient) {
      throw PatientErrorFactory.notFound();
    }

    const role = input.requesterRole?.toUpperCase();
    if (!['CLINIC_OWNER', 'GESTOR', 'MANAGER', 'SUPER_ADMIN'].includes(role ?? '')) {
      throw PatientErrorFactory.unauthorized();
    }

    if (
      patient.professionalId &&
      input.fromProfessionalId &&
      patient.professionalId !== input.fromProfessionalId
    ) {
      throw PatientErrorFactory.unauthorized('Paciente já vinculado a outro profissional');
    }

    const { requesterRole, ...payload } = input as any;
    const updated = await this.patientRepository.transfer(payload);

    await this.auditService.register('patient.transferred', {
      tenantId: input.tenantId,
      patientId: input.patientId,
      fromProfessionalId: patient.professionalId,
      toProfessionalId: input.toProfessionalId,
      requestedBy: input.requestedBy,
    });

    await this.notificationService.notifyTransfer({
      patientId: updated.id,
      tenantId: updated.tenantId,
      fromProfessionalId: patient.professionalId,
      toProfessionalId: updated.professionalId!,
    });

    const event = DomainEvents.patientTransferred(
      updated.id,
      {
        tenantId: updated.tenantId,
        fromProfessionalId: patient.professionalId,
        toProfessionalId: updated.professionalId,
        reason: input.reason,
      },
      { userId: input.requestedBy },
    );

    await this.messageBus.publish(event);

    return updated;
  }
}
