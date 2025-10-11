import {
  Patient,
  PatientContinuousMedication,
  PatientListItem,
  PatientTag,
} from '../../../../domain/patients/types/patient.types';
import {
  PatientAddressResponseDto,
  PatientContactResponseDto,
  PatientDetailPatientDto,
  PatientMedicalInfoResponseDto,
  PatientResponseDto,
  PatientTagDetailDto,
} from '../dtos/patient-response.dto';
import { CPFUtils } from '../../../../shared/utils/cpf.utils';

type NullableDate = Date | string | null | undefined;

type Nullable<T> = T | null | undefined;

const toIsoString = (value: NullableDate): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return undefined;
};

const hasMeaningfulValue = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined && value !== null && value !== '';
};

const mapTagLabels = (tags?: PatientTag[] | null): string[] | undefined => {
  if (!tags?.length) {
    return undefined;
  }

  const labels = tags
    .map((tag) => tag.label)
    .filter((label): label is string => Boolean(label?.trim()));

  if (!labels.length) {
    return undefined;
  }

  return labels;
};

const mapTagDetails = (tags?: PatientTag[] | null): PatientTagDetailDto[] | undefined => {
  if (!tags?.length) {
    return undefined;
  }

  const details = tags.map((tag) => ({
    id: tag.id,
    label: tag.label,
    color: tag.color,
  }));

  return details;
};

const mapContinuousMedications = (
  medications?: Nullable<PatientContinuousMedication[]>,
): PatientMedicalInfoResponseDto['continuousMedications'] => {
  if (!medications?.length) {
    return undefined;
  }

  const mapped = medications
    .map((medication) => ({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      condition: medication.condition,
    }))
    .filter((entry) => hasMeaningfulValue(entry.name));

  if (!mapped.length) {
    return undefined;
  }

  return mapped;
};

const mapMedicalInfo = (
  medical?: Nullable<Patient['medical']>,
): PatientMedicalInfoResponseDto | undefined => {
  if (!medical) {
    return undefined;
  }

  const mapped: PatientMedicalInfoResponseDto = {
    allergies: medical.allergies && medical.allergies.length ? medical.allergies : undefined,
    chronicConditions:
      medical.chronicConditions && medical.chronicConditions.length
        ? medical.chronicConditions
        : undefined,
    preExistingConditions:
      medical.preExistingConditions && medical.preExistingConditions.length
        ? medical.preExistingConditions
        : undefined,
    medications:
      medical.medications && medical.medications.length ? medical.medications : undefined,
    continuousMedications: mapContinuousMedications(medical.continuousMedications),
    observations: medical.observations ?? undefined,
    bloodType: medical.bloodType ?? undefined,
    lifestyle: medical.lifestyle ?? undefined,
    heightCm: medical.heightCm ?? undefined,
    weightKg: medical.weightKg ?? undefined,
  };

  const hasData = Object.values(mapped).some(hasMeaningfulValue);

  return hasData ? mapped : undefined;
};

const mapContact = (
  contact?: Nullable<Patient['contact']>,
): PatientContactResponseDto | undefined => {
  if (!contact) {
    return undefined;
  }

  const mapped: Partial<PatientContactResponseDto> = {};

  if (typeof contact.email === 'string' && hasMeaningfulValue(contact.email)) {
    mapped.email = contact.email;
  }

  if (typeof contact.phone === 'string' && hasMeaningfulValue(contact.phone)) {
    mapped.phone = contact.phone;
  }

  if (typeof contact.whatsapp === 'string' && hasMeaningfulValue(contact.whatsapp)) {
    mapped.whatsapp = contact.whatsapp;
  }

  return Object.keys(mapped).length ? (mapped as PatientContactResponseDto) : undefined;
};

const mapAddress = (
  address?: Nullable<Patient['address']>,
): PatientAddressResponseDto | undefined => {
  if (!address) {
    return undefined;
  }

  const mapped: Partial<PatientAddressResponseDto> = {};

  if (hasMeaningfulValue(address.zipCode)) {
    mapped.zipCode = address.zipCode;
  }
  if (hasMeaningfulValue(address.street)) {
    mapped.street = address.street;
  }
  if (hasMeaningfulValue(address.number)) {
    mapped.number = address.number;
  }
  if (hasMeaningfulValue(address.complement)) {
    mapped.complement = address.complement;
  }
  if (hasMeaningfulValue(address.district)) {
    mapped.district = address.district;
  }
  if (hasMeaningfulValue(address.city)) {
    mapped.city = address.city;
  }
  if (hasMeaningfulValue(address.state)) {
    mapped.state = address.state;
  }
  if (hasMeaningfulValue(address.country)) {
    mapped.country = address.country;
  }

  return Object.keys(mapped).length ? (mapped as PatientAddressResponseDto) : undefined;
};

export const PatientPresenter = {
  listItem(patient: PatientListItem): PatientResponseDto {
    return {
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
      riskLevel: patient.riskLevel,
      cpfMasked: patient.cpfMasked,
      phone: patient.contact?.phone,
      whatsapp: patient.contact?.whatsapp,
      email: patient.contact?.email,
      nextAppointmentAt: toIsoString(patient.nextAppointmentAt),
      lastAppointmentAt: toIsoString(patient.lastAppointmentAt),
      professionalId: patient.professionalId,
      tags: mapTagLabels(patient.tags),
      createdAt:
        patient.createdAt instanceof Date ? patient.createdAt.toISOString() : patient.createdAt,
      updatedAt:
        patient.updatedAt instanceof Date ? patient.updatedAt.toISOString() : patient.updatedAt,
      acceptedTerms: patient.acceptedTerms,
      acceptedTermsAt: toIsoString(patient.acceptedTermsAt),
      medical: mapMedicalInfo(patient.medical),
    };
  },

  summary(patient: Patient): PatientResponseDto {
    return {
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
      riskLevel: patient.riskLevel,
      cpfMasked: CPFUtils.mask(patient.cpf),
      phone: patient.contact?.phone,
      whatsapp: patient.contact?.whatsapp,
      email: patient.contact?.email,
      nextAppointmentAt: toIsoString(patient.nextAppointmentAt),
      lastAppointmentAt: toIsoString(patient.lastAppointmentAt),
      professionalId: patient.professionalId,
      tags: mapTagLabels(patient.tags),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
      acceptedTerms: patient.acceptedTerms,
      acceptedTermsAt: toIsoString(patient.acceptedTermsAt),
      medical: mapMedicalInfo(patient.medical),
    };
  },

  detail(patient: Patient): PatientDetailPatientDto {
    const base = PatientPresenter.summary(patient);

    return {
      ...base,
      contact: mapContact(patient.contact),
      address: mapAddress(patient.address),
      medical: mapMedicalInfo(patient.medical),
      tagDetails: mapTagDetails(patient.tags),
    };
  },
};
