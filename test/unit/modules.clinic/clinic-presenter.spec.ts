import { ClinicPresenter } from '../../../src/modules/clinic/api/presenters/clinic.presenter';
import {
  ClinicAppointmentConfirmationResult,
  ClinicInvitation,
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
