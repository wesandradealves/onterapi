import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListFilters,
  AnamnesisListItem,
  AnamnesisRepositorySaveOptions,
  AnamnesisStep,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
  RemoveAnamnesisAttachmentInput,
  SaveAnamnesisStepInput,
  SavePlanFeedbackInput,
  SaveTherapeuticPlanInput,
  SubmitAnamnesisInput,
  TherapeuticPlanData,
} from '../../types/anamnesis.types';

export interface IAnamnesisRepository {
  create(data: CreateAnamnesisInput): Promise<Anamnesis>;
  findById(
    tenantId: string,
    anamnesisId: string,
    options?: AnamnesisRepositorySaveOptions,
  ): Promise<Anamnesis | null>;
  findByConsultation(
    tenantId: string,
    consultationId: string,
    options?: AnamnesisRepositorySaveOptions,
  ): Promise<Anamnesis | null>;
  saveStep(data: SaveAnamnesisStepInput): Promise<AnamnesisStep>;
  listByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisListFilters,
  ): Promise<AnamnesisListItem[]>;
  submit(data: SubmitAnamnesisInput): Promise<Anamnesis>;
  saveTherapeuticPlan(data: SaveTherapeuticPlanInput): Promise<TherapeuticPlanData>;
  savePlanFeedback(data: SavePlanFeedbackInput): Promise<TherapeuticPlanData>;
  createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment>;
  removeAttachment(data: RemoveAnamnesisAttachmentInput): Promise<void>;
}

export const IAnamnesisRepositoryToken = Symbol('IAnamnesisRepository');
