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

export interface AnamnesisRepositorySaveOptions {
  preloadSteps?: boolean;
  preloadPlan?: boolean;
  preloadAttachments?: boolean;
}
