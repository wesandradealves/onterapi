import {
  ClinicCurrency,
  ClinicPaymentLedger,
  ClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerEventEntry,
  ClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement,
  ClinicPaymentSplitAllocation,
  ClinicSplitRecipient,
} from '../../../domain/clinic/types/clinic.types';

const DEFAULT_LEDGER: ClinicPaymentLedger = {
  currency: 'BRL',
  lastUpdatedAt: new Date(0).toISOString(),
  events: [],
};

export function extractClinicPaymentLedger(
  metadata: Record<string, unknown> | undefined,
): ClinicPaymentLedger {
  const rawLedger =
    metadata &&
    typeof metadata === 'object' &&
    metadata !== null &&
    'paymentLedger' in metadata &&
    typeof (metadata as Record<string, unknown>).paymentLedger === 'object'
      ? ((metadata as Record<string, unknown>).paymentLedger as Record<string, unknown>)
      : undefined;

  if (!rawLedger) {
    return { ...DEFAULT_LEDGER };
  }

  const currency =
    (rawLedger.currency as ClinicCurrency | undefined) && typeof rawLedger.currency === 'string'
      ? (rawLedger.currency as ClinicCurrency)
      : 'BRL';

  const events = Array.isArray(rawLedger.events)
    ? normalizeEvents(rawLedger.events as unknown[])
    : [];

  const settlement = normalizeSettlement(rawLedger.settlement);
  const refund = normalizeRefund(rawLedger.refund);
  const chargeback = normalizeChargeback(rawLedger.chargeback);

  return {
    currency,
    lastUpdatedAt:
      typeof rawLedger.lastUpdatedAt === 'string'
        ? (rawLedger.lastUpdatedAt as string)
        : DEFAULT_LEDGER.lastUpdatedAt,
    events,
    settlement,
    refund,
    chargeback,
    metadata:
      rawLedger.metadata && typeof rawLedger.metadata === 'object'
        ? (rawLedger.metadata as Record<string, unknown>)
        : undefined,
  };
}

function normalizeEvents(items: unknown[]): ClinicPaymentLedgerEventEntry[] {
  return items.reduce<ClinicPaymentLedgerEventEntry[]>((acc, item) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const entry = item as Record<string, unknown>;
    const type = entry.type;
    const gatewayStatus = entry.gatewayStatus;
    const recordedAt = entry.recordedAt;

    if (
      (type === 'status_changed' ||
        type === 'settled' ||
        type === 'refunded' ||
        type === 'chargeback' ||
        type === 'failed') &&
      typeof gatewayStatus === 'string' &&
      typeof recordedAt === 'string'
    ) {
      acc.push({
        type,
        gatewayStatus,
        recordedAt,
        eventType:
          typeof entry.eventType === 'string' && entry.eventType.length > 0
            ? (entry.eventType as string)
            : undefined,
        fingerprint:
          typeof entry.fingerprint === 'string' && entry.fingerprint.length > 0
            ? (entry.fingerprint as string)
            : undefined,
        sandbox: Boolean(entry.sandbox),
        metadata:
          entry.metadata && typeof entry.metadata === 'object'
            ? (entry.metadata as Record<string, unknown>)
            : undefined,
      });
    }

    return acc;
  }, []);
}

function normalizeSettlement(raw: unknown): ClinicPaymentLedgerSettlement | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const data = raw as Record<string, unknown>;
  const settledAt = data.settledAt;
  const baseAmountCents = data.baseAmountCents;

  if (typeof settledAt !== 'string' || typeof baseAmountCents !== 'number') {
    return undefined;
  }

  const split = Array.isArray(data.split)
    ? (data.split as unknown[]).reduce<ClinicPaymentSplitAllocation[]>((acc, item) => {
        if (!item || typeof item !== 'object') {
          return acc;
        }

        const entry = item as Record<string, unknown>;
        const recipient = entry.recipient;
        const percentage = entry.percentage;
        const amountCents = entry.amountCents;

        if (
          (recipient === 'taxes' ||
            recipient === 'gateway' ||
            recipient === 'clinic' ||
            recipient === 'professional' ||
            recipient === 'platform') &&
          typeof percentage === 'number' &&
          typeof amountCents === 'number'
        ) {
          acc.push({
            recipient: recipient as ClinicSplitRecipient,
            percentage,
            amountCents,
          });
        }

        return acc;
      }, [])
    : [];

  return {
    settledAt,
    baseAmountCents,
    netAmountCents:
      typeof data.netAmountCents === 'number' ? (data.netAmountCents as number) : undefined,
    split,
    remainderCents: typeof data.remainderCents === 'number' ? (data.remainderCents as number) : 0,
    fingerprint:
      typeof data.fingerprint === 'string' && data.fingerprint.length > 0
        ? (data.fingerprint as string)
        : undefined,
    gatewayStatus:
      typeof data.gatewayStatus === 'string' ? (data.gatewayStatus as string) : 'UNKNOWN',
  };
}

function normalizeRefund(raw: unknown): ClinicPaymentLedgerRefund | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const data = raw as Record<string, unknown>;
  const refundedAt = data.refundedAt;
  const gatewayStatus = data.gatewayStatus;

  if (typeof refundedAt !== 'string' || typeof gatewayStatus !== 'string') {
    return undefined;
  }

  return {
    refundedAt,
    amountCents: typeof data.amountCents === 'number' ? (data.amountCents as number) : undefined,
    netAmountCents:
      typeof data.netAmountCents === 'number' ? (data.netAmountCents as number) : undefined,
    fingerprint:
      typeof data.fingerprint === 'string' && data.fingerprint.length > 0
        ? (data.fingerprint as string)
        : undefined,
    gatewayStatus,
  };
}

function normalizeChargeback(raw: unknown): ClinicPaymentLedgerChargeback | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const data = raw as Record<string, unknown>;
  const chargebackAt = data.chargebackAt;
  const gatewayStatus = data.gatewayStatus;

  if (typeof chargebackAt !== 'string' || typeof gatewayStatus !== 'string') {
    return undefined;
  }

  return {
    chargebackAt,
    amountCents: typeof data.amountCents === 'number' ? (data.amountCents as number) : undefined,
    netAmountCents:
      typeof data.netAmountCents === 'number' ? (data.netAmountCents as number) : undefined,
    fingerprint:
      typeof data.fingerprint === 'string' && data.fingerprint.length > 0
        ? (data.fingerprint as string)
        : undefined,
    gatewayStatus,
  };
}
