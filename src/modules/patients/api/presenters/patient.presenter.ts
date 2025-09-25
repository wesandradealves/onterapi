import { Patient, PatientListItem, PatientTag } from '../../../../domain/patients/types/patient.types';
import { PatientResponseDto } from '../dtos/patient-response.dto';
import { CPFUtils } from '../../../../shared/utils/cpf.utils';

const toIsoString = (value?: Date | string | null): string | undefined => {
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

const mapTagLabels = (tags?: PatientTag[] | null): string[] | undefined => {
  if (!tags || !tags.length) {
    return undefined;
  }
  return tags.map((tag) => tag.label);
};

export const PatientPresenter = {
  listItem(patient: PatientListItem): PatientResponseDto {
    return {
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: patient.cpfMasked,
      phone: patient.contact.phone,
      whatsapp: patient.contact.whatsapp,
      email: patient.contact.email,
      nextAppointmentAt: toIsoString(patient.nextAppointmentAt),
      lastAppointmentAt: toIsoString(patient.lastAppointmentAt),
      professionalId: patient.professionalId,
      tags: mapTagLabels(patient.tags),
      createdAt: toIsoString(patient.createdAt) as string,
      updatedAt: toIsoString(patient.updatedAt) as string,
    };
  },

  summary(patient: Patient): PatientResponseDto {
    return {
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
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
    };
  },

  detail(patient: Patient) {
    return {
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: CPFUtils.mask(patient.cpf),
      contact: patient.contact,
      address: patient.address,
      medical: patient.medical,
      professionalId: patient.professionalId,
      tags: patient.tags?.map((tag) => ({
        id: tag.id,
        label: tag.label,
        color: tag.color,
      })),
      nextAppointmentAt: toIsoString(patient.nextAppointmentAt),
      lastAppointmentAt: toIsoString(patient.lastAppointmentAt),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
      riskLevel: patient.riskLevel,
    };
  },
};


