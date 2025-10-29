import { NotificationEventLogService } from '../../../src/modules/notifications/notification-event-log.service';
import { INotificationEventRepository } from '../../../src/domain/notifications/interfaces/notification-event.repository.interface';

const createRepositoryMock = (): jest.Mocked<INotificationEventRepository> =>
  ({
    create: jest.fn(),
    updateStatus: jest.fn(),
  }) as unknown as jest.Mocked<INotificationEventRepository>;

describe('NotificationEventLogService', () => {
  it('records notification events using repository', async () => {
    const repository = createRepositoryMock();
    const service = new NotificationEventLogService(repository);

    repository.create.mockResolvedValue({
      id: 'event-1',
      eventName: 'notifications.test',
      aggregateId: 'agg-1',
      payload: {},
      recipients: ['user-1'],
      channels: ['email'],
      status: 'queued',
      queuedAt: new Date('2025-10-14T12:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const input = {
      eventName: 'notifications.test',
      aggregateId: 'agg-1',
      payload: { foo: 'bar' },
      recipients: ['user-1'],
      channels: ['email'],
      queuedAt: new Date('2025-10-14T12:00:00Z'),
    };

    const result = await service.record(input);

    expect(repository.create).toHaveBeenCalledWith(input);
    expect(result.eventName).toBe('notifications.test');
  });
});
