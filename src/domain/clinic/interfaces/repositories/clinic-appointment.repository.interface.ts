import { ClinicAppointment, ClinicPaymentStatus } from '../../types/clinic.types';

export interface CreateClinicAppointmentInput {
  clinicId: string;
  tenantId: string;
  holdId: string;
  professionalId: string;
  patientId: string;
  serviceTypeId: string;
  start: Date;
  end: Date;
  paymentTransactionId: string;
  paymentStatus: ClinicPaymentStatus;
  confirmedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateClinicAppointmentPaymentStatusInput {
  appointmentId: string;
  paymentStatus: ClinicPaymentStatus;
  gatewayStatus?: string;
  paidAt?: Date;
  eventFingerprint?: string;
  metadataPatch?: Record<string, unknown>;
}

export interface IClinicAppointmentRepository {
  create(input: CreateClinicAppointmentInput): Promise<ClinicAppointment>;
  findById(appointmentId: string): Promise<ClinicAppointment | null>;
  findByHoldId(holdId: string): Promise<ClinicAppointment | null>;
  findByPaymentTransactionId(paymentTransactionId: string): Promise<ClinicAppointment | null>;
  updatePaymentStatus(input: UpdateClinicAppointmentPaymentStatusInput): Promise<ClinicAppointment>;
  updateMetadata(params: {
    appointmentId: string;
    metadataPatch: Record<string, unknown>;
  }): Promise<ClinicAppointment>;
  listByClinic(params: {
    clinicId: string;
    tenantId: string;
    paymentStatuses?: ClinicPaymentStatus[];
    fromConfirmedAt?: Date;
    toConfirmedAt?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ClinicAppointment[]>;
  findActiveOverlap(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeAppointmentId?: string;
  }): Promise<ClinicAppointment[]>;
}

export const IClinicAppointmentRepository = Symbol('IClinicAppointmentRepository');
