import { Result } from '../../../../shared/types/result.type';
import { Anamnesis, AnamnesisFormData } from '../../../anamnesis/types/anamnesis.types';

export interface IStartAnamnesisUseCase {
  execute(params: {
    tenantId: string;
    consultationId: string;
    patientId: string;
    professionalId: string;
    totalSteps: number;
    initialStep?: number;
    formData?: Partial<AnamnesisFormData>;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<Anamnesis>>;
  executeOrThrow(params: {
    tenantId: string;
    consultationId: string;
    patientId: string;
    professionalId: string;
    totalSteps: number;
    initialStep?: number;
    formData?: Partial<AnamnesisFormData>;
    requesterId: string;
    requesterRole: string;
  }): Promise<Anamnesis>;
}

export const IStartAnamnesisUseCase = Symbol('IStartAnamnesisUseCase');
