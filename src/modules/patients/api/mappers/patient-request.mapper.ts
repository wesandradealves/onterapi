import {
  ArchivePatientInput,
  CreatePatientInput,
  PatientAddress,
  PatientContact,
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

interface MedicalPayload {
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  observations?: string;
}

const hasMedicalData = (payload: MedicalPayload): boolean => {
  return Boolean(
    (payload.allergies && payload.allergies.length) ||
      (payload.chronicConditions && payload.chronicConditions.length) ||
      (payload.medications && payload.medications.length) ||
      payload.observations,
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

const mapMedical = (payload: MedicalPayload): PatientMedicalInfo | undefined => {
  if (!hasMedicalData(payload)) {
    return undefined;
  }

  return {
    allergies: payload.allergies,
    chronicConditions: payload.chronicConditions,
    medications: payload.medications,
    observations: payload.observations,
  };
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
