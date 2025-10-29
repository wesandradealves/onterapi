export type PatientStatus = 'new' | 'active' | 'inactive' | 'in_treatment' | 'finished';

export type PatientRiskLevel = 'low' | 'medium' | 'high';

export interface PatientAddress {
  zipCode: string;
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state: string;
  country?: string;
}

export interface PatientContact {
  email?: string;
  phone?: string;
  whatsapp?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface PatientContinuousMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  condition?: string;
}

export interface PatientMedicalInfo {
  allergies?: string[];
  chronicConditions?: string[];
  preExistingConditions?: string[];
  medications?: string[];
  continuousMedications?: PatientContinuousMedication[];
  observations?: string;
  bloodType?: string;
  lifestyle?: string;
  heightCm?: number;
  weightKg?: number;
}

export interface PatientTag {
  id: string;
  label: string;
  color?: string;
}

export interface Patient {
  id: string;
  slug: string;
  tenantId: string;
  professionalId?: string;
  fullName: string;
  shortName?: string;
  cpf: string;
  birthDate?: Date;
  gender?: string;
  maritalStatus?: string;
  status: PatientStatus;
  emailVerified: boolean;
  preferredLanguage?: string;
  contact: PatientContact;
  address?: PatientAddress;
  medical?: PatientMedicalInfo;
  tags?: PatientTag[];
  riskLevel?: PatientRiskLevel;
  lastAppointmentAt?: Date;
  nextAppointmentAt?: Date;
  acceptedTerms: boolean;
  acceptedTermsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface PatientListFilters {
  query?: string;
  status?: PatientStatus[];
  riskLevel?: PatientRiskLevel[];
  assignedProfessionalIds?: string[];
  tags?: string[];
  withoutUpcomingAppointments?: boolean;
  lastAppointmentBefore?: Date;
  lastAppointmentAfter?: Date;
  createdBetween?: { start: Date; end: Date };
  quickFilter?: 'inactive_30_days' | 'no_anamnesis' | 'needs_follow_up' | 'birthday_week';
}

export interface PatientListItem {
  id: string;
  slug: string;
  fullName: string;
  shortName?: string;
  status: PatientStatus;
  riskLevel?: PatientRiskLevel;
  cpfMasked: string;
  contact: Pick<PatientContact, 'phone' | 'whatsapp' | 'email'>;
  medical?: PatientMedicalInfo;
  acceptedTerms: boolean;
  acceptedTermsAt?: Date;
  professionalId?: string;
  professionalName?: string;
  nextAppointmentAt?: Date;
  lastAppointmentAt?: Date;
  tags?: PatientTag[];
  revenueTotal?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientTimelineEntry {
  id: string;
  type: 'appointment' | 'anamnesis' | 'plan' | 'task' | 'payment' | 'note' | 'transfer';
  title: string;
  description?: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface PatientSummary {
  totals: {
    appointments: number;
    completedAppointments: number;
    cancellations: number;
    revenue: number;
    pendingPayments: number;
  };
  alerts: string[];
  retentionScore?: number;
}

export interface CreatePatientInput {
  tenantId: string;
  createdBy: string;
  requesterRole: string;
  professionalId?: string;
  fullName: string;
  cpf: string;
  birthDate?: Date;
  gender?: string;
  maritalStatus?: string;
  contact?: PatientContact;
  address?: PatientAddress;
  medical?: PatientMedicalInfo;
  tags?: string[];
  status?: PatientStatus;
  acceptedTerms: boolean;
  acceptedTermsAt?: Date;
}

export interface UpdatePatientInput {
  patientSlug: string;
  patientId?: string;
  tenantId: string;
  updatedBy: string;
  requesterRole: string;
  fullName?: string;
  shortName?: string;
  status?: PatientStatus;
  contact?: PatientContact;
  address?: PatientAddress;
  medical?: PatientMedicalInfo;
  tags?: string[];
  riskLevel?: PatientRiskLevel;
  professionalId?: string | null;
  acceptedTerms?: boolean;
  acceptedTermsAt?: Date;
}

export interface TransferPatientInput {
  patientSlug: string;
  patientId?: string;
  tenantId: string;
  requestedBy: string;
  requesterRole: string;
  fromProfessionalId?: string;
  toProfessionalId: string;
  reason: string;
  effectiveAt?: Date;
}

export interface ArchivePatientInput {
  patientSlug: string;
  patientId?: string;
  tenantId: string;
  requestedBy: string;
  requesterRole: string;
  reason?: string;
  archiveRelatedData?: boolean;
}

export interface PatientExportRequest {
  tenantId: string;
  requestedBy: string;
  requesterRole: string;
  filters?: PatientListFilters;
  format: 'pdf' | 'csv' | 'excel' | 'vcard';
  includeMedicalData?: boolean;
}
