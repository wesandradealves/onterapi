import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IGetPatientUseCase } from '../../../domain/patients/interfaces/use-cases/get-patient.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import {
  Patient,
  PatientSummary,
  PatientTimelineEntry,
} from '../../../domain/patients/types/patient.types';
import { PatientAISuggestionsService } from '../../../infrastructure/patients/services/patient-ai-suggestions.service';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';

interface GetPatientInput {
  tenantId: string;
  requesterId: string;
  requesterRole: string;
  patientSlug: string;
}

@Injectable()
export class GetPatientUseCase
  extends BaseUseCase<
    GetPatientInput,
    {
      patient: Patient;
      summary: PatientSummary;
      timeline: PatientTimelineEntry[];
      insights?: {
        nextSteps?: string[];
        followUps?: string[];
        risks?: string[];
      };
      quickActions: string[];
    }
  >
  implements IGetPatientUseCase
{
  protected readonly logger = new Logger(GetPatientUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    private readonly aiSuggestionsService: PatientAISuggestionsService,
    private readonly auditService: PatientAuditService,
  ) {
    super();
  }

  protected async handle(input: GetPatientInput) {
    const patient = await this.patientRepository.findBySlug(input.tenantId, input.patientSlug);

    if (!patient) {
      throw PatientErrorFactory.notFound();
    }

    this.ensurePermissions(input, patient);

    const [summary, timeline, insights] = await Promise.all([
      this.patientRepository.findSummary(input.tenantId, patient.id),
      this.patientRepository.findTimeline(input.tenantId, patient.id, {
        limit: 25,
      }),
      this.aiSuggestionsService.getInsights(patient.id, input.tenantId),
    ]);

    await this.auditService.register('patient.viewed', {
      patientId: patient.id,
      tenantId: patient.tenantId,
      viewerId: input.requesterId,
      role: input.requesterRole,
    });

    return {
      patient,
      summary,
      timeline,
      insights,
      quickActions: this.buildQuickActions(input.requesterRole, patient),
    };
  }

  private ensurePermissions(input: GetPatientInput, patient: Patient) {
    const role = input.requesterRole?.toUpperCase();

    if (role === 'SUPER_ADMIN' || role === 'CLINIC_OWNER' || role === 'GESTOR') {
      return;
    }

    if (role === 'PROFISSIONAL' || role === 'PROFESSIONAL') {
      if (patient.professionalId && patient.professionalId !== input.requesterId) {
        throw PatientErrorFactory.unauthorized();
      }
      return;
    }

    if (role === 'SECRETARIA' || role === 'SECRETARY') {
      return;
    }

    throw PatientErrorFactory.unauthorized();
  }

  private buildQuickActions(role: string, patient: Patient): string[] {
    const actions: string[] = [];
    const normalizedRole = role?.toUpperCase();

    if (normalizedRole === 'PROFESSIONAL' || normalizedRole === 'PROFISSIONAL') {
      actions.push('create_appointment', 'add_note', 'open_anamnesis');
    }

    if (normalizedRole === 'CLINIC_OWNER' || normalizedRole === 'GESTOR') {
      actions.push('transfer_patient', 'view_financials');
    }

    if (normalizedRole === 'SECRETARIA' || normalizedRole === 'SECRETARY') {
      actions.push('schedule_follow_up', 'send_message');
    }

    if (!patient.emailVerified) {
      actions.push('resend_verification');
    }

    return Array.from(new Set(actions));
  }
}
