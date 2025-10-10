import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAITrainingFeedback,
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
  CancelAnamnesisInput,
  CompleteAnamnesisAIAnalysisInput,
  CreateAnamnesisAIAnalysisInput,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
  CreateTherapeuticPlanAcceptanceInput,
  CreateTherapeuticPlanAccessLogInput,
  GetStepTemplatesFilters,
  ListPlanAccessLogsFilters,
  PatientAnamnesisRollup,
  RecordAITrainingFeedbackInput,
  RemoveAnamnesisAttachmentInput,
  SaveAnamnesisStepInput,
  SavePlanFeedbackInput,
  SaveTherapeuticPlanInput,
  SubmitAnamnesisInput,
  TherapeuticPlanAcceptance,
  TherapeuticPlanAccessLog,
  TherapeuticPlanData,
  UpsertPatientAnamnesisRollupInput,
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
  listPlanAcceptances(
    tenantId: string,
    therapeuticPlanId: string,
  ): Promise<TherapeuticPlanAcceptance[]>;
  createPlanAcceptance(
    data: CreateTherapeuticPlanAcceptanceInput,
  ): Promise<TherapeuticPlanAcceptance>;
  createPlanAccessLog(data: CreateTherapeuticPlanAccessLogInput): Promise<void>;
  listPlanAccessLogs(
    tenantId: string,
    filters: ListPlanAccessLogsFilters,
  ): Promise<TherapeuticPlanAccessLog[]>;

  recordAITrainingFeedback(
    data: RecordAITrainingFeedbackInput,
  ): Promise<AnamnesisAITrainingFeedback>;
  createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment>;
  removeAttachment(data: RemoveAnamnesisAttachmentInput): Promise<void>;
  cancel(data: CancelAnamnesisInput): Promise<void>;
  getPatientRollup(tenantId: string, patientId: string): Promise<PatientAnamnesisRollup | null>;
  savePatientRollup(data: UpsertPatientAnamnesisRollupInput): Promise<PatientAnamnesisRollup>;
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
