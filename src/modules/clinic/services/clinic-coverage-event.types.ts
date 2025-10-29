import { DomainEvent } from '../../../shared/events/domain-event.interface';

type CoverageSummary = {
  clinicHolds: number;
  schedulingHolds: number;
  bookings: number;
  appointments: number;
};

export interface ClinicCoverageAppliedPayload {
  tenantId: string;
  clinicId: string;
  originalProfessionalId: string;
  coverageProfessionalId: string;
  startAt: Date | string;
  endAt: Date | string;
  triggerSource: 'manual' | 'automatic';
  triggeredBy: string;
  triggeredAt: Date | string;
  summary: CoverageSummary;
}

export type ClinicCoverageAppliedEvent = DomainEvent<ClinicCoverageAppliedPayload>;

export interface ClinicCoverageReleasedPayload {
  tenantId: string;
  clinicId: string;
  originalProfessionalId: string;
  coverageProfessionalId: string;
  reference: Date | string;
  triggerSource: 'manual' | 'automatic';
  triggeredBy: string;
  triggeredAt: Date | string;
  summary: CoverageSummary;
}

export type ClinicCoverageReleasedEvent = DomainEvent<ClinicCoverageReleasedPayload>;
