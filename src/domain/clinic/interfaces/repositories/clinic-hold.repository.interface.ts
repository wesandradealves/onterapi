import {
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicHoldRequestInput,
} from '../../types/clinic.types';

export interface IClinicHoldRepository {
  create(input: ClinicHoldRequestInput & { ttlExpiresAt: Date }): Promise<ClinicHold>;
  findById(holdId: string): Promise<ClinicHold | null>;
  findByIdempotencyKey(
    clinicId: string,
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ClinicHold | null>;
  listActiveByClinic(clinicId: string): Promise<ClinicHold[]>;
  confirmHold(
    input: ClinicHoldConfirmationInput & {
      confirmedAt: Date;
      status: 'confirmed' | 'expired';
      appointmentId?: string;
    },
  ): Promise<ClinicHold>;
  cancelHold(params: {
    holdId: string;
    cancelledBy: string;
    reason?: string;
    cancelledAt?: Date;
  }): Promise<ClinicHold>;
  expireHold(holdId: string, expiredAt: Date): Promise<ClinicHold>;
  expireHoldsBefore(referenceDate: Date): Promise<number>;
  findActiveOverlapByProfessional(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeHoldId?: string;
  }): Promise<ClinicHold[]>;
}

export const IClinicHoldRepository = Symbol('IClinicHoldRepository');
