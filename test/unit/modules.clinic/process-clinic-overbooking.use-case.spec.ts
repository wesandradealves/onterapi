import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ProcessClinicOverbookingUseCase } from '../../../src/modules/clinic/use-cases/process-clinic-overbooking.use-case';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicHold } from '../../../src/domain/clinic/types/clinic.types';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

const buildHold = (overbookingStatus: 'pending_review' | 'approved' | 'rejected'): ClinicHold => ({
  id: 'hold-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T12:00:00Z'),
  end: new Date('2099-01-01T13:00:00Z'),
  ttlExpiresAt: new Date('2099-01-01T11:30:00Z'),
  status: 'pending',
  idempotencyKey: 'hold-key',
  createdBy: 'owner-1',
  resources: [],
  createdAt: new Date('2098-12-31T00:00:00Z'),
  updatedAt: new Date('2098-12-31T00:00:00Z'),
  metadata: {
    overbooking: {
      status: overbookingStatus,
      riskScore: 68,
      threshold: 70,
      evaluatedAt: '2098-12-31T00:00:00.000Z',
      reasons: ['low_occupancy'],
      context: { averageOccupancy: 0.5, totalAppointments: 24, overlapCount: 1 },
      requiresManualApproval: overbookingStatus === 'pending_review',
    },
  },
});

describe('ProcessClinicOverbookingUseCase', () => {
  let clinicHoldRepository: Mocked<IClinicHoldRepository>;
  let auditService: ClinicAuditService;
  let messageBus: Mocked<MessageBus>;
  let useCase: ProcessClinicOverbookingUseCase;

  const baseInput = {
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    performedBy: 'manager-1',
    holdId: 'hold-1',
    justification: 'dados insuficientes',
  };

  beforeEach(() => {
    clinicHoldRepository = {
      findById: jest.fn(),
      updateMetadata: jest.fn(),
      cancelHold: jest.fn(),
    } as unknown as Mocked<IClinicHoldRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as ClinicAuditService;

    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    useCase = new ProcessClinicOverbookingUseCase(clinicHoldRepository, auditService, messageBus);
  });

  it('aprova overbooking pendente e registra auditoria', async () => {
    const pendingHold = buildHold('pending_review');
    clinicHoldRepository.findById.mockResolvedValue(pendingHold);
    clinicHoldRepository.updateMetadata.mockImplementation(async ({ metadata }) => ({
      ...pendingHold,
      metadata,
    }));

    const result = await useCase.executeOrThrow({ ...baseInput, approve: true });

    expect(result.metadata?.overbooking).toEqual(
      expect.objectContaining({
        status: 'approved',
        reviewedBy: baseInput.performedBy,
        justification: baseInput.justification,
      }),
    );
    expect(clinicHoldRepository.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        holdId: pendingHold.id,
      }),
    );
    expect(clinicHoldRepository.cancelHold).not.toHaveBeenCalled();
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.overbooking.approved',
        clinicId: baseInput.clinicId,
        tenantId: baseInput.tenantId,
      }),
    );
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const [approvedEvent] = messageBus.publish.mock.calls[0];
    expect(approvedEvent.eventName).toBe(DomainEvents.CLINIC_OVERBOOKING_REVIEWED);
    expect(approvedEvent.payload).toEqual(
      expect.objectContaining({
        status: 'approved',
        justification: baseInput.justification,
      }),
    );
  });

  it('rejeita overbooking pendente cancelando o hold', async () => {
    const pendingHold = buildHold('pending_review');
    clinicHoldRepository.findById.mockResolvedValue(pendingHold);
    clinicHoldRepository.updateMetadata.mockImplementation(async ({ metadata }) => ({
      ...pendingHold,
      metadata,
    }));
    clinicHoldRepository.cancelHold.mockResolvedValue({
      ...pendingHold,
      status: 'cancelled',
    });

    const result = await useCase.executeOrThrow({ ...baseInput, approve: false });

    expect(result.status).toBe('cancelled');
    expect(result.metadata?.overbooking).toEqual(
      expect.objectContaining({
        status: 'rejected',
        justification: baseInput.justification,
      }),
    );
    expect(clinicHoldRepository.cancelHold).toHaveBeenCalledWith(
      expect.objectContaining({
        holdId: pendingHold.id,
        cancelledBy: baseInput.performedBy,
      }),
    );
    const events = auditService.register.mock.calls.map((call) => call[0].event);
    expect(events).toContain('clinic.overbooking.rejected');
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const [rejectedEvent] = messageBus.publish.mock.calls[0];
    expect(rejectedEvent.eventName).toBe(DomainEvents.CLINIC_OVERBOOKING_REVIEWED);
    expect(rejectedEvent.payload).toEqual(
      expect.objectContaining({
        status: 'rejected',
        justification: baseInput.justification,
      }),
    );
  });

  it('lança erro quando hold não existe', async () => {
    clinicHoldRepository.findById.mockResolvedValue(null);

    await expect(useCase.executeOrThrow({ ...baseInput, approve: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('lança erro quando sobreaviso já foi processado', async () => {
    const approvedHold = buildHold('approved');
    clinicHoldRepository.findById.mockResolvedValue(approvedHold);

    await expect(useCase.executeOrThrow({ ...baseInput, approve: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(messageBus.publish).not.toHaveBeenCalled();
  });
});
