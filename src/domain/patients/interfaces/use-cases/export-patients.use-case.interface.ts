import { Result } from '../../../../shared/types/result.type';
import { PatientExportRequest } from '../../types/patient.types';

export interface IExportPatientsUseCase {
  execute(request: PatientExportRequest): Promise<Result<{ fileUrl: string }>>;
  executeOrThrow(request: PatientExportRequest): Promise<{ fileUrl: string }>;
}

export const IExportPatientsUseCase = Symbol('IExportPatientsUseCase');
