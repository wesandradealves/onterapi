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

export interface IClinicAppointmentRepository {
  create(input: CreateClinicAppointmentInput): Promise<ClinicAppointment>;
  findByHoldId(holdId: string): Promise<ClinicAppointment | null>;
  findActiveOverlap(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeAppointmentId?: string;
  }): Promise<ClinicAppointment[]>;
}

export const IClinicAppointmentRepository = Symbol('IClinicAppointmentRepository');
