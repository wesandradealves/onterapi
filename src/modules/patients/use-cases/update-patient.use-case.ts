import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IUpdatePatientUseCase } from '../../../domain/patients/interfaces/use-cases/update-patient.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import { Patient, UpdatePatientInput } from '../../../domain/patients/types/patient.types';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class UpdatePatientUseCase
  extends BaseUseCase<UpdatePatientInput, Patient>
  implements IUpdatePatientUseCase
{
  protected readonly logger = new Logger(UpdatePatientUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    private readonly auditService: PatientAuditService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: UpdatePatientInput): Promise<Patient> {
    const existing = await this.patientRepository.findBySlug(input.tenantId, input.patientSlug);

    if (!existing) {
      throw PatientErrorFactory.notFound();
    }

    this.ensurePermissions(input, existing);

    const payload = { ...input, patientId: existing.id };
    const updated = await this.patientRepository.update(payload);

    await this.auditService.register('patient.updated', {
      patientId: updated.id,
      tenantId: updated.tenantId,
      updatedBy: input.updatedBy,
    });

    const event = DomainEvents.patientUpdated(updated.id, this.extractChanges(existing, updated), {
      userId: input.updatedBy,
    });

    await this.messageBus.publish(event);

    return updated;
  }

  private ensurePermissions(input: UpdatePatientInput, patient: Patient) {
    const role = input.requesterRole?.toUpperCase();

    if (role === 'CLINIC_OWNER' || role === 'SUPER_ADMIN') {
      return;
    }

    if (role === 'PROFISSIONAL' || role === 'PROFESSIONAL') {
      if (patient.professionalId && patient.professionalId !== input.updatedBy) {
        throw PatientErrorFactory.unauthorized();
      }
      return;
    }

    if (role === 'SECRETARIA' || role === 'SECRETARY') {
      if (input.medical || input.riskLevel) {
        throw PatientErrorFactory.unauthorized('Secretária não pode editar dados clínicos');
      }
      return;
    }

    if (role === 'GESTOR' || role === 'MANAGER') {
      if (input.medical) {
        throw PatientErrorFactory.unauthorized('Gestor não pode editar dados clínicos');
      }
      return;
    }

    throw PatientErrorFactory.unauthorized();
  }

  private extractChanges(previous: Patient, updated: Patient) {
    const diff: Record<string, unknown> = {};
    if (previous.fullName !== updated.fullName) {
      diff.fullName = updated.fullName;
    }
    if (previous.status !== updated.status) {
      diff.status = updated.status;
    }
    if (previous.professionalId !== updated.professionalId) {
      diff.professionalId = updated.professionalId;
    }
    if (previous.riskLevel !== updated.riskLevel) {
      diff.riskLevel = updated.riskLevel;
    }
    if (previous.tags?.length !== updated.tags?.length) {
      diff.tags = updated.tags;
    }
    return diff;
  }
}

