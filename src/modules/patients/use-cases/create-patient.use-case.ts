import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ICreatePatientUseCase } from '../../../domain/patients/interfaces/use-cases/create-patient.use-case.interface';
import { CreatePatientInput, Patient } from '../../../domain/patients/types/patient.types';
import { PatientNotificationService } from '../../../infrastructure/patients/services/patient-notification.service';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';

@Injectable()
export class CreatePatientUseCase
  extends BaseUseCase<CreatePatientInput, Patient>
  implements ICreatePatientUseCase
{
  protected readonly logger = new Logger(CreatePatientUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    private readonly notificationService: PatientNotificationService,
    private readonly auditService: PatientAuditService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: CreatePatientInput): Promise<Patient> {
    const role = input.requesterRole?.toUpperCase();
    if (
      ![
        'CLINIC_OWNER',
        'SECRETARIA',
        'SECRETARY',
        'PROFISSIONAL',
        'PROFESSIONAL',
        'SUPER_ADMIN',
      ].includes(role ?? '')
    ) {
      throw PatientErrorFactory.unauthorized();
    }

    const cpfAlreadyUsed = await this.patientRepository.existsByCpf(input.tenantId, input.cpf);

    if (cpfAlreadyUsed) {
      throw PatientErrorFactory.duplicateCpf(input.cpf);
    }

    const patient = await this.patientRepository.create({
      ...input,
      status: input.status ?? 'new',
    });

    await this.auditService.register('patient.created', {
      patientId: patient.id,
      tenantId: patient.tenantId,
      createdBy: input.createdBy,
    });

    await this.notificationService.sendWelcomeMessage(patient.id, patient.tenantId);

    const event = DomainEvents.patientCreated(
      patient.id,
      {
        tenantId: patient.tenantId,
        professionalId: patient.professionalId,
      },
      { userId: input.createdBy },
    );

    await this.messageBus.publish(event);

    return patient;
  }
}
