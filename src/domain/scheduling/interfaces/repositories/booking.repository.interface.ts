import {
  Booking,
  MarkNoShowInput,
  NewBooking,
  RecordPaymentStatusInput,
  RescheduleBookingInput,
  UpdateBookingStatusInput,
} from '../../types/scheduling.types';

export interface IBookingRepository {
  create(data: NewBooking): Promise<Booking>;
  findById(tenantId: string, bookingId: string): Promise<Booking | null>;
  findByHold(tenantId: string, holdId: string): Promise<Booking | null>;
  listByProfessionalAndRange(
    tenantId: string,
    professionalId: string,
    rangeStartUtc: Date,
    rangeEndUtc: Date,
  ): Promise<Booking[]>;
  listByClinicAndRange(
    tenantId: string,
    clinicId: string,
    rangeStartUtc: Date,
    rangeEndUtc: Date,
  ): Promise<Booking[]>;
  updateStatus(data: UpdateBookingStatusInput): Promise<Booking>;
  reschedule(data: RescheduleBookingInput): Promise<Booking>;
  recordPaymentStatus(data: RecordPaymentStatusInput): Promise<Booking>;
  markNoShow(data: MarkNoShowInput): Promise<Booking>;
  reassignForCoverage(params: {
    tenantId: string;
    clinicId: string;
    originalProfessionalId: string;
    coverageProfessionalId: string;
    coverageId: string;
    startAtUtc: Date;
    endAtUtc: Date;
  }): Promise<Booking[]>;
  releaseCoverageAssignments(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
    referenceUtc: Date;
    originalProfessionalId: string;
    coverageProfessionalId: string;
  }): Promise<Booking[]>;
}

export const IBookingRepositoryToken = Symbol('IBookingRepository');
