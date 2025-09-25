import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ITransferPatientUseCase } from '../../../domain/patients/interfaces/use-cases/transfer-patient.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import { Patient, TransferPatientInput } from '../../../domain/patients/types/patient.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';
import { PatientNotificationService } from '../../../infrastructure/patients/services/patient-notification.service';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';
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
    const patient = await this.patientRepository.findBySlug(input.tenantId, input.patientSlug);

    if (!patient) {
      throw PatientErrorFactory.notFound();
    }

    const role = mapRoleToDomain(input.requesterRole);
    const allowedRoles: RolesEnum[] = [RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN];

    if (!role || !allowedRoles.includes(role)) {
      throw PatientErrorFactory.unauthorized();
    }

    if (
      patient.professionalId &&
      input.fromProfessionalId &&
      patient.professionalId !== input.fromProfessionalId
    ) {
      throw PatientErrorFactory.unauthorized('Paciente ja vinculado a outro profissional');
    }

    const payload: TransferPatientInput = { ...input, patientId: patient.id };
    const updated = await this.patientRepository.transfer(payload);

    await this.auditService.register('patient.transferred', {
      tenantId: input.tenantId,
      patientId: patient.id,
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

