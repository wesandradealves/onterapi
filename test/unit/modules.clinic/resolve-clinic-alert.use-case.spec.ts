import { NotFoundException } from '@nestjs/common';

import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ClinicAlert } from '../../../src/domain/clinic/types/clinic.types';
import { ResolveClinicAlertUseCase } from '../../../src/modules/clinic/use-cases/resolve-clinic-alert.use-case';
import { MessageBus } from '../../../src/shared/messaging/message-bus';

describe('ResolveClinicAlertUseCase', () => {
  let clinicMetricsRepository: jest.Mocked<IClinicMetricsRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: ResolveClinicAlertUseCase;

  const alert: ClinicAlert = {
    id: 'alert-1',
    clinicId: 'clinic-a',
    tenantId: 'tenant-1',
    type: 'performance',
    channel: 'in_app',
    triggeredBy: 'user-ctx',
    triggeredAt: new Date('2025-03-01T10:00:00Z'),
    resolvedAt: null,
    resolvedBy: null,
    payload: { delta: -12 },
  };

  beforeEach(() => {
    clinicMetricsRepository = {
      findAlertById: jest.fn(),
      resolveAlert: jest.fn(),
    } as unknown as jest.Mocked<IClinicMetricsRepository>;

    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new ResolveClinicAlertUseCase(clinicMetricsRepository, messageBus);
  });

  it('resolve alerta e retorna dados atualizados', async () => {
    clinicMetricsRepository.findAlertById.mockResolvedValue(alert);
    clinicMetricsRepository.resolveAlert.mockResolvedValue({
      ...alert,
      resolvedAt: new Date('2025-03-02T08:00:00Z'),
      resolvedBy: 'user-ctx',
    });

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      alertId: 'alert-1',
      resolvedBy: 'user-ctx',
      resolvedAt: new Date('2025-03-02T08:00:00Z'),
    });

    expect(clinicMetricsRepository.resolveAlert).toHaveBeenCalledWith({
      alertId: 'alert-1',
      resolvedBy: 'user-ctx',
      resolvedAt: new Date('2025-03-02T08:00:00Z'),
    });
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(result.resolvedBy).toBe('user-ctx');
  });

  it('retorna alerta ja resolvido sem chamar update', async () => {
    clinicMetricsRepository.findAlertById.mockResolvedValue({
      ...alert,
      resolvedAt: new Date('2025-03-02T08:00:00Z'),
      resolvedBy: 'other-user',
    });

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      alertId: 'alert-1',
      resolvedBy: 'user-ctx',
    });

    expect(clinicMetricsRepository.resolveAlert).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(result.resolvedBy).toBe('other-user');
  });

  it('lanca erro quando alerta nao pertence ao tenant', async () => {
    clinicMetricsRepository.findAlertById.mockResolvedValue({ ...alert, tenantId: 'tenant-2' });

    await expect(
      useCase.executeOrThrow({ tenantId: 'tenant-1', alertId: 'alert-1', resolvedBy: 'user-ctx' }),
    ).rejects.toThrow(NotFoundException);
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('lanca erro quando alerta inexiste', async () => {
    clinicMetricsRepository.findAlertById.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        alertId: 'alert-404',
        resolvedBy: 'user-ctx',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(messageBus.publish).not.toHaveBeenCalled();
  });
});
