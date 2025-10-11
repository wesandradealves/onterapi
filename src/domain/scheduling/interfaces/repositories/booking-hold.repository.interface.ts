import { BookingHold, CreateHoldInput, UpdateHoldStatusInput } from '../../types/scheduling.types';

export interface IBookingHoldRepository {
  create(data: CreateHoldInput): Promise<BookingHold>;
  findById(tenantId: string, holdId: string): Promise<BookingHold | null>;
  findActiveOverlap(
    tenantId: string,
    professionalId: string,
    startAtUtc: Date,
    endAtUtc: Date,
  ): Promise<BookingHold[]>;
  listExpiringBefore(tenantId: string, referenceUtc: Date): Promise<BookingHold[]>;
  updateStatus(data: UpdateHoldStatusInput): Promise<BookingHold>;
}

export const IBookingHoldRepositoryToken = Symbol('IBookingHoldRepository');
