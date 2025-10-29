import { DomainEvent } from '../../../shared/events/domain-event.interface';

export interface ClinicOverbookingReviewRequestedEvent
  extends DomainEvent<{
    tenantId: string;
    clinicId: string;
    professionalId: string;
    patientId: string;
    serviceTypeId: string;
    riskScore: number;
    threshold: number;
    reasons?: string[] | null;
    context?: Record<string, unknown> | null;
    requestedBy: string;
    requestedAt: Date;
    autoApproved?: boolean;
  }> {}

export interface ClinicOverbookingReviewedEvent
  extends DomainEvent<{
    tenantId: string;
    clinicId: string;
    professionalId: string;
    patientId: string;
    serviceTypeId: string;
    status: 'approved' | 'rejected';
    riskScore: number;
    threshold: number;
    reviewedBy: string;
    reviewedAt: Date;
    justification?: string | null;
    reasons?: string[] | null;
    context?: Record<string, unknown> | null;
    autoApproved?: boolean;
    requestedBy?: string;
    requestedAt?: Date;
  }> {}
