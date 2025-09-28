import {
  PatientAddress,
  PatientContact,
  PatientMedicalInfo,
  PatientRiskLevel,
} from '../../patients/types/patient.types';

export type AnamnesisStatus = 'draft' | 'submitted' | 'completed' | 'cancelled';

export type AnamnesisStepKey =
  | 'identification'
  | 'chiefComplaint'
  | 'currentDisease'
  | 'pathologicalHistory'
  | 'familyHistory'
  | 'systemsReview'
  | 'lifestyle'
  | 'psychosocial'
  | 'medication'
  | 'physicalExam';

export interface IdentificationStepData {
  personalInfo: {
    fullName: string;
    birthDate: Date | string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    maritalStatus?: string;
    profession?: string;
    city?: string;
    state?: string;
  };
  contactInfo?: {
    phone?: string;
    convenio?: string;
  };
  demographics?: {
    raceEthnicity?: string;
  };
}

export interface ChiefComplaintStepData {
  complaint: {
    history: string;
    startDate?: Date | string;
    duration?: string;
    relatedFactors?: string[];
    otherFactors?: string;
  };
  attachments?: {
    exams?: string[];
  };
}

export interface TreatmentHistoryItem {
  id: string;
  type: 'medication' | 'therapy' | 'surgery' | 'alternative';
  name: string;
  result?: 'improved' | 'worsened' | 'no_change';
  date?: Date | string;
  duration?: string;
  notes?: string;
}

export interface ExamHistoryItem {
  id: string;
  name: string;
  date?: Date | string;
  resultSummary?: string;
  attachments?: string[];
}

export interface CurrentDiseaseStepData {
  evolution: {
    description: string;
    intensity?: 1 | 2 | 3 | 4 | 5;
    frequency?: 'constant' | 'intermittent' | 'occasional';
    triggers?: string[];
    reliefFactors?: string[];
  };
  previousTreatments?: TreatmentHistoryItem[];
  examsPerformed?: ExamHistoryItem[];
}

export interface SurgeryHistoryItem {
  id: string;
  description: string;
  date?: Date | string;
  notes?: string;
}

export interface HospitalizationHistoryItem {
  id: string;
  reason: string;
  startDate?: Date | string;
  endDate?: Date | string;
  notes?: string;
}

export interface AllergyHistoryItem {
  id: string;
  allergen: string;
  reaction: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface PathologicalHistoryStepData {
  previousDiseases?: string[];
  otherDiseases?: string;
  surgeries?: SurgeryHistoryItem[];
  hospitalizations?: HospitalizationHistoryItem[];
  allergiesReactions?: AllergyHistoryItem[];
}

export interface FamilyDiseaseRecord {
  id: string;
  relationship: 'father' | 'mother' | 'sibling' | 'grandparent' | 'child' | 'other';
  disease: string;
  ageAtDiagnosis?: number;
  currentAge?: number;
  deceased?: boolean;
}

export interface FamilyHistoryStepData {
  familyDiseases?: FamilyDiseaseRecord[];
  hereditaryDiseases?: string[];
  otherHereditary?: string;
  familyObservations?: string;
}

export interface SystemSymptomsData {
  hasSymptoms: boolean;
  symptoms?: string[];
  otherSymptoms?: string;
  noChanges?: boolean;
}

export interface SystemsReviewStepData {
  cardiovascular?: SystemSymptomsData;
  respiratory?: SystemSymptomsData;
  gastrointestinal?: SystemSymptomsData;
  genitourinary?: SystemSymptomsData;
  neurological?: SystemSymptomsData;
  endocrine?: SystemSymptomsData;
  musculoskeletal?: SystemSymptomsData;
  integumentary?: SystemSymptomsData;
  otherObservations?: string;
}

export interface SmokingHistoryData {
  status: 'never' | 'former' | 'current';
  startAge?: number;
  quitAge?: number;
  cigarettesPerDay?: number;
  yearsSmoked?: number;
  packYears?: number;
  notes?: string;
}

export interface AlcoholConsumptionData {
  frequency: 'never' | 'social' | 'weekly' | 'daily';
  quantity?: string;
  bingeEpisodes?: boolean;
  notes?: string;
}

export interface DrugUseData {
  usesDrugs: boolean;
  substances?: string[];
  frequency?: string;
  lastUse?: Date | string;
  notes?: string;
}

export interface PhysicalActivityData {
  level: 'sedentary' | 'light' | 'moderate' | 'intense';
  type?: string;
  frequency?: number;
  duration?: number;
  limitations?: string;
}

export interface NutritionHabitsData {
  mealsPerDay?: number;
  waterIntakeLiters?: number;
  dietaryRestrictions?: string[];
  observations?: string;
}

export interface SleepPatternData {
  hoursPerNight?: number;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  disturbances?: string[];
  usesSleepMedication?: boolean;
  notes?: string;
}

export interface LifestyleStepData {
  smoking?: SmokingHistoryData;
  alcohol?: AlcoholConsumptionData;
  drugs?: DrugUseData;
  physicalActivity?: PhysicalActivityData;
  nutrition?: NutritionHabitsData;
  sleep?: SleepPatternData;
}

export interface SupportNetworkData {
  livesWith?: string;
  hasSupportNetwork?: boolean;
  primarySupport?: string;
  observations?: string;
}

export interface WorkSituationData {
  employmentStatus?: 'employed' | 'self_employed' | 'student' | 'unemployed' | 'retired';
  occupation?: string;
  workingHours?: string;
  workStressLevel?: number;
  observations?: string;
}

export interface PsychosocialStepData {
  emotional: {
    currentMood: 'excellent' | 'good' | 'fair' | 'poor';
    stressLevel?: number;
    symptoms?: string[];
    support?: SupportNetworkData;
  };
  work?: WorkSituationData;
  goals?: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  indication?: string;
  startDate?: Date | string;
  prescribedBy?: string;
}

export interface PhytotherapyItem {
  id: string;
  name: string;
  purpose?: string;
  frequency?: string;
}

export interface SupplementItem {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface AdverseReactionItem {
  id: string;
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  occurredAt?: Date | string;
}

export interface MedicationStepData {
  currentMedications?: MedicationItem[];
  phytotherapy?: PhytotherapyItem[];
  supplements?: SupplementItem[];
  adverseReactions?: AdverseReactionItem[];
  adherence?: 'always' | 'mostly' | 'sometimes' | 'rarely' | 'never';
}

export interface AnthropometryData {
  height: number;
  weight: number;
  bmi?: number;
  bmiCategory?: string;
}

export interface VitalSignsData {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

export interface GeneralExamFinding {
  id: string;
  description: string;
  relevant?: boolean;
}

export interface PhysicalExamStepData {
  anthropometry?: AnthropometryData;
  vitalSigns?: VitalSignsData;
  generalExam?: GeneralExamFinding[];
  observations?: string;
}

export interface AnamnesisFormData {
  identification?: IdentificationStepData;
  chiefComplaint?: ChiefComplaintStepData;
  currentDisease?: CurrentDiseaseStepData;
  pathologicalHistory?: PathologicalHistoryStepData;
  familyHistory?: FamilyHistoryStepData;
  systemsReview?: SystemsReviewStepData;
  lifestyle?: LifestyleStepData;
  psychosocial?: PsychosocialStepData;
  medication?: MedicationStepData;
  physicalExam?: PhysicalExamStepData;
}

export interface AnamnesisStep {
  id: string;
  anamnesisId: string;
  stepNumber: number;
  key: AnamnesisStepKey;
  payload: Record<string, unknown> | AnamnesisFormData[keyof AnamnesisFormData];
  completed: boolean;
  hasErrors: boolean;
  validationScore?: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface TherapeuticPlanRecommendation {
  id: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TherapeuticPlanRiskFactor {
  id: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface TherapeuticPlanData {
  id: string;
  anamnesisId: string;
  clinicalReasoning?: string;
  summary?: string;
  therapeuticPlan?: Record<string, unknown>;
  riskFactors?: TherapeuticPlanRiskFactor[];
  recommendations?: TherapeuticPlanRecommendation[];
  confidence?: number;
  reviewRequired?: boolean;
  approvalStatus: 'pending' | 'approved' | 'modified' | 'rejected';
  liked?: boolean;
  feedbackComment?: string;
  feedbackGivenBy?: string;
  feedbackGivenAt?: Date;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnamnesisAttachment {
  id: string;
  anamnesisId: string;
  stepNumber?: number;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export type AnamnesisStepTemplateSpecialty =
  | 'default'
  | 'general'
  | 'physiotherapy'
  | 'nutrition'
  | 'psychology'
  | 'other';

export interface AnamnesisAIRequestPatientProfile {
  id: string;
  fullName: string;
  birthDate?: Date;
  gender?: string;
  age?: number;
  contact?: PatientContact;
  address?: PatientAddress;
  medical?: PatientMedicalInfo;
  riskLevel?: PatientRiskLevel;
  bmi?: number;
  packYears?: number;
}

export interface AnamnesisAIRequestProfessionalProfile {
  id: string;
  name: string;
  email?: string;
  role: string;
  preferences?: Record<string, unknown>;
}

export interface AnamnesisAIRequestPayload {
  tenantId: string;
  anamnesisId: string;
  consultationId: string;
  professionalId: string;
  patientId: string;
  status: AnamnesisStatus;
  submittedAt?: Date;
  steps: Record<AnamnesisStepKey, Record<string, unknown>>;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    uploadedAt: Date;
    stepNumber?: number;
  }>;
  patientProfile?: AnamnesisAIRequestPatientProfile;
  professionalProfile?: AnamnesisAIRequestProfessionalProfile;
  metadata?: Record<string, unknown>;
}

export interface AnamnesisStepTemplate {
  id: string;
  key: AnamnesisStepKey;
  title: string;
  description?: string;
  version: number;
  schema: Record<string, unknown>;
  specialty?: AnamnesisStepTemplateSpecialty | string;
  tenantId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AnamnesisAIAnalysisStatus = 'pending' | 'completed' | 'failed';

export interface AnamnesisAIAnalysis {
  id: string;
  anamnesisId: string;
  tenantId: string;
  status: AnamnesisAIAnalysisStatus;
  payload?: Record<string, unknown>;
  clinicalReasoning?: string;
  summary?: string;
  riskFactors?: TherapeuticPlanRiskFactor[];
  recommendations?: TherapeuticPlanRecommendation[];
  confidence?: number;
  generatedAt?: Date;
  respondedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface Anamnesis {
  id: string;
  consultationId: string;
  patientId: string;
  professionalId: string;
  tenantId: string;
  status: AnamnesisStatus;
  totalSteps: number;
  currentStep: number;
  completionRate: number;
  isDraft: boolean;
  lastAutoSavedAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  steps?: AnamnesisStep[];
  latestPlan?: TherapeuticPlanData | null;
  attachments?: AnamnesisAttachment[];
  aiAnalyses?: AnamnesisAIAnalysis[];
}

export interface CreateAnamnesisInput {
  consultationId: string;
  patientId: string;
  professionalId: string;
  tenantId: string;
  totalSteps: number;
  initialStep?: number;
  formData?: Partial<AnamnesisFormData>;
}

export interface SaveAnamnesisStepInput {
  anamnesisId: string;
  tenantId: string;
  stepNumber: number;
  key: AnamnesisStepKey;
  payload: Record<string, unknown>;
  completed?: boolean;
  hasErrors?: boolean;
  validationScore?: number;
  updatedBy: string;
  currentStep?: number;
  completionRate?: number;
}

export interface AutoSaveAnamnesisStepInput {
  anamnesisId: string;
  tenantId: string;
  stepNumber: number;
  key: AnamnesisStepKey;
  payload: Record<string, unknown>;
  hasErrors?: boolean;
  validationScore?: number;
  autoSavedAt?: Date;
}

export interface SubmitAnamnesisInput {
  anamnesisId: string;
  tenantId: string;
  submittedBy: string;
  submissionDate: Date;
  completionRate: number;
}

export interface SaveTherapeuticPlanInput {
  anamnesisId: string;
  tenantId: string;
  clinicalReasoning?: string;
  summary?: string;
  therapeuticPlan?: Record<string, unknown>;
  riskFactors?: TherapeuticPlanRiskFactor[];
  recommendations?: TherapeuticPlanRecommendation[];
  confidence?: number;
  reviewRequired?: boolean;
  generatedAt: Date;
}

export interface SavePlanFeedbackInput {
  anamnesisId: string;
  tenantId: string;
  approvalStatus: 'approved' | 'modified' | 'rejected';
  liked?: boolean;
  feedbackComment?: string;
  feedbackGivenBy: string;
  feedbackGivenAt: Date;
}

export interface CreateAnamnesisAttachmentInput {
  anamnesisId: string;
  tenantId: string;
  stepNumber?: number;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy: string;
}

export interface RemoveAnamnesisAttachmentInput {
  anamnesisId: string;
  tenantId: string;
  attachmentId: string;
}

export interface GetStepTemplatesFilters {
  tenantId?: string;
  specialty?: AnamnesisStepTemplateSpecialty | string;
  includeInactive?: boolean;
}

export interface CreateAnamnesisAIAnalysisInput {
  anamnesisId: string;
  tenantId: string;
  payload?: Record<string, unknown>;
  status?: AnamnesisAIAnalysisStatus;
}

export interface CompleteAnamnesisAIAnalysisInput {
  analysisId: string;
  tenantId: string;
  clinicalReasoning?: string;
  summary?: string;
  riskFactors?: TherapeuticPlanRiskFactor[];
  recommendations?: TherapeuticPlanRecommendation[];
  confidence?: number;
  payload?: Record<string, unknown>;
  respondedAt: Date;
  status?: Extract<AnamnesisAIAnalysisStatus, 'completed' | 'failed'>;
  errorMessage?: string;
}

export interface ReceiveAnamnesisAIResultInput {
  tenantId: string;
  anamnesisId: string;
  analysisId: string;
  status: Extract<AnamnesisAIAnalysisStatus, 'completed' | 'failed'>;
  clinicalReasoning?: string;
  summary?: string;
  riskFactors?: TherapeuticPlanRiskFactor[];
  recommendations?: TherapeuticPlanRecommendation[];
  confidence?: number;
  therapeuticPlan?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  respondedAt: Date;
  errorMessage?: string;
}

export interface AnamnesisListFilters {
  status?: AnamnesisStatus[];
  patientId?: string;
  professionalId?: string;
  from?: Date;
  to?: Date;
}

export interface AnamnesisListItem {
  id: string;
  consultationId: string;
  patientId: string;
  professionalId: string;
  status: AnamnesisStatus;
  completionRate: number;
  submittedAt?: Date;
  updatedAt: Date;
}

export interface AnamnesisRepositoryFindOptions {
  steps?: boolean;
  latestPlan?: boolean;
  attachments?: boolean;
  aiAnalyses?: boolean;
}

export interface AnamnesisHistoryStep {
  stepNumber: number;
  key: AnamnesisStepKey;
  completed: boolean;
  hasErrors: boolean;
  validationScore?: number;
  updatedAt: Date;
  payload: Record<string, unknown>;
}

export interface AnamnesisHistoryEntry {
  id: string;
  consultationId: string;
  professionalId: string;
  status: AnamnesisStatus;
  completionRate: number;
  submittedAt?: Date;
  updatedAt: Date;
  steps: AnamnesisHistoryStep[];
  attachments: AnamnesisAttachment[];
  latestPlan?: TherapeuticPlanData | null;
}

export interface AnamnesisHistoryData {
  patientId: string;
  entries: AnamnesisHistoryEntry[];
  prefill: {
    steps: Partial<Record<AnamnesisStepKey, Record<string, unknown>>>;
    attachments: AnamnesisAttachment[];
    sourceAnamnesisId?: string;
    updatedAt?: Date;
  };
}

export interface AnamnesisHistoryFilters {
  limit?: number;
  statuses?: AnamnesisStatus[];
  professionalId?: string;
  includeDrafts?: boolean;
}
