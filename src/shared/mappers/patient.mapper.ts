import {
  Patient,
  PatientContinuousMedication,
  PatientListItem,
  PatientTag,
} from '../../domain/patients/types/patient.types';

type NullableRecord = Record<string, unknown> | null | undefined;

function defaultContact(): Patient['contact'] {
  return { email: undefined, phone: undefined, whatsapp: undefined };
}

const extractString = (input: unknown): string | undefined => {
  if (typeof input === 'string' && input.trim().length > 0) {
    return input.trim();
  }
  return undefined;
};

const extractNumber = (input: unknown): number | undefined => {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = Number(input);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const extractBoolean = (input: unknown): boolean | undefined => {
  if (typeof input === 'boolean') {
    return input;
  }
  if (typeof input === 'string') {
    if (['true', '1', 'yes'].includes(input.toLowerCase())) {
      return true;
    }
    if (['false', '0', 'no'].includes(input.toLowerCase())) {
      return false;
    }
  }
  return undefined;
};

const extractStringArray = (input: unknown): string[] | undefined => {
  if (Array.isArray(input)) {
    const values = input
      .map((item) => (typeof item === 'string' ? item.trim() : undefined))
      .filter((item): item is string => Boolean(item));
    return values.length ? values : undefined;
  }
  return undefined;
};

const extractContinuousMedications = (
  input: unknown,
): PatientContinuousMedication[] | undefined => {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const sanitized: PatientContinuousMedication[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const payload = item as Record<string, unknown>;
    const name = extractString(payload.name);
    if (!name) {
      continue;
    }

    const entry: PatientContinuousMedication = { name };
    entry.dosage = extractString(payload.dosage);
    entry.frequency = extractString(payload.frequency);
    entry.condition = extractString(payload.condition);

    sanitized.push(entry);
  }

  return sanitized.length ? sanitized : undefined;
};

const extractDate = (input: unknown): Date | undefined => {
  if (!input) {
    return undefined;
  }
  if (input instanceof Date) {
    return input;
  }
  if (typeof input === 'string') {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  return undefined;
};

const mergeMedicalHistory = (medicalHistory: NullableRecord) => {
  const history = (medicalHistory as Record<string, unknown>) || {};
  return {
    fullName: extractString(history.fullName),
    cpf: extractString(history.cpf),
    shortName: extractString(history.shortName),
    maritalStatus: extractString(history.maritalStatus),
    status: extractString(history.status),
    tags: extractStringArray(history.tags),
    chronicConditions: extractStringArray(history.chronicConditions),
    preExistingConditions: extractStringArray(history.preExistingConditions),
    observations: extractString(history.observations),
    address: history.address as Patient['address'] | undefined,
    continuousMedications: extractContinuousMedications(history.continuousMedications),
    heightCm: extractNumber(history.heightCm),
    weightKg: extractNumber(history.weightKg),
    bloodType: extractString(history.bloodType),
    lifestyle: extractString(history.lifestyle),
    acceptedTerms: extractBoolean(history.acceptedTerms),
    acceptedTermsAt: extractDate(history.acceptedTermsAt),
  };
};

const mergeEmergencyContact = (emergency: NullableRecord) => {
  const contact = defaultContact();
  if (!emergency || typeof emergency !== 'object') {
    return contact;
  }
  return {
    email: extractString((emergency as Record<string, unknown>).email),
    phone: extractString((emergency as Record<string, unknown>).phone),
    whatsapp: extractString((emergency as Record<string, unknown>).whatsapp),
  };
};

const mapTags = (tags: string[] | undefined): PatientTag[] | undefined => {
  if (!tags || !tags.length) {
    return undefined;
  }
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => ({ id: tag, label: tag }));
};

export type SupabasePatientRecord = {
  id: string;
  slug?: string | null;
  clinic_id: string;
  user_id?: string | null;
  professional_id?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  emergency_contact?: Record<string, unknown> | null;
  medical_history?: Record<string, unknown> | null;
  allergies?: string[] | null;
  current_medications?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const PatientMapper = {
  toDomain(record: SupabasePatientRecord): Patient {
    const medical = mergeMedicalHistory(record.medical_history);
    const emergency = mergeEmergencyContact(record.emergency_contact);

    const allergies =
      extractStringArray(record.allergies) ?? extractStringArray(medical.chronicConditions);
    const medications = extractStringArray(record.current_medications);

    const fullName = medical.fullName ?? 'Paciente sem nome definido';
    const shortName = medical.shortName ?? fullName.split(' ')[0];

    return {
      id: record.id,
      slug: record.slug ?? record.id,
      tenantId: record.clinic_id,
      professionalId: record.professional_id ?? undefined,
      fullName,
      shortName,
      cpf: medical.cpf ?? '',
      birthDate: record.birth_date ? new Date(record.birth_date) : undefined,
      gender: extractString(record.gender),
      maritalStatus: medical.maritalStatus,
      status: (medical.status as Patient['status']) ?? 'active',
      emailVerified: false,
      preferredLanguage: undefined,
      contact: emergency,
      address: medical.address,
      medical: {
        allergies: allergies ?? [],
        chronicConditions: medical.chronicConditions ?? [],
        preExistingConditions: medical.preExistingConditions ?? [],
        medications: medications ?? [],
        continuousMedications: medical.continuousMedications,
        heightCm: medical.heightCm,
        weightKg: medical.weightKg,
        observations: medical.observations,
        bloodType: medical.bloodType,
        lifestyle: medical.lifestyle,
      },
      tags: mapTags(medical.tags) ?? [],
      riskLevel: undefined,
      lastAppointmentAt: undefined,
      nextAppointmentAt: undefined,
      acceptedTerms: medical.acceptedTerms ?? false,
      acceptedTermsAt: medical.acceptedTermsAt,
      createdAt: record.created_at ? new Date(record.created_at) : new Date(),
      updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
      archivedAt: undefined,
    };
  },

  toListItem(record: SupabasePatientRecord): PatientListItem {
    const medical = mergeMedicalHistory(record.medical_history);
    const contact = mergeEmergencyContact(record.emergency_contact);
    const fullName = medical.fullName ?? 'Paciente sem nome definido';
    const allergies =
      extractStringArray(record.allergies) ?? extractStringArray(medical.chronicConditions);
    const medications = extractStringArray(record.current_medications);

    return {
      id: record.id,
      slug: record.slug ?? record.id,
      fullName,
      shortName: medical.shortName ?? fullName.split(' ')[0],
      status: (medical.status as PatientListItem['status']) ?? 'active',
      riskLevel: undefined,
      cpfMasked: medical.cpf
        ? `${medical.cpf.slice(0, 3)}.***.***-${medical.cpf.slice(-2)}`
        : '***',
      contact,
      professionalId: record.professional_id ?? undefined,
      professionalName: undefined,
      nextAppointmentAt: undefined,
      lastAppointmentAt: undefined,
      tags: mapTags(medical.tags),
      medical: {
        allergies: allergies ?? [],
        chronicConditions: medical.chronicConditions ?? [],
        preExistingConditions: medical.preExistingConditions ?? [],
        medications: medications ?? [],
        continuousMedications: medical.continuousMedications,
        observations: medical.observations,
        bloodType: medical.bloodType,
        lifestyle: medical.lifestyle,
        heightCm: medical.heightCm,
        weightKg: medical.weightKg,
      },
      acceptedTerms: medical.acceptedTerms ?? false,
      acceptedTermsAt: medical.acceptedTermsAt,
      revenueTotal: undefined,
      createdAt: record.created_at ? new Date(record.created_at) : new Date(),
      updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
    };
  },
};
