import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { SchedulingController } from '@modules/scheduling/api/controllers/scheduling.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import {
  CreateHoldUseCaseInput,
  ICreateHoldUseCase,
} from '@domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import {
  CreateBookingUseCaseInput,
  ICreateBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/create-booking.use-case.interface';
import {
  ConfirmBookingUseCaseInput,
  IConfirmBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/confirm-booking.use-case.interface';
import {
  IRescheduleBookingUseCase,
  RescheduleBookingUseCaseInput,
} from '@domain/scheduling/interfaces/use-cases/reschedule-booking.use-case.interface';
import {
  CancelBookingUseCaseInput,
  ICancelBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/cancel-booking.use-case.interface';
import {
  IRecordPaymentStatusUseCase,
  RecordPaymentStatusUseCaseInput,
} from '@domain/scheduling/interfaces/use-cases/record-payment-status.use-case.interface';
import {
  IMarkBookingNoShowUseCase,
  MarkBookingNoShowUseCaseInput,
} from '@domain/scheduling/interfaces/use-cases/mark-booking-no-show.use-case.interface';
import { Booking, BookingHold } from '@domain/scheduling/types/scheduling.types';
import { Result } from '@shared/types/result.type';

interface UseCaseMock<TInput, TOutput> {
  execute: jest.Mock<Promise<Result<TOutput>>, [TInput]>;
  executeOrThrow: jest.Mock<Promise<TOutput>, [TInput]>;
}

describe('SchedulingController (integration)', () => {
  let app: INestApplication;

  const FIXTURE_IDS = {
    tenant: '11111111-1111-1111-1111-111111111111',
    clinic: '22222222-2222-2222-2222-222222222222',
    professional: '33333333-3333-3333-3333-333333333333',
    patient: '44444444-4444-4444-4444-444444444444',
    hold: '55555555-5555-5555-5555-555555555555',
    booking: '66666666-6666-6666-6666-666666666666',
    serviceType: '77777777-7777-7777-7777-777777777777',
  } as const;

  const currentUser: ICurrentUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: RolesEnum.CLINIC_OWNER,
    tenantId: FIXTURE_IDS.tenant,
    sessionId: 'session-1',
    metadata: {},
  };

  const guards = {
    JwtAuthGuard: class implements Partial<JwtAuthGuard> {
      canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        request.user = currentUser;
        return true;
      }
    },
    RolesGuard: class implements Partial<RolesGuard> {
      canActivate() {
        return true;
      }
    },
  } as Record<string, unknown>;

  const createUseCaseMock = <TInput, TOutput>(): UseCaseMock<TInput, TOutput> => {
    const execute = jest.fn<Promise<Result<TOutput>>, [TInput]>();
    const executeOrThrow = jest.fn<Promise<TOutput>, [TInput]>(async (input: TInput) => {
      const result = await execute(input);

      if (result?.error) {
        throw result.error;
      }

      return result?.data as TOutput;
    });

    return { execute, executeOrThrow };
  };

  const createHold = (overrides: Partial<BookingHold> = {}): BookingHold => ({
    id: overrides.id ?? FIXTURE_IDS.hold,
    tenantId: overrides.tenantId ?? FIXTURE_IDS.tenant,
    clinicId: overrides.clinicId ?? FIXTURE_IDS.clinic,
    professionalId: overrides.professionalId ?? FIXTURE_IDS.professional,
    patientId: overrides.patientId ?? FIXTURE_IDS.patient,
    startAtUtc: overrides.startAtUtc ?? new Date('2025-10-10T10:00:00.000Z'),
    endAtUtc: overrides.endAtUtc ?? new Date('2025-10-10T11:00:00.000Z'),
    ttlExpiresAtUtc: overrides.ttlExpiresAtUtc ?? new Date('2025-10-10T10:15:00.000Z'),
    status: overrides.status ?? 'active',
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? new Date('2025-10-09T14:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-10-09T14:00:00.000Z'),
  });

  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: overrides.id ?? FIXTURE_IDS.booking,
    tenantId: overrides.tenantId ?? FIXTURE_IDS.tenant,
    clinicId: overrides.clinicId ?? FIXTURE_IDS.clinic,
    professionalId: overrides.professionalId ?? FIXTURE_IDS.professional,
    patientId: overrides.patientId ?? FIXTURE_IDS.patient,
    source: overrides.source ?? 'clinic_portal',
    status: overrides.status ?? 'scheduled',
    paymentStatus: overrides.paymentStatus ?? 'pending',
    holdId: overrides.holdId ?? FIXTURE_IDS.hold,
    holdExpiresAtUtc: overrides.holdExpiresAtUtc ?? new Date('2025-10-10T09:55:00.000Z'),
    startAtUtc: overrides.startAtUtc ?? new Date('2025-10-10T10:00:00.000Z'),
    endAtUtc: overrides.endAtUtc ?? new Date('2025-10-10T11:00:00.000Z'),
    timezone: overrides.timezone ?? 'America/Sao_Paulo',
    lateToleranceMinutes: overrides.lateToleranceMinutes ?? 15,
    recurrenceSeriesId: overrides.recurrenceSeriesId ?? null,
    cancellationReason: overrides.cancellationReason ?? null,
    pricingSplit: overrides.pricingSplit ?? null,
    preconditionsPassed: overrides.preconditionsPassed ?? true,
    anamneseRequired: overrides.anamneseRequired ?? false,
    anamneseOverrideReason: overrides.anamneseOverrideReason ?? null,
    noShowMarkedAtUtc: overrides.noShowMarkedAtUtc ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-10-09T14:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-10-09T14:00:00.000Z'),
    version: overrides.version ?? 2,
  });

  const useCases = {
    createHold: createUseCaseMock<CreateHoldUseCaseInput, BookingHold>(),
    createBooking: createUseCaseMock<CreateBookingUseCaseInput, Booking>(),
    confirmBooking: createUseCaseMock<ConfirmBookingUseCaseInput, Booking>(),
    rescheduleBooking: createUseCaseMock<RescheduleBookingUseCaseInput, Booking>(),
    cancelBooking: createUseCaseMock<CancelBookingUseCaseInput, Booking>(),
    recordPaymentStatus: createUseCaseMock<RecordPaymentStatusUseCaseInput, Booking>(),
    markNoShow: createUseCaseMock<MarkBookingNoShowUseCaseInput, Booking>(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        { provide: ICreateHoldUseCase, useValue: useCases.createHold },
        { provide: ICreateBookingUseCase, useValue: useCases.createBooking },
        { provide: IConfirmBookingUseCase, useValue: useCases.confirmBooking },
        { provide: IRescheduleBookingUseCase, useValue: useCases.rescheduleBooking },
        { provide: ICancelBookingUseCase, useValue: useCases.cancelBooking },
        { provide: IRecordPaymentStatusUseCase, useValue: useCases.recordPaymentStatus },
        { provide: IMarkBookingNoShowUseCase, useValue: useCases.markNoShow },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as new (...args: unknown[]) => JwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as new (...args: unknown[]) => RolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    Object.values(useCases).forEach((mock) => {
      mock.execute.mockClear();
      mock.executeOrThrow.mockClear();
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /scheduling/holds should create a hold', async () => {
    const hold = createHold();
    useCases.createHold.execute.mockResolvedValue({ data: hold });

    const payload = {
      clinicId: hold.clinicId,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      serviceTypeId: FIXTURE_IDS.serviceType,
      startAtUtc: hold.startAtUtc.toISOString(),
      endAtUtc: hold.endAtUtc.toISOString(),
    };

    const response = await request(app.getHttpServer())
      .post('/scheduling/holds')
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(201);

    expect(useCases.createHold.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        clinicId: hold.clinicId,
        professionalId: hold.professionalId,
        patientId: hold.patientId,
        serviceTypeId: FIXTURE_IDS.serviceType,
        startAtUtc: new Date(payload.startAtUtc),
        endAtUtc: new Date(payload.endAtUtc),
        requesterId: currentUser.id,
        requesterRole: currentUser.role,
      }),
    );
    expect(response.body).toMatchObject({
      id: hold.id,
      clinicId: hold.clinicId,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      status: hold.status,
      startAtUtc: hold.startAtUtc.toISOString(),
      endAtUtc: hold.endAtUtc.toISOString(),
      ttlExpiresAtUtc: hold.ttlExpiresAtUtc.toISOString(),
    });
  });

  it('POST /scheduling/bookings should create a booking', async () => {
    const pricingSplit = {
      totalCents: 10000,
      platformCents: 2000,
      clinicCents: 4000,
      professionalCents: 4000,
      gatewayCents: 200,
      taxesCents: 800,
      currency: 'BRL',
    };
    const booking = createBooking({ pricingSplit });
    useCases.createBooking.execute.mockResolvedValue({ data: booking });

    const payload: any = {
      holdId: booking.holdId as string,
      source: booking.source,
      timezone: booking.timezone,
      paymentStatus: booking.paymentStatus,
      lateToleranceMinutes: booking.lateToleranceMinutes,
      pricingSplit,
      preconditionsPassed: booking.preconditionsPassed,
      anamneseRequired: booking.anamneseRequired,
    };

    if (booking.recurrenceSeriesId) {
      payload.recurrenceSeriesId = booking.recurrenceSeriesId;
    }

    if (booking.anamneseOverrideReason) {
      payload.anamneseOverrideReason = booking.anamneseOverrideReason;
    }

    const response = await request(app.getHttpServer())
      .post('/scheduling/bookings')
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(201);

    expect(useCases.createBooking.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        holdId: booking.holdId,
        source: booking.source,
        timezone: booking.timezone,
        paymentStatus: booking.paymentStatus,
        lateToleranceMinutes: booking.lateToleranceMinutes,
        recurrenceSeriesId: booking.recurrenceSeriesId,
        preconditionsPassed: booking.preconditionsPassed,
        anamneseRequired: booking.anamneseRequired,
        anamneseOverrideReason: booking.anamneseOverrideReason,
        pricingSplit: expect.objectContaining({
          currency: 'BRL',
        }),
        requesterId: currentUser.id,
        requesterRole: currentUser.role,
      }),
    );
    expect(response.body).toMatchObject({
      id: booking.id,
      clinicId: booking.clinicId,
      professionalId: booking.professionalId,
      patientId: booking.patientId,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      holdId: booking.holdId,
      startAtUtc: booking.startAtUtc.toISOString(),
      endAtUtc: booking.endAtUtc.toISOString(),
      pricingSplit: payload.pricingSplit,
    });
  });

  it('POST /scheduling/bookings/:id/confirm should confirm booking', async () => {
    const booking = createBooking({ status: 'confirmed', paymentStatus: 'approved' });
    useCases.confirmBooking.execute.mockResolvedValue({ data: booking });

    const payload = {
      holdId: booking.holdId,
      paymentStatus: booking.paymentStatus,
      confirmationAtUtc: '2025-10-09T15:00:00.000Z',
    };

    const response = await request(app.getHttpServer())
      .post(`/scheduling/bookings/${booking.id}/confirm`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(200);

    expect(useCases.confirmBooking.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        bookingId: booking.id,
        holdId: booking.holdId,
        paymentStatus: booking.paymentStatus,
        confirmationAtUtc: new Date(payload.confirmationAtUtc),
      }),
    );
    expect(response.body.status).toBe('confirmed');
    expect(response.body.paymentStatus).toBe('approved');
  });

  it('POST /scheduling/bookings/:id/reschedule should reschedule booking', async () => {
    const booking = createBooking({
      status: 'scheduled',
      startAtUtc: new Date('2025-10-10T12:00:00.000Z'),
      endAtUtc: new Date('2025-10-10T13:00:00.000Z'),
    });
    useCases.rescheduleBooking.execute.mockResolvedValue({ data: booking });

    const payload = {
      expectedVersion: 2,
      newStartAtUtc: '2025-10-11T10:00:00.000Z',
      newEndAtUtc: '2025-10-11T11:00:00.000Z',
      reason: 'Paciente solicitou novo horario',
    };

    const response = await request(app.getHttpServer())
      .post(`/scheduling/bookings/${booking.id}/reschedule`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(200);

    expect(useCases.rescheduleBooking.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        bookingId: booking.id,
        expectedVersion: payload.expectedVersion,
        newStartAtUtc: new Date(payload.newStartAtUtc),
        newEndAtUtc: new Date(payload.newEndAtUtc),
        reason: payload.reason,
      }),
    );
    expect(response.body.startAtUtc).toBe(booking.startAtUtc.toISOString());
    expect(response.body.endAtUtc).toBe(booking.endAtUtc.toISOString());
  });

  it('POST /scheduling/bookings/:id/cancel should cancel booking', async () => {
    const booking = createBooking({ status: 'cancelled', cancellationReason: 'patient_request' });
    useCases.cancelBooking.execute.mockResolvedValue({ data: booking });

    const payload = {
      expectedVersion: 2,
      reason: 'patient_request',
      cancelledAtUtc: '2025-10-09T16:00:00.000Z',
    };

    const response = await request(app.getHttpServer())
      .post(`/scheduling/bookings/${booking.id}/cancel`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(200);

    expect(useCases.cancelBooking.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        bookingId: booking.id,
        expectedVersion: payload.expectedVersion,
        reason: payload.reason,
        cancelledAtUtc: new Date(payload.cancelledAtUtc),
      }),
    );
    expect(response.body.status).toBe('cancelled');
    expect(response.body.cancellationReason).toBe('patient_request');
  });

  it('PATCH /scheduling/bookings/:id/payment-status should update payment status', async () => {
    const booking = createBooking({ paymentStatus: 'settled' });
    useCases.recordPaymentStatus.execute.mockResolvedValue({ data: booking });

    const payload = {
      expectedVersion: 2,
      paymentStatus: 'settled',
    };

    const response = await request(app.getHttpServer())
      .patch(`/scheduling/bookings/${booking.id}/payment-status`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(200);

    expect(useCases.recordPaymentStatus.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        bookingId: booking.id,
        expectedVersion: payload.expectedVersion,
        paymentStatus: payload.paymentStatus,
      }),
    );
    expect(response.body.paymentStatus).toBe('settled');
  });

  it('POST /scheduling/bookings/:id/no-show should mark booking as no-show', async () => {
    const booking = createBooking({
      status: 'no_show',
      noShowMarkedAtUtc: new Date('2025-10-10T10:30:00.000Z'),
    });
    useCases.markNoShow.execute.mockResolvedValue({ data: booking });

    const payload = {
      expectedVersion: 2,
      markedAtUtc: '2025-10-10T10:30:00.000Z',
    };

    const response = await request(app.getHttpServer())
      .post(`/scheduling/bookings/${booking.id}/no-show`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(200);

    expect(useCases.markNoShow.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        bookingId: booking.id,
        expectedVersion: payload.expectedVersion,
        markedAtUtc: new Date(payload.markedAtUtc),
      }),
    );
    expect(response.body.status).toBe('no_show');
    expect(response.body.noShowMarkedAtUtc).toBe(payload.markedAtUtc);
  });
});
