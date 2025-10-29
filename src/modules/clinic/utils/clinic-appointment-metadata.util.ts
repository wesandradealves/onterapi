import type { ClinicAppointment } from '../../../domain/clinic/types/clinic.types';

export interface AppointmentCoverageContext {
  originalProfessionalId: string | null;
  coverageId: string | null;
}

export function extractAppointmentCoverageContext(
  appointment: ClinicAppointment,
): AppointmentCoverageContext {
  const metadata = appointment.metadata;

  if (!metadata || typeof metadata !== 'object') {
    return { originalProfessionalId: null, coverageId: null };
  }

  const coverageRaw = (metadata as Record<string, unknown>).coverage;
  if (!coverageRaw || typeof coverageRaw !== 'object') {
    return { originalProfessionalId: null, coverageId: null };
  }

  const coverage = coverageRaw as Record<string, unknown>;

  const originalProfessionalId =
    typeof coverage.originalProfessionalId === 'string'
      ? coverage.originalProfessionalId.trim()
      : null;
  const coverageId = typeof coverage.coverageId === 'string' ? coverage.coverageId.trim() : null;

  return {
    originalProfessionalId:
      originalProfessionalId && originalProfessionalId.length > 0 ? originalProfessionalId : null,
    coverageId: coverageId && coverageId.length > 0 ? coverageId : null,
  };
}
