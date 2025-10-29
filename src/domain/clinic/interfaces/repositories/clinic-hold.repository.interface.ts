import {
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicHoldRequestInput,
  ClinicPaymentStatus,
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
      paymentStatus?: ClinicPaymentStatus;
      gatewayStatus?: string;
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
  updatePaymentStatus(params: {
    holdId: string;
    clinicId: string;
    tenantId: string;
    paymentStatus: ClinicPaymentStatus;
    gatewayStatus?: string;
    paidAt?: Date;
    eventFingerprint?: string;
  }): Promise<ClinicHold>;
  findActiveOverlapByProfessional(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeHoldId?: string;
  }): Promise<ClinicHold[]>;
  findActiveOverlapByResources(params: {
    tenantId: string;
    clinicId?: string;
    start: Date;
    end: Date;
    locationId?: string;
    resources?: string[];
    excludeHoldId?: string;
  }): Promise<ClinicHold[]>;
  updateMetadata(params: {
    holdId: string;
    metadata: Record<string, unknown>;
  }): Promise<ClinicHold>;
  reassignForCoverage(params: {
    tenantId: string;
    clinicId: string;
    originalProfessionalId: string;
    coverageProfessionalId: string;
    coverageId: string;
    start: Date;
    end: Date;
  }): Promise<ClinicHold[]>;
  releaseCoverageAssignments(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
    reference: Date;
    originalProfessionalId: string;
    coverageProfessionalId: string;
  }): Promise<ClinicHold[]>;
}

export const IClinicHoldRepository = Symbol('IClinicHoldRepository');
