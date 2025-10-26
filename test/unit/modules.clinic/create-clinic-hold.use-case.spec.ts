import { ConflictException } from '@nestjs/common';

import { CreateClinicHoldUseCase } from '../../../src/modules/clinic/use-cases/create-clinic-hold.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicServiceTypeRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicProfessionalPolicyRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  Clinic,
  ClinicHold,
  ClinicInvitationEconomicSummary,
  ClinicProfessionalPolicy,
  ClinicServiceTypeDefinition,
} from '../../../src/domain/clinic/types/clinic.types';
import { ClinicOverbookingEvaluatorService } from '../../../src/modules/clinic/services/clinic-overbooking-evaluator.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { DomainEvents } from '../../../src/shared/events/domain-events';
import { IExternalCalendarEventsRepository } from '../../../src/domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';

type Mocked<T> = jest.Mocked<T>;

const buildClinic = (overrides: Partial<Clinic['holdSettings']> = {}): Clinic => ({
  id: 'clinic-1',
  tenantId: 'tenant-1',
  name: 'Clinica Uno',
  slug: 'clinica-uno',
  status: 'active',
  primaryOwnerId: 'owner-1',
  holdSettings: {
    ttlMinutes: 30,
    minAdvanceMinutes: 60,
    maxAdvanceMinutes: undefined,
    allowOverbooking: false,
    overbookingThreshold: undefined,
    resourceMatchingStrict: true,
    ...overrides,
  },
  configurationVersions: {},
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
});

const buildServiceType = (): ClinicServiceTypeDefinition => ({
  id: 'service-1',
  clinicId: 'clinic-1',
  name: 'Sessao Individual',
  slug: 'sessao-individual',
  durationMinutes: 60,
  price: 180,
  currency: 'BRL',
  isActive: true,
  requiresAnamnesis: false,
  enableOnlineScheduling: true,
  minAdvanceMinutes: 45,
  maxAdvanceMinutes: undefined,
  cancellationPolicy: { type: 'percentage', windowMinutes: 120, percentage: 50 },
  eligibility: { allowNewPatients: true, allowExistingPatients: true },
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
});

const buildHold = (): ClinicHold => ({
  id: 'hold-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T12:00:00Z'),
  end: new Date('2099-01-01T13:00:00Z'),
  ttlExpiresAt: new Date('2099-01-01T11:25:00Z'),
  status: 'pending',
  idempotencyKey: 'hold-key-1',
  createdBy: 'owner-1',
  resources: ['room-1'],
  createdAt: new Date('2098-12-31T00:00:00Z'),
  updatedAt: new Date('2098-12-31T00:00:00Z'),
});

const buildPolicy = (
  overrides: Partial<ClinicProfessionalPolicy> = {},
): ClinicProfessionalPolicy => ({
  id: 'policy-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  professionalId: 'professional-1',
  channelScope: 'both',
  economicSummary: {
    items: [
      {
        serviceTypeId: 'service-1',
        price: 180,
        currency: 'BRL',
        payoutModel: 'percentage',
        payoutValue: 50,
      },
    ],
    orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
    roundingStrategy: 'half_even',
  },
  effectiveAt: new Date('2098-12-01T00:00:00Z'),
  endedAt: undefined,
  sourceInvitationId: 'inv-1',
  acceptedBy: 'professional-1',
  createdAt: new Date('2098-12-01T00:00:00Z'),
  updatedAt: new Date('2098-12-01T00:00:00Z'),
  ...overrides,
});

describe('CreateClinicHoldUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let clinicHoldRepository: Mocked<IClinicHoldRepository>;
  let clinicServiceTypeRepository: Mocked<IClinicServiceTypeRepository>;
  let professionalPolicyRepository: Mocked<IClinicProfessionalPolicyRepository>;
  let auditService: ClinicAuditService;
  let clinicOverbookingEvaluator: Mocked<ClinicOverbookingEvaluatorService>;
  let messageBus: Mocked<MessageBus>;
  let externalCalendarEventsRepository: Mocked<IExternalCalendarEventsRepository>;
  let useCase: CreateClinicHoldUseCase;

  const baseInput = {
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    requestedBy: 'owner-1',
    professionalId: 'professional-1',
    patientId: 'patient-1',
    serviceTypeId: 'service-1',
    start: new Date('2099-01-01T12:00:00Z'),
    end: new Date('2099-01-01T13:00:00Z'),
    idempotencyKey: 'idem-1',
    locationId: 'room-1',
    resources: ['equip-1', 'equip-2'],
    channel: 'direct' as const,
  };

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    clinicHoldRepository = {
      findByIdempotencyKey: jest.fn(),
      findActiveOverlapByProfessional: jest.fn(),
      findActiveOverlapByResources: jest.fn(),
      create: jest.fn(),
      updateMetadata: jest.fn(),
    } as unknown as Mocked<IClinicHoldRepository>;

    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([]);
    clinicHoldRepository.findActiveOverlapByResources.mockResolvedValue([]);

    clinicServiceTypeRepository = {
      findById: jest.fn(),
    } as unknown as Mocked<IClinicServiceTypeRepository>;

    externalCalendarEventsRepository = {
      findApprovedOverlap: jest.fn(),
    } as unknown as Mocked<IExternalCalendarEventsRepository>;

    externalCalendarEventsRepository.findApprovedOverlap.mockResolvedValue([]);

    auditService = {
      register: jest.fn(),
    } as unknown as ClinicAuditService;

    professionalPolicyRepository = {
      findActivePolicy: jest.fn().mockResolvedValue(buildPolicy()),
      replacePolicy: jest.fn(),
    } as unknown as Mocked<IClinicProfessionalPolicyRepository>;

    clinicOverbookingEvaluator = {
      evaluate: jest.fn().mockResolvedValue({
        riskScore: 80,
        reasons: [],
        context: { averageOccupancy: 0.6, totalAppointments: 40, overlapCount: 1 },
      }),
    } as unknown as Mocked<ClinicOverbookingEvaluatorService>;

    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    clinicHoldRepository.create.mockImplementation(async (payload) => {
      const professionalPolicyMetadata =
        (payload.metadata?.professionalPolicy as Record<string, unknown> | undefined) ?? undefined;
      const effectiveAtRaw = professionalPolicyMetadata?.effectiveAt;
      const effectiveAt =
        effectiveAtRaw instanceof Date
          ? effectiveAtRaw
          : typeof effectiveAtRaw === 'string'
            ? new Date(effectiveAtRaw)
            : undefined;

      const hasValidPolicy =
        professionalPolicyMetadata &&
        typeof professionalPolicyMetadata.policyId === 'string' &&
        (professionalPolicyMetadata.channelScope === 'direct' ||
          professionalPolicyMetadata.channelScope === 'marketplace' ||
          professionalPolicyMetadata.channelScope === 'both') &&
        typeof professionalPolicyMetadata.acceptedBy === 'string' &&
        typeof professionalPolicyMetadata.sourceInvitationId === 'string' &&
        effectiveAt;

      return {
        ...buildHold(),
        clinicId: payload.clinicId,
        tenantId: payload.tenantId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        serviceTypeId: payload.serviceTypeId,
        start: payload.start,
        end: payload.end,
        ttlExpiresAt: payload.ttlExpiresAt,
        idempotencyKey: payload.idempotencyKey,
        createdBy: payload.requestedBy,
        locationId: payload.locationId ?? null,
        resources: payload.resources ?? [],
        channel:
          payload.metadata && typeof payload.metadata.channel === 'string'
            ? (payload.metadata.channel as 'direct' | 'marketplace')
            : undefined,
        professionalPolicySnapshot: hasValidPolicy
          ? {
              policyId: professionalPolicyMetadata!.policyId as string,
              channelScope: professionalPolicyMetadata!.channelScope as
                | 'direct'
                | 'marketplace'
                | 'both',
              acceptedBy: professionalPolicyMetadata!.acceptedBy as string,
              sourceInvitationId: professionalPolicyMetadata!.sourceInvitationId as string,
              effectiveAt: effectiveAt as Date,
              economicSummary: professionalPolicyMetadata!
                .economicSummary as ClinicInvitationEconomicSummary,
            }
          : undefined,
        metadata: payload.metadata,
      };
    });

    useCase = new CreateClinicHoldUseCase(
      clinicRepository,
      clinicHoldRepository,
      clinicServiceTypeRepository,
      professionalPolicyRepository,
      externalCalendarEventsRepository,
      auditService,
      messageBus,
      clinicOverbookingEvaluator,
    );
  });

  it('lanca conflito quando local ou recurso ja estao reservados', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([]);
    clinicHoldRepository.findActiveOverlapByResources.mockResolvedValue([buildHold()]);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toBeInstanceOf(ConflictException);

    expect(clinicHoldRepository.create).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
    expect(clinicOverbookingEvaluator.evaluate).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('lanca conflito quando existe evento externo aprovado no periodo', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([]);
    externalCalendarEventsRepository.findApprovedOverlap.mockResolvedValue([
      {
        id: 'event-1',
        tenantId: baseInput.tenantId,
        professionalId: baseInput.professionalId,
        source: 'google_calendar',
        externalId: 'ext-1',
        startAtUtc: new Date(baseInput.start),
        endAtUtc: new Date(baseInput.end),
        timezone: 'UTC',
        status: 'approved',
        validationErrors: null,
        resourceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toBeInstanceOf(ConflictException);

    expect(clinicHoldRepository.create).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
  });

  it('cria hold quando nao ha conflito de recursos e registra auditoria', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([]);
    clinicHoldRepository.findActiveOverlapByResources.mockResolvedValue([]);
    const result = await useCase.executeOrThrow(baseInput);

    expect(result.clinicId).toBe(baseInput.clinicId);
    expect(result.metadata?.overbooking).toBeUndefined();
    expect(professionalPolicyRepository.findActivePolicy).toHaveBeenCalledWith({
      clinicId: baseInput.clinicId,
      tenantId: baseInput.tenantId,
      professionalId: baseInput.professionalId,
    });
    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata).toEqual(
      expect.objectContaining({
        channel: 'direct',
        professionalPolicy: expect.objectContaining({ policyId: 'policy-1' }),
      }),
    );
    expect(clinicHoldRepository.findActiveOverlapByResources).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: baseInput.tenantId,
        clinicId: baseInput.clinicId,
        locationId: baseInput.locationId,
        resources: ['equip-1', 'equip-2'],
      }),
    );
    expect(clinicHoldRepository.create).toHaveBeenCalled();
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.hold.created',
        clinicId: baseInput.clinicId,
        tenantId: baseInput.tenantId,
        detail: expect.objectContaining({
          channel: 'direct',
          professionalPolicyId: 'policy-1',
        }),
      }),
    );
    expect(clinicOverbookingEvaluator.evaluate).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('bloqueia holds quando canal solicitado nao e permitido na politica', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    professionalPolicyRepository.findActivePolicy.mockResolvedValueOnce(
      buildPolicy({ channelScope: 'direct' }),
    );

    await expect(
      useCase.executeOrThrow({ ...baseInput, channel: 'marketplace' as const }),
    ).rejects.toThrow(
      'Politica clinica-profissional nao permite agendamentos pelo canal informado',
    );

    expect(clinicHoldRepository.create).not.toHaveBeenCalled();
  });

  it('bloqueia holds quando politica clinica-profissional nao for localizada', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    professionalPolicyRepository.findActivePolicy.mockResolvedValueOnce(null);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toThrow(
      'Politica clinica-profissional nao encontrada para o profissional convidado',
    );

    expect(clinicHoldRepository.create).not.toHaveBeenCalled();
    expect(clinicHoldRepository.findActiveOverlapByProfessional).not.toHaveBeenCalled();
  });

  it('bloqueia holds quando a politica nao contempla o servico selecionado', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    professionalPolicyRepository.findActivePolicy.mockResolvedValueOnce(
      buildPolicy({
        economicSummary: {
          items: [
            {
              serviceTypeId: 'service-xyz',
              price: 180,
              currency: 'BRL',
              payoutModel: 'percentage',
              payoutValue: 40,
            },
          ],
          orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
          roundingStrategy: 'half_even',
        },
      }),
    );

    await expect(useCase.executeOrThrow(baseInput)).rejects.toThrow(
      'Politica clinica-profissional nao contempla o tipo de servico selecionado',
    );

    expect(clinicHoldRepository.create).not.toHaveBeenCalled();
  });

  it('bloqueia holds quando valores economicos divergem da politica', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic());
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    professionalPolicyRepository.findActivePolicy.mockResolvedValueOnce(
      buildPolicy({
        economicSummary: {
          items: [
            {
              serviceTypeId: 'service-1',
              price: 200,
              currency: 'USD',
              payoutModel: 'percentage',
              payoutValue: 40,
            },
          ],
          orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
          roundingStrategy: 'half_even',
        },
      }),
    );

    await expect(useCase.executeOrThrow(baseInput)).rejects.toThrow(
      'Politica clinica-profissional divergente dos precos configurados para o servico',
    );

    expect(clinicHoldRepository.create).not.toHaveBeenCalled();
  });

  it('marca overbooking como pendente quando risco abaixo do limiar', async () => {
    clinicRepository.findByTenant.mockResolvedValue(
      buildClinic({ allowOverbooking: true, overbookingThreshold: 75 }),
    );
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([buildHold()]);
    clinicHoldRepository.findActiveOverlapByResources.mockResolvedValue([]);
    clinicOverbookingEvaluator.evaluate.mockResolvedValue({
      riskScore: 60,
      reasons: ['low_occupancy'],
      context: { averageOccupancy: 0.5, totalAppointments: 30, overlapCount: 1 },
    });

    const result = await useCase.executeOrThrow(baseInput);

    expect(clinicOverbookingEvaluator.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: baseInput.tenantId,
        clinicId: baseInput.clinicId,
        overlaps: 1,
      }),
    );
    expect(result.metadata?.overbooking).toEqual(
      expect.objectContaining({
        status: 'pending_review',
        riskScore: 60,
        requiresManualApproval: true,
      }),
    );
    const events = auditService.register.mock.calls.map((call) => call[0].event);
    expect(events).toContain('clinic.hold.created');
    expect(events).toContain('clinic.overbooking.review_requested');
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const [reviewEvent] = messageBus.publish.mock.calls[0];
    expect(reviewEvent.eventName).toBe(DomainEvents.CLINIC_OVERBOOKING_REVIEW_REQUESTED);
    expect(reviewEvent.aggregateId).toBe(result.id);
  });

  it('marca overbooking como aprovado automaticamente quando risco acima do limiar', async () => {
    clinicRepository.findByTenant.mockResolvedValue(
      buildClinic({ allowOverbooking: true, overbookingThreshold: 65 }),
    );
    clinicHoldRepository.findByIdempotencyKey.mockResolvedValue(null);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValue([buildHold()]);
    clinicHoldRepository.findActiveOverlapByResources.mockResolvedValue([]);
    clinicOverbookingEvaluator.evaluate.mockResolvedValue({
      riskScore: 88,
      reasons: ['low_occupancy'],
      context: { averageOccupancy: 0.4, totalAppointments: 45, overlapCount: 1 },
    });

    const result = await useCase.executeOrThrow(baseInput);

    expect(result.metadata?.overbooking).toEqual(
      expect.objectContaining({
        status: 'approved',
        riskScore: 88,
        autoApproved: true,
      }),
    );
    const events = auditService.register.mock.calls.map((call) => call[0].event);
    expect(events).toContain('clinic.hold.created');
    expect(events).not.toContain('clinic.overbooking.review_requested');
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const [approvedEvent] = messageBus.publish.mock.calls[0];
    expect(approvedEvent.eventName).toBe(DomainEvents.CLINIC_OVERBOOKING_REVIEWED);
    expect(approvedEvent.aggregateId).toBe(result.id);
    expect(approvedEvent.payload).toEqual(
      expect.objectContaining({
        status: 'approved',
        autoApproved: true,
      }),
    );
  });
});
