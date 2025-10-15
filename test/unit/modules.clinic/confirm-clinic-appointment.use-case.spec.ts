import { ForbiddenException } from '@nestjs/common';

import { ConfirmClinicAppointmentUseCase } from '../../../src/modules/clinic/use-cases/confirm-clinic-appointment.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicServiceTypeRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IClinicPaymentCredentialsService } from '../../../src/domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { IClinicPaymentGatewayService } from '../../../src/domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  Clinic,
  ClinicAppointment,
  ClinicAppointmentConfirmationResult,
  ClinicHold,
  ClinicServiceTypeDefinition,
} from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

const createClinic = (): Clinic => ({
  id: 'clinic-1',
  tenantId: 'tenant-1',
  name: 'Clinica Alpha',
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
  name: 'Sessao Individual',
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
  let clinicConfigurationRepository: Mocked<IClinicConfigurationRepository>;
  let clinicPaymentCredentialsService: Mocked<IClinicPaymentCredentialsService>;
  let clinicPaymentGatewayService: Mocked<IClinicPaymentGatewayService>;
  let auditService: ClinicAuditService;
  let useCase: ConfirmClinicAppointmentUseCase;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    clinicHoldRepository = {
      findById: jest.fn(),
      findActiveOverlapByProfessional: jest.fn(),
      findActiveOverlapByResources: jest.fn(),
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

    clinicConfigurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    clinicPaymentCredentialsService = {
      resolveCredentials: jest.fn(),
    } as unknown as Mocked<IClinicPaymentCredentialsService>;

    clinicPaymentGatewayService = {
      verifyPayment: jest.fn(),
    } as unknown as Mocked<IClinicPaymentGatewayService>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as ClinicAuditService;

    useCase = new ConfirmClinicAppointmentUseCase(
      clinicRepository,
      clinicHoldRepository,
      clinicServiceTypeRepository,
      clinicAppointmentRepository,
      clinicConfigurationRepository,
      clinicPaymentCredentialsService,
      clinicPaymentGatewayService,
      auditService,
    );
  });

  it('should confirm hold and create appointment when inputs are valid', async () => {
    const clinic = createClinic();
    const hold = createHold();
    const serviceType = createServiceType();
    const appointment = createAppointment();
    const confirmedAt = appointment.confirmedAt;

    const paymentVersion = {
      id: 'version-1',
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
      section: 'payments' as const,
      version: 1,
      payload: {
        paymentSettings: {
          provider: 'asaas',
          credentialsId: 'cred-1',
          sandboxMode: false,
          splitRules: [],
          roundingStrategy: 'half_even',
          antifraud: { enabled: false },
          inadimplencyRule: { gracePeriodDays: 0, actions: [] },
          refundPolicy: {
            type: 'manual',
            processingTimeHours: 0,
            allowPartialRefund: false,
          },
          cancellationPolicies: [],
        },
      },
      createdBy: 'user-config',
      createdAt: new Date('2098-01-01T00:00:00Z'),
      appliedAt: new Date('2098-01-02T00:00:00Z'),
      notes: null,
      autoApply: true,
    };

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicHoldRepository.findById.mockResolvedValue(hold);
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType);
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([]);
    clinicAppointmentRepository.findActiveOverlap.mockResolvedValue([]);
    clinicAppointmentRepository.findByHoldId.mockResolvedValue(null);
    clinicConfigurationRepository.findLatestAppliedVersion.mockResolvedValue(
      paymentVersion as never,
    );
    clinicPaymentCredentialsService.resolveCredentials.mockResolvedValue({
      provider: 'asaas',
      productionApiKey: 'api-key',
      sandboxApiKey: 'sandbox-key',
    });
    clinicPaymentGatewayService.verifyPayment.mockResolvedValue({
      status: 'approved',
      providerStatus: 'RECEIVED',
      paidAt: confirmedAt,
      metadata: { provider: 'asaas' },
    });
    clinicAppointmentRepository.create.mockResolvedValue(appointment);
    clinicHoldRepository.confirmHold.mockResolvedValue({
      ...hold,
      status: 'confirmed',
      confirmedAt,
      confirmedBy: 'user-hold',
      metadata: {
        confirmation: {
          appointmentId: appointment.id,
          idempotencyKey: 'idem-123',
          paymentStatus: 'approved',
          gatewayStatus: 'RECEIVED',
        },
        paymentTransactionId: 'trx-123',
        paymentStatus: 'approved',
        gatewayStatus: 'RECEIVED',
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

    expect(clinicConfigurationRepository.findLatestAppliedVersion).toHaveBeenCalledWith(
      clinic.id,
      'payments',
    );
    expect(clinicPaymentCredentialsService.resolveCredentials).toHaveBeenCalledWith({
      credentialsId: 'cred-1',
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
    });
    expect(clinicPaymentGatewayService.verifyPayment).toHaveBeenCalledWith({
      provider: 'asaas',
      credentials: {
        provider: 'asaas',
        productionApiKey: 'api-key',
        sandboxApiKey: 'sandbox-key',
      },
      sandboxMode: false,
      paymentId: input.paymentTransactionId,
    });

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
      metadata: {
        confirmationIdempotencyKey: input.idempotencyKey,
        gatewayStatus: 'RECEIVED',
        sandboxMode: false,
      },
    });

    expect(clinicHoldRepository.confirmHold).toHaveBeenCalledWith({
      ...input,
      confirmedAt: expect.any(Date),
      status: 'confirmed',
      appointmentId: appointment.id,
      paymentStatus: 'approved',
      gatewayStatus: 'RECEIVED',
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
        paymentStatus: 'approved',
        gatewayStatus: 'RECEIVED',
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
    expect(clinicConfigurationRepository.findLatestAppliedVersion).not.toHaveBeenCalled();
    expect(clinicPaymentCredentialsService.resolveCredentials).not.toHaveBeenCalled();
    expect(clinicPaymentGatewayService.verifyPayment).not.toHaveBeenCalled();
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
    expect(clinicConfigurationRepository.findLatestAppliedVersion).not.toHaveBeenCalled();
    expect(clinicPaymentCredentialsService.resolveCredentials).not.toHaveBeenCalled();
    expect(clinicPaymentGatewayService.verifyPayment).not.toHaveBeenCalled();
  });
});
