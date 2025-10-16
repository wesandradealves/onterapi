import { RolesEnum } from '@domain/auth/enums/roles.enum';
import {
  SchedulingRequestContext,
  toCancelBookingInput,
  toConfirmBookingInput,
  toCreateBookingInput,
  toCreateHoldInput,
  toMarkBookingNoShowInput,
  toRecordPaymentStatusInput,
  toRescheduleBookingInput,
} from '@modules/scheduling/api/mappers/booking-request.mapper';

const context: SchedulingRequestContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  role: RolesEnum.CLINIC_OWNER,
};

describe('booking-request.mapper', () => {
  it('mapeia cria  o de agendamento', () => {
    const input = toCreateBookingInput(
      {
        holdId: 'hold-1',
        source: 'clinic_portal',
        timezone: 'America/Sao_Paulo',
        paymentStatus: 'approved',
        lateToleranceMinutes: 10,
        recurrenceSeriesId: 'series-1',
        pricingSplit: {
          totalCents: 20000,
          platformCents: 3000,
          clinicCents: 7000,
          professionalCents: 9000,
          gatewayCents: 500,
          taxesCents: 500,
          currency: 'BRL',
        },
        preconditionsPassed: true,
        anamneseRequired: true,
        anamneseOverrideReason: 'override',
      },
      context,
    );

    expect(input.tenantId).toBe(context.tenantId);
    expect(input.requesterId).toBe(context.userId);
    expect(input.requestedAtUtc).toBeInstanceOf(Date);
  });

  it('mapeia cria  o de hold', () => {
    const input = toCreateHoldInput(
      {
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-1',
        startAtUtc: '2025-10-10T10:00:00Z',
        endAtUtc: '2025-10-10T11:00:00Z',
      },
      context,
    );

    expect(input.startAtUtc).toBeInstanceOf(Date);
    expect(input.endAtUtc).toBeInstanceOf(Date);
  });

  it('mapeia cancelamento', () => {
    const input = toCancelBookingInput(
      'booking-1',
      {
        expectedVersion: 2,
        reason: 'patient_request',
        cancelledAtUtc: '2025-10-09T12:00:00Z',
      },
      context,
    );

    expect(input.bookingId).toBe('booking-1');
    expect(input.cancelledAtUtc).toBeInstanceOf(Date);
  });

  it('mapeia confirma  o', () => {
    const input = toConfirmBookingInput(
      'booking-1',
      {
        holdId: 'hold-1',
        paymentStatus: 'approved',
        confirmationAtUtc: '2025-10-09T13:00:00Z',
      },
      context,
    );

    expect(input.holdId).toBe('hold-1');
    expect(input.confirmationAtUtc).toBeInstanceOf(Date);
  });

  it('mapeia atualiza  o de pagamento', () => {
    const input = toRecordPaymentStatusInput(
      'booking-1',
      { expectedVersion: 3, paymentStatus: 'settled' },
      context,
    );

    expect(input.paymentStatus).toBe('settled');
  });

  it('mapeia reagendamento', () => {
    const input = toRescheduleBookingInput(
      'booking-1',
      {
        expectedVersion: 4,
        newStartAtUtc: '2025-10-11T08:00:00Z',
        newEndAtUtc: '2025-10-11T09:00:00Z',
        reason: 'patient request',
      },
      context,
    );

    expect(input.newStartAtUtc).toBeInstanceOf(Date);
    expect(input.reason).toBe('patient request');
  });

  it('mapeia marca  o de no-show', () => {
    const input = toMarkBookingNoShowInput(
      'booking-1',
      {
        expectedVersion: 5,
        markedAtUtc: '2025-10-10T10:45:00Z',
      },
      context,
    );

    expect(input.markedAtUtc).toBeInstanceOf(Date);
  });
});
