import {
  ArchivePatientInput,
  CreatePatientInput,
  PatientAddress,
  PatientContact,
  PatientContinuousMedication,
  PatientExportRequest,
  PatientListFilters,
  PatientMedicalInfo,
  PatientRiskLevel,
  PatientStatus,
  TransferPatientInput,
  UpdatePatientInput,
} from '../../../../domain/patients/types/patient.types';
import { CreatePatientSchema } from '../schemas/create-patient.schema';
import { UpdatePatientSchema } from '../schemas/update-patient.schema';
import { TransferPatientSchema } from '../schemas/transfer-patient.schema';
import { ArchivePatientSchema } from '../schemas/archive-patient.schema';
import { ExportPatientsSchema } from '../schemas/export-patients.schema';
import { ListPatientsSchema } from '../schemas/list-patients.schema';

export interface PatientRequestContext {
  tenantId: string;
  userId: string;
  role: string;
}

interface ContactPayload {
  email?: string;
  phone?: string;
  whatsapp?: string;
}

interface AddressPayload {
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface ContinuousMedicationPayload {
  name?: string;
  dosage?: string;
  frequency?: string;
  condition?: string;
}

interface MedicalPayload {
  allergies?: string[];
  chronicConditions?: string[];
  preExistingConditions?: string[];
  medications?: string[];
  continuousMedications?: ContinuousMedicationPayload[];
  heightCm?: number;
  weightKg?: number;
  observations?: string;
}

const hasValue = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && value !== '';
};

const hasMedicalData = (payload: MedicalPayload): boolean => {
  return (
    hasValue(payload.allergies) ||
    hasValue(payload.chronicConditions) ||
    hasValue(payload.preExistingConditions) ||
    hasValue(payload.medications) ||
    hasValue(payload.continuousMedications) ||
    hasValue(payload.heightCm) ||
    hasValue(payload.weightKg) ||
    hasValue(payload.observations)
  );
};

const mapContact = (payload: ContactPayload): PatientContact => ({
  email: payload.email,
  phone: payload.phone,
  whatsapp: payload.whatsapp,
});

const mapAddress = (payload: AddressPayload): PatientAddress | undefined => {
  if (!payload.zipCode) {
    return undefined;
  }

  return {
    zipCode: payload.zipCode,
    street: payload.street ?? '',
    number: payload.number,
    complement: payload.complement,
    district: payload.district,
    city: payload.city ?? '',
    state: payload.state ?? '',
    country: payload.country,
  };
};

const mapContinuousMedications = (
  payload?: ContinuousMedicationPayload[],
): PatientContinuousMedication[] | undefined => {
  if (!payload || !payload.length) {
    return undefined;
  }

  const sanitized: PatientContinuousMedication[] = [];

  for (const item of payload) {
    if (!item?.name) {
      continue;
    }

    const name = item.name.trim();

    if (!name) {
      continue;
    }

    const entry: PatientContinuousMedication = { name };

    if (item.dosage?.trim()) {
      entry.dosage = item.dosage.trim();
    }

    if (item.frequency?.trim()) {
      entry.frequency = item.frequency.trim();
    }

    if (item.condition?.trim()) {
      entry.condition = item.condition.trim();
    }

    sanitized.push(entry);
  }

  return sanitized.length ? sanitized : undefined;
};

const mapMedical = (payload: MedicalPayload): PatientMedicalInfo | undefined => {
  if (!hasMedicalData(payload)) {
    return undefined;
  }

  const medical: PatientMedicalInfo = {};

  if (payload.allergies) {
    medical.allergies = payload.allergies;
  }
  if (payload.chronicConditions) {
    medical.chronicConditions = payload.chronicConditions;
  }
  if (payload.preExistingConditions) {
    medical.preExistingConditions = payload.preExistingConditions;
  }
  if (payload.medications) {
    medical.medications = payload.medications;
  }
  const continuousMedications = mapContinuousMedications(payload.continuousMedications);

  if (continuousMedications) {
    medical.continuousMedications = continuousMedications;
  }
  if (hasValue(payload.heightCm)) {
    medical.heightCm = payload.heightCm;
  }
  if (hasValue(payload.weightKg)) {
    medical.weightKg = payload.weightKg;
  }
  if (payload.observations) {
    medical.observations = payload.observations;
  }

  return Object.keys(medical).length ? medical : undefined;
};

export const toCreatePatientInput = (
  schema: CreatePatientSchema,
  context: PatientRequestContext,
): CreatePatientInput => {
  return {
    tenantId: context.tenantId,
    createdBy: context.userId,
    requesterRole: context.role,
    professionalId: schema.professionalId,
    fullName: schema.fullName,
    cpf: schema.cpf,
    birthDate: schema.birthDate ? new Date(schema.birthDate) : undefined,
    gender: schema.gender,
    maritalStatus: schema.maritalStatus,
    contact: mapContact(schema),
    address: mapAddress(schema),
    medical: mapMedical(schema),
    tags: schema.tags,
    status: schema.status as PatientStatus | undefined,
    acceptedTerms: schema.acceptedTerms,
    acceptedTermsAt: schema.acceptedTermsAt ? new Date(schema.acceptedTermsAt) : undefined,
  };
};

export const toUpdatePatientInput = (
  patientSlug: string,
  schema: UpdatePatientSchema,
  context: PatientRequestContext,
): UpdatePatientInput => {
  return {
    patientSlug,
    tenantId: context.tenantId,
    updatedBy: context.userId,
    requesterRole: context.role,
    fullName: schema.fullName,
    shortName: schema.shortName,
    status: schema.status as PatientStatus | undefined,
    contact: mapContact(schema),
    address: mapAddress(schema),
    medical: mapMedical(schema),
    tags: schema.tags,
    riskLevel: schema.riskLevel as PatientRiskLevel | undefined,
    professionalId: schema.professionalId ?? undefined,
    acceptedTerms: schema.acceptedTerms,
    acceptedTermsAt: schema.acceptedTermsAt ? new Date(schema.acceptedTermsAt) : undefined,
  };
};

export const toTransferPatientInput = (
  patientSlug: string,
  schema: TransferPatientSchema,
  context: PatientRequestContext,
): TransferPatientInput => {
  return {
    patientSlug,
    tenantId: context.tenantId,
    requestedBy: context.userId,
    requesterRole: context.role,
    toProfessionalId: schema.toProfessionalId,
    reason: schema.reason,
    effectiveAt: schema.effectiveAt ? new Date(schema.effectiveAt) : undefined,
  };
};

export const toArchivePatientInput = (
  patientSlug: string,
  schema: ArchivePatientSchema,
  context: PatientRequestContext,
): ArchivePatientInput => {
  return {
    patientSlug,
    tenantId: context.tenantId,
    requestedBy: context.userId,
    requesterRole: context.role,
    reason: schema.reason,
    archiveRelatedData: schema.archiveRelatedData,
  };
};

export const toExportPatientRequest = (
  schema: ExportPatientsSchema,
  context: PatientRequestContext,
): PatientExportRequest => {
  const filters: PatientListFilters = {
    assignedProfessionalIds: schema.professionalIds,
    status: schema.status as PatientStatus[] | undefined,
    quickFilter: schema.quickFilter as PatientListFilters['quickFilter'],
  };

  return {
    tenantId: context.tenantId,
    requestedBy: context.userId,
    requesterRole: context.role,
    format: schema.format,
    includeMedicalData: schema.includeMedicalData,
    filters,
  };
};

export const toPatientListFilters = (schema: ListPatientsSchema): PatientListFilters => {
  return {
    query: schema.query,
    status: schema.status as PatientStatus[] | undefined,
    riskLevel: schema.riskLevel as PatientRiskLevel[] | undefined,
    assignedProfessionalIds: schema.professionalIds,
    tags: schema.tags,
    quickFilter: schema.quickFilter as PatientListFilters['quickFilter'],
  };
};

export const __patientRequestMapperInternals = {
  mapContinuousMedications,
};
