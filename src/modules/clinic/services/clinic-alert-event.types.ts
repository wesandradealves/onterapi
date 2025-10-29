import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { ClinicAlertChannel, ClinicAlertType } from '../../../domain/clinic/types/clinic.types';

export interface ClinicAlertTriggeredEvent extends DomainEvent {
  eventName: typeof DomainEvents.CLINIC_ALERT_TRIGGERED;
  payload: {
    alertId: string;
    tenantId: string;
    clinicId: string;
    type: ClinicAlertType | string;
    channel: ClinicAlertChannel | string;
    triggeredBy: string;
    triggeredAt: Date;
    payload: Record<string, unknown>;
  };
}

export interface ClinicAlertResolvedEvent extends DomainEvent {
  eventName: typeof DomainEvents.CLINIC_ALERT_RESOLVED;
  payload: {
    alertId: string;
    tenantId: string;
    clinicId: string;
    type: ClinicAlertType | string;
    channel?: ClinicAlertChannel | string;
    resolvedBy: string;
    resolvedAt: Date;
    triggeredAt?: Date;
    triggeredBy?: string;
    payload?: Record<string, unknown>;
  };
}
