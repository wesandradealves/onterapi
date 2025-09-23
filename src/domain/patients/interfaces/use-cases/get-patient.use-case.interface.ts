import { Result } from '../../../../shared/types/result.type';
import { Patient, PatientSummary, PatientTimelineEntry } from '../../types/patient.types';

export interface IGetPatientUseCase {
  execute(params: {
    tenantId: string;
    requesterId: string;
    requesterRole: string;
    patientSlug: string;
  }): Promise<
    Result<{
      patient: Patient;
      summary: PatientSummary;
      timeline: PatientTimelineEntry[];
      insights?: {
        nextSteps?: string[];
        followUps?: string[];
        risks?: string[];
      };
      quickActions: string[];
    }>
  >;
}

export const IGetPatientUseCase = Symbol('IGetPatientUseCase');
