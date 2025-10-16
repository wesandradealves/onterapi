import { NotFoundException } from '@nestjs/common';

import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { Clinic } from '../../../src/domain/clinic/types/clinic.types';
import { TriggerClinicAlertUseCase } from '../../../src/modules/clinic/use-cases/trigger-clinic-alert.use-case';
import { MessageBus } from '../../../src/shared/messaging/message-bus';

describe('TriggerClinicAlertUseCase', () => {
  let clinicRepository: jest.Mocked<IClinicRepository>;
  let clinicMetricsRepository: jest.Mocked<IClinicMetricsRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: TriggerClinicAlertUseCase;

  const clinic: Clinic = {
    id: 'clinic-a',
    tenantId: 'tenant-1',
    name: 'Clinic A',
    slug: 'clinic-a',
    status: 'active',
    configurationVersions: {},
    holdSettings: undefined,
    metadata: {},
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    document: undefined,
    primaryOwnerId: 'owner-1',
  } as Clinic;

  beforeEach(() => {
    clinicRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IClinicRepository>;

    clinicMetricsRepository = {
      recordAlert: jest.fn(),
    } as unknown as jest.Mocked<IClinicMetricsRepository>;

    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new TriggerClinicAlertUseCase(clinicRepository, clinicMetricsRepository, messageBus);
  });

  it('gera alerta e publica evento', async () => {
    clinicRepository.findById.mockResolvedValue(clinic);

    const createdAlert = {
      id: 'alert-1',
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
      type: 'performance',
      channel: 'in_app',
      triggeredBy: 'user-ctx',
      triggeredAt: new Date('2025-03-10T12:00:00Z'),
      resolvedAt: null,
      resolvedBy: null,
      payload: { delta: -20 },
    };

    clinicMetricsRepository.recordAlert.mockResolvedValue(createdAlert);

    const input = {
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
      type: 'performance',
      channel: 'in_app',
      triggeredBy: 'user-ctx',
      payload: { delta: -20 },
    };

    const result = await useCase.executeOrThrow(input);

    expect(clinicMetricsRepository.recordAlert).toHaveBeenCalledWith(input);
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(result).toEqual(createdAlert);
  });

  it('lanca erro quando clinica nao pertence ao tenant', async () => {
    clinicRepository.findById.mockResolvedValue({ ...clinic, tenantId: 'tenant-2' });

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: clinic.id,
        type: 'performance',
        channel: 'in_app',
        triggeredBy: 'user-ctx',
        payload: {},
      }),
    ).rejects.toThrow(NotFoundException);
    expect(clinicMetricsRepository.recordAlert).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });
});
