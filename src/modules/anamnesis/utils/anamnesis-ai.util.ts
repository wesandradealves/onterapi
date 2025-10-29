import { clonePlain } from '../../../shared/utils/clone.util';
import {
  Anamnesis,
  AnamnesisAIRequestPayload,
  AnamnesisStepKey,
  LifestyleStepData,
  PatientAnamnesisRollup,
  PhysicalExamStepData,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { Patient } from '../../../domain/patients/types/patient.types';

type ProfessionalSnapshot = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  metadata?: Record<string, unknown> | null;
};

interface BuildAIRequestPayloadParams {
  anamnesis: Anamnesis;
  patient?: Patient | null;
  professional?: ProfessionalSnapshot | null;
  patientRollup?: PatientAnamnesisRollup | null;
  metadata?: Record<string, unknown>;
}

const cloneRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  try {
    return clonePlain(value) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const calculateAge = (birthDate?: Date): number | undefined => {
  if (!birthDate) {
    return undefined;
  }

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
};

const computeBmi = (heightCm?: number, weightKg?: number): number | undefined => {
  if (!heightCm || !weightKg || heightCm <= 0) {
    return undefined;
  }
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  return Number.isFinite(bmi) ? Number(bmi.toFixed(2)) : undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const pickNumericValue = (source: unknown, keys: string[]): number | undefined => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    if (key in record) {
      const parsed = toNumber(record[key]);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
};

const resolvePackYears = (
  lifestyle: LifestyleStepData | undefined,
  patientAge?: number,
): number | undefined => {
  const smoking = lifestyle?.smoking;
  if (!smoking) {
    return undefined;
  }

  if (typeof smoking.packYears === 'number' && Number.isFinite(smoking.packYears)) {
    return Number(smoking.packYears.toFixed(2));
  }

  const cigarettesPerDay = toNumber(smoking.cigarettesPerDay);
  if (!cigarettesPerDay || cigarettesPerDay <= 0) {
    return undefined;
  }

  let yearsSmoked = toNumber(smoking.yearsSmoked);
  const startAge = toNumber(smoking.startAge);
  const quitAge = toNumber(smoking.quitAge);

  if (yearsSmoked === undefined && startAge !== undefined) {
    if (smoking.status === 'former' && quitAge !== undefined) {
      yearsSmoked = quitAge - startAge;
    } else if (smoking.status === 'current' && patientAge !== undefined) {
      yearsSmoked = patientAge - startAge;
    }
  }

  if (yearsSmoked === undefined || yearsSmoked <= 0) {
    return undefined;
  }

  const packYears = (cigarettesPerDay / 20) * yearsSmoked;
  return Number.isFinite(packYears) ? Number(packYears.toFixed(2)) : undefined;
};

const extractLifestylePayload = (
  steps: Record<AnamnesisStepKey, Record<string, unknown>>,
): LifestyleStepData | undefined => {
  const payload = steps.lifestyle;
  if (!payload) {
    return undefined;
  }
  return payload as LifestyleStepData;
};

const extractPhysicalExamPayload = (
  steps: Record<AnamnesisStepKey, Record<string, unknown>>,
): PhysicalExamStepData | undefined => {
  const payload = steps.physicalExam;
  if (!payload) {
    return undefined;
  }
  return payload as PhysicalExamStepData;
};

const normaliseSteps = (
  anamnesis: Anamnesis,
): Record<AnamnesisStepKey, Record<string, unknown>> => {
  const result: Partial<Record<AnamnesisStepKey, Record<string, unknown>>> = {};

  (anamnesis.steps ?? []).forEach((step) => {
    if (!step || !step.key) {
      return;
    }

    result[step.key] = cloneRecord(step.payload);
  });

  return result as Record<AnamnesisStepKey, Record<string, unknown>>;
};

export const buildAnamnesisAIRequestPayload = (
  params: BuildAIRequestPayloadParams,
): AnamnesisAIRequestPayload => {
  const steps = normaliseSteps(params.anamnesis);
  const patient = params.patient ?? undefined;
  const professional = params.professional ?? undefined;

  const patientBirthDate = patient?.birthDate ? new Date(patient.birthDate) : undefined;
  const patientAge = calculateAge(patientBirthDate);

  const lifestylePayload = extractLifestylePayload(steps);
  const physicalExamPayload = extractPhysicalExamPayload(steps);

  const anthropometry = physicalExamPayload?.anthropometry;
  const weightKg =
    pickNumericValue(anthropometry, ['weightKg', 'weight']) ??
    pickNumericValue(patient?.medical, ['weightKg', 'weight']);
  const heightCm =
    pickNumericValue(anthropometry, ['heightCm', 'height']) ??
    pickNumericValue(patient?.medical, ['heightCm', 'height']);
  const bmiFromPayload = pickNumericValue(anthropometry, ['bmi']);
  const bmi = bmiFromPayload ?? computeBmi(heightCm, weightKg);
  const packYears = resolvePackYears(lifestylePayload, patientAge);

  const attachments = (params.anamnesis.attachments ?? []).map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    storagePath: attachment.storagePath,
    uploadedAt: attachment.uploadedAt,
    stepNumber: attachment.stepNumber,
  }));

  return {
    tenantId: params.anamnesis.tenantId,
    anamnesisId: params.anamnesis.id,
    consultationId: params.anamnesis.consultationId,
    professionalId: params.anamnesis.professionalId,
    patientId: params.anamnesis.patientId,
    status: params.anamnesis.status,
    submittedAt: params.anamnesis.submittedAt,
    steps,
    attachments,
    patientProfile: patient
      ? {
          id: patient.id,
          fullName: patient.fullName,
          birthDate: patientBirthDate,
          gender: patient.gender,
          age: patientAge,
          contact: patient.contact,
          address: patient.address,
          medical: patient.medical,
          riskLevel: patient.riskLevel,
          bmi,
          packYears,
        }
      : undefined,
    professionalProfile: professional
      ? {
          id: professional.id,
          name: professional.name,
          email: professional.email,
          role: professional.role ?? 'professional',
          preferences: professional.metadata ?? undefined,
        }
      : undefined,
    patientRollup: params.patientRollup
      ? {
          summaryText: params.patientRollup.summaryText,
          summaryVersion: params.patientRollup.summaryVersion,
          lastAnamnesisId: params.patientRollup.lastAnamnesisId ?? undefined,
          updatedAt: params.patientRollup.updatedAt,
        }
      : undefined,
    metadata: params.metadata ?? undefined,
  };
};
