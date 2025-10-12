import { ClinicPresenter } from '../../../src/modules/clinic/api/presenters/clinic.presenter';
import {
  ClinicAppointmentConfirmationResult,
  ClinicInvitation,
  ClinicPaymentLedger,
} from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicPresenter.invitation', () => {
  const baseInvitation: ClinicInvitation = {
    id: 'invitation-id',
    clinicId: 'clinic-id',
    tenantId: 'tenant-id',
    issuedBy: 'user-id',
    status: 'pending',
    tokenHash: 'hashed-token',
    channel: 'email',
    expiresAt: new Date('2025-12-01T12:00:00Z'),
    economicSummary: {
      items: [
        {
          serviceTypeId: 'service-1',
          price: 200,
          currency: 'BRL',
          payoutModel: 'fixed',
          payoutValue: 80,
        },
        {
          serviceTypeId: 'service-2',
          price: 150,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 40,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    },
    createdAt: new Date('2025-10-12T10:00:00Z'),
    updatedAt: new Date('2025-10-12T10:00:00Z'),
    metadata: {},
  };

  it('should include economic examples with proper calculations', () => {
    const dto = ClinicPresenter.invitation(baseInvitation, 'raw-token');

    expect(dto.economicSummary.examples).toBeDefined();
    expect(dto.economicSummary.examples).toHaveLength(2);

    const [fixedExample, percentageExample] = dto.economicSummary.examples ?? [];

    expect(fixedExample).toEqual({
      currency: 'BRL',
      patientPays: 200,
      professionalReceives: 80,
      remainder: 120,
    });

    // 40% of 150 = 60
    expect(percentageExample).toEqual({
      currency: 'BRL',
      patientPays: 150,
      professionalReceives: 60,
      remainder: 90,
    });
  });

  it('should preserve other invitation fields', () => {
    const dto = ClinicPresenter.invitation(
      {
        ...baseInvitation,
        professionalId: 'professional-1',
        targetEmail: 'pro@example.com',
        metadata: { reference: 'source-system' },
      },
      undefined,
    );

    expect(dto.professionalId).toBe('professional-1');
    expect(dto.targetEmail).toBe('pro@example.com');
    expect(dto.metadata).toEqual({ reference: 'source-system' });
    expect(dto.token).toBeUndefined();
  });
});

describe('ClinicPresenter.holdConfirmation', () => {
  it('should map confirmation result into response dto', () => {
    const confirmation: ClinicAppointmentConfirmationResult = {
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      holdId: 'hold-1',
      paymentTransactionId: 'trx-123',
      confirmedAt: new Date('2025-12-05T09:00:00Z'),
      paymentStatus: 'approved',
    };

    const dto = ClinicPresenter.holdConfirmation(confirmation);

    expect(dto).toEqual({
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      holdId: 'hold-1',
      paymentTransactionId: 'trx-123',
      confirmedAt: confirmation.confirmedAt,
      paymentStatus: 'approved',
    });
  });
});

describe('ClinicPresenter.paymentLedger', () => {
  const baseLedger: ClinicPaymentLedger = {
    currency: 'BRL',
    lastUpdatedAt: '2099-01-01T12:00:00.000Z',
    events: [
      {
        type: 'settled',
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
        recordedAt: '2099-01-01T12:00:00.000Z',
        sandbox: false,
      },
      {
        type: 'refunded',
        gatewayStatus: 'REFUNDED',
        recordedAt: '2099-01-02T09:00:00.000Z',
        sandbox: false,
        metadata: { reason: 'customer_request' },
      },
    ],
    settlement: {
      settledAt: '2099-01-01T12:00:00.000Z',
      baseAmountCents: 20000,
      netAmountCents: 18000,
      split: [
        { recipient: 'taxes', percentage: 5, amountCents: 1000 },
        { recipient: 'clinic', percentage: 70, amountCents: 14000 },
        { recipient: 'professional', percentage: 25, amountCents: 5000 },
      ],
      remainderCents: 0,
      gatewayStatus: 'RECEIVED_IN_ADVANCE',
      fingerprint: 'fp-settled',
    },
    refund: {
      refundedAt: '2099-01-02T09:00:00.000Z',
      amountCents: 20000,
      netAmountCents: 18000,
      gatewayStatus: 'REFUNDED',
      fingerprint: 'fp-refund',
    },
    chargeback: undefined,
    metadata: { source: 'asaas' },
  };

  it('should map payment ledger with events and settlement', () => {
    const dto = ClinicPresenter.paymentLedger({
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'settled',
      paymentTransactionId: 'trx-123',
      ledger: baseLedger,
    });

    expect(dto.appointmentId).toBe('appointment-1');
    expect(dto.paymentStatus).toBe('settled');
    expect(dto.ledger.currency).toBe('BRL');
    expect(dto.ledger.events).toHaveLength(2);
    expect(dto.ledger.events[1]).toMatchObject({
      type: 'refunded',
      gatewayStatus: 'REFUNDED',
      metadata: { reason: 'customer_request' },
    });
    expect(dto.ledger.settlement?.split).toHaveLength(3);
    expect(dto.ledger.settlement?.split?.[0]).toEqual({
      recipient: 'taxes',
      percentage: 5,
      amountCents: 1000,
    });
    expect(dto.ledger.refund?.fingerprint).toBe('fp-refund');
    expect(dto.ledger.chargeback).toBeUndefined();
    expect(dto.ledger.metadata).toEqual({ source: 'asaas' });
  });

  it('should handle optional sections gracefully', () => {
    const dto = ClinicPresenter.paymentLedger({
      appointmentId: 'appointment-2',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'approved',
      paymentTransactionId: 'trx-456',
      ledger: {
        currency: 'BRL',
        lastUpdatedAt: '2099-01-05T10:00:00.000Z',
        events: [],
      },
    });

    expect(dto.ledger.events).toHaveLength(0);
    expect(dto.ledger.settlement).toBeUndefined();
    expect(dto.ledger.refund).toBeUndefined();
    expect(dto.ledger.chargeback).toBeUndefined();
  });
});
