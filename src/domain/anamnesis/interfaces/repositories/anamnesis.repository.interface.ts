import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAttachment,
  AnamnesisHistoryEntry,
  AnamnesisHistoryFilters,
  AnamnesisListFilters,
  AnamnesisListItem,
  AnamnesisRepositoryFindOptions,
  AnamnesisStep,
  AnamnesisStepKey,
  AnamnesisStepTemplate,
  AutoSaveAnamnesisStepInput,
  CompleteAnamnesisAIAnalysisInput,
  CreateAnamnesisAIAnalysisInput,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
  GetStepTemplatesFilters,
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
    options?: AnamnesisRepositoryFindOptions,
  ): Promise<Anamnesis | null>;
  findByConsultation(
    tenantId: string,
    consultationId: string,
    options?: AnamnesisRepositoryFindOptions,
  ): Promise<Anamnesis | null>;
  saveStep(data: SaveAnamnesisStepInput): Promise<AnamnesisStep>;
  autoSaveStep(data: AutoSaveAnamnesisStepInput): Promise<AnamnesisStep>;
  listByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisListFilters,
  ): Promise<AnamnesisListItem[]>;
  getHistoryByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisHistoryFilters,
  ): Promise<AnamnesisHistoryEntry[]>;
  submit(data: SubmitAnamnesisInput): Promise<Anamnesis>;
  saveTherapeuticPlan(data: SaveTherapeuticPlanInput): Promise<TherapeuticPlanData>;
  savePlanFeedback(data: SavePlanFeedbackInput): Promise<TherapeuticPlanData>;
  createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment>;
  removeAttachment(data: RemoveAnamnesisAttachmentInput): Promise<void>;
  getStepTemplates(filters?: GetStepTemplatesFilters): Promise<AnamnesisStepTemplate[]>;
  getStepTemplateByKey(
    key: AnamnesisStepKey,
    filters?: GetStepTemplatesFilters,
  ): Promise<AnamnesisStepTemplate | null>;
  createAIAnalysis(data: CreateAnamnesisAIAnalysisInput): Promise<AnamnesisAIAnalysis>;
  completeAIAnalysis(data: CompleteAnamnesisAIAnalysisInput): Promise<AnamnesisAIAnalysis>;
  getLatestAIAnalysis(tenantId: string, anamnesisId: string): Promise<AnamnesisAIAnalysis | null>;
}

export const IAnamnesisRepositoryToken = Symbol('IAnamnesisRepository');
