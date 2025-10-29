import { ClinicPaymentStatus } from '../../../domain/clinic/types/clinic.types';

const STATUS_MAP: Record<string, ClinicPaymentStatus> = {
  RECEIVED: 'approved',
  RECEIVED_IN_CASH: 'approved',
  CONFIRMED: 'approved',
  RECEIVED_PARTIAL: 'approved',
  DUNNING_RECEIVED: 'approved',
  DUNNING_REQUESTED: 'approved',
  PAID_OVER: 'approved',
  RECEIVED_IN_ADVANCE: 'settled',
  ANTECIPATED: 'settled',
  SETTLED: 'settled',
  REFUNDED: 'refunded',
  CHARGEBACK_REQUESTED: 'chargeback',
  CHARGEBACK_DISPUTE: 'chargeback',
  AWAITING_CHARGEBACK_REVERSAL: 'chargeback',
};

const EVENT_MAP: Record<string, ClinicPaymentStatus> = {
  PAYMENT_CONFIRMED: 'approved',
  PAYMENT_RECEIVED: 'approved',
  PAYMENT_RECEIVED_IN_CASH: 'approved',
  PAYMENT_RECEIVED_IN_ADVANCE: 'settled',
  PAYMENT_ANTICIPATED: 'settled',
  PAYMENT_CHARGEBACK: 'chargeback',
  PAYMENT_REFUNDED: 'refunded',
  PAYMENT_OVERDUE: 'failed',
  PAYMENT_EXPIRED: 'failed',
  PAYMENT_DELETED: 'failed',
  PAYMENT_CANCELED: 'failed',
};

const FAILURE_STATUSES = new Set([
  'PENDING',
  'PENDING_CUSTOMER',
  'AWAITING_RISK_ANALYSIS',
  'AWAITING_DOCUMENTS',
  'OVERDUE',
  'CANCELED',
  'EXPIRED',
  'DELETED',
]);

export function mapAsaasPaymentStatus(status?: string | null): ClinicPaymentStatus | null {
  if (!status) {
    return null;
  }

  const normalized = status.toUpperCase();

  if (STATUS_MAP[normalized]) {
    return STATUS_MAP[normalized];
  }

  if (FAILURE_STATUSES.has(normalized)) {
    return 'failed';
  }

  return null;
}

export function mapAsaasEventToPaymentStatus(
  event?: string | null,
  fallbackStatus?: string | null,
): ClinicPaymentStatus | null {
  const byStatus = mapAsaasPaymentStatus(fallbackStatus);
  if (byStatus) {
    return byStatus;
  }

  if (!event) {
    return null;
  }

  const normalizedEvent = event.toUpperCase();
  return EVENT_MAP[normalizedEvent] ?? null;
}
