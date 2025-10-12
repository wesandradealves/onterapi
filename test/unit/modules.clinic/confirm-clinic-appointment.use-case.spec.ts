import { ForbiddenException } from '@nestjs/common';

import { ConfirmClinicAppointmentUseCase } from '../../../src/modules/clinic/use-cases/confirm-clinic-appointment.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicServiceTypeRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicAppointment,
  ClinicAppointmentConfirmationResult,
  Clinic,
  ClinicHold,
  ClinicServiceTypeDefinition,
} from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

const createClinic = (): Clinic => ({
  id: 'clinic-1',
  tenantId: 'tenant-1',
  name: 'Clínica Alpha',
  slug: 'clinica-alpha',
  status: 'active',
  primaryOwnerId: 'owner-1',
  holdSettings: {
    ttlMinutes: 30,
    minAdvanceMinutes: 60,
    maxAdvanceMinutes: 240,
    allowOverbooking: false,
    overbookingThreshold: undefined,
    resourceMatchingStrict: true,
  },
  configurationVersions: {},
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
});

const createHold = (): ClinicHold => ({
  id: 'hold-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T12:00:00Z'),
  end: new Date('2099-01-01T12:30:00Z'),
  ttlExpiresAt: new Date('2099-01-01T11:45:00Z'),
  status: 'pending',
  idempotencyKey: 'create-hold-1',
  createdBy: 'user-hold',
  resources: [],
  createdAt: new Date('2098-12-31T10:00:00Z'),
  updatedAt: new Date('2098-12-31T10:00:00Z'),
});

const createServiceType = (): ClinicServiceTypeDefinition => ({
  id: 'service-1',
  clinicId: 'clinic-1',
  name: 'Sessão Individual',
  slug: 'sessao-individual',
  durationMinutes: 60,
  price: 200,
  currency: 'BRL',
  isActive: true,
  requiresAnamnesis: false,
  enableOnlineScheduling: true,
  minAdvanceMinutes: 45,
  cancellationPolicy: { type: 'percentage', windowMinutes: 120, percentage: 50 },
  eligibility: { allowNewPatients: true, allowExistingPatients: true },
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
});

const createAppointment = (): ClinicAppointment => ({
  id: 'appointment-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  holdId: 'hold-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T12:00:00Z'),
  end: new Date('2099-01-01T12:30:00Z'),
  status: 'scheduled',
  paymentStatus: 'approved',
  paymentTransactionId: 'trx-123',
  confirmedAt: new Date('2098-12-31T12:00:00Z'),
  createdAt: new Date('2098-12-31T12:00:00Z'),
  updatedAt: new Date('2098-12-31T12:00:00Z'),
  metadata: { confirmationIdempotencyKey: 'idem-123' },
});

describe('ConfirmClinicAppointmentUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let clinicHoldRepository: Mocked<IClinicHoldRepository>;
  let clinicServiceTypeRepository: Mocked<IClinicServiceTypeRepository>;
  let clinicAppointmentRepository: Mocked<IClinicAppointmentRepository>;
  let auditService: ClinicAuditService;
  let useCase: ConfirmClinicAppointmentUseCase;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    clinicHoldRepository = {
      findById: jest.fn(),
      findActiveOverlapByProfessional: jest.fn(),
      confirmHold: jest.fn(),
      expireHold: jest.fn(),
    } as unknown as Mocked<IClinicHoldRepository>;

    clinicServiceTypeRepository = {
      findById: jest.fn(),
    } as unknown as Mocked<IClinicServiceTypeRepository>;

    clinicAppointmentRepository = {
      findByHoldId: jest.fn(),
      findActiveOverlap: jest.fn(),
      create: jest.fn(),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as ClinicAuditService;

    useCase = new ConfirmClinicAppointmentUseCase(
      clinicRepository,
      clinicHoldRepository,
      clinicServiceTypeRepository,
      clinicAppointmentRepository,
      auditService,
    );
  });

  it('should confirm hold and create appointment when inputs are valid', async () => {
    const clinic = createClinic();
    const hold = createHold();
    const serviceType = createServiceType();
    const appointment = createAppointment();
    const confirmedAt = appointment.confirmedAt;

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicHoldRepository.findById.mockResolvedValue(hold);
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType);
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([]);
    clinicAppointmentRepository.findActiveOverlap.mockResolvedValue([]);
    clinicAppointmentRepository.findByHoldId.mockResolvedValue(null);
    clinicAppointmentRepository.create.mockResolvedValue(appointment);
    clinicHoldRepository.confirmHold.mockResolvedValue({
      ...hold,
      status: 'confirmed',
      confirmedAt,
      confirmedBy: 'user-hold',
      metadata: {
        confirmation: { appointmentId: appointment.id, idempotencyKey: 'idem-123' },
        paymentTransactionId: 'trx-123',
      },
    });

    const input = {
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      holdId: 'hold-1',
      confirmedBy: 'user-hold',
      paymentTransactionId: 'trx-123',
      idempotencyKey: 'idem-123',
    };

    const result = await useCase.executeOrThrow(input);

    expect(clinicAppointmentRepository.create).toHaveBeenCalledWith({
      clinicId: hold.clinicId,
      tenantId: hold.tenantId,
      holdId: hold.id,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      serviceTypeId: hold.serviceTypeId,
      start: hold.start,
      end: hold.end,
      paymentTransactionId: input.paymentTransactionId,
      paymentStatus: 'approved',
      confirmedAt: expect.any(Date),
      metadata: { confirmationIdempotencyKey: input.idempotencyKey },
    });

    expect(clinicHoldRepository.confirmHold).toHaveBeenCalledWith({
      ...input,
      confirmedAt: expect.any(Date),
      status: 'confirmed',
      appointmentId: appointment.id,
    });

    expect(result).toEqual<ClinicAppointmentConfirmationResult>({
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      holdId: appointment.holdId,
      paymentTransactionId: appointment.paymentTransactionId,
      confirmedAt: appointment.confirmedAt,
      paymentStatus: 'approved',
    });

    expect(auditService.register).toHaveBeenCalledWith({
      event: 'clinic.hold.confirmed',
      tenantId: hold.tenantId,
      clinicId: hold.clinicId,
      performedBy: input.confirmedBy,
      detail: {
        holdId: hold.id,
        appointmentId: appointment.id,
        paymentTransactionId: input.paymentTransactionId,
      },
    });
  });

  it('should reuse existing confirmation when idempotency key matches', async () => {
    const clinic = createClinic();
    const hold = {
      ...createHold(),
      status: 'confirmed' as ClinicHold['status'],
      metadata: {
        confirmation: { idempotencyKey: 'idem-xyz' },
      },
    };
    const appointment = createAppointment();

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicHoldRepository.findById.mockResolvedValue(hold);
    clinicAppointmentRepository.findByHoldId.mockResolvedValue(appointment);

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      holdId: hold.id,
      confirmedBy: 'user-hold',
      paymentTransactionId: 'trx-123',
      idempotencyKey: 'idem-xyz',
    });

    expect(clinicAppointmentRepository.create).not.toHaveBeenCalled();
    expect(clinicHoldRepository.confirmHold).not.toHaveBeenCalled();
    expect(result.appointmentId).toBe(appointment.id);
  });

  it('should expire hold and throw when TTL already elapsed', async () => {
    const clinic = createClinic();
    const hold = {
      ...createHold(),
      ttlExpiresAt: new Date('2000-01-01T00:00:00Z'),
    };

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicHoldRepository.findById.mockResolvedValue(hold);

    await expect(
      useCase.executeOrThrow({
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        holdId: hold.id,
        confirmedBy: 'user-hold',
        paymentTransactionId: 'trx-123',
        idempotencyKey: 'idem-expired',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(clinicHoldRepository.expireHold).toHaveBeenCalledWith(hold.id, expect.any(Date));
    expect(clinicAppointmentRepository.create).not.toHaveBeenCalled();
    expect(clinicHoldRepository.confirmHold).not.toHaveBeenCalled();
  });
});
