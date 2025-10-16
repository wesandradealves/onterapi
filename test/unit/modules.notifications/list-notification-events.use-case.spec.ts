import { ListNotificationEventsUseCase } from '../../../src/modules/notifications/use-cases/list-notification-events.use-case';
import type { INotificationEventRepository } from '../../../src/domain/notifications/interfaces/notification-event.repository.interface';
import type { NotificationEvent } from '../../../src/domain/notifications/types/notification.types';

describe('ListNotificationEventsUseCase', () => {
  let repository: jest.Mocked<INotificationEventRepository>;
  let useCase: ListNotificationEventsUseCase;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      updateStatus: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<INotificationEventRepository>;

    useCase = new ListNotificationEventsUseCase(repository);
  });

  it('should delegate listing to repository', async () => {
    const events: NotificationEvent[] = [
      {
        id: 'evt-1',
        eventName: 'notifications.test',
        aggregateId: 'agg-1',
        payload: {},
        recipients: ['user-1'],
        channels: ['email'],
        status: 'queued',
        queuedAt: new Date('2025-10-14T10:00:00Z'),
        processedAt: undefined,
        createdAt: new Date('2025-10-14T10:00:00Z'),
        updatedAt: new Date('2025-10-14T10:00:00Z'),
      },
    ];

    repository.findAll.mockResolvedValue({ data: events, total: 1 });

    const result = await useCase.executeOrThrow({
      eventName: 'notifications.test',
      limit: 10,
      page: 1,
    });

    expect(repository.findAll).toHaveBeenCalledWith({
      eventName: 'notifications.test',
      limit: 10,
      page: 1,
    });
    expect(result.total).toBe(1);
    expect(result.data).toEqual(events);
  });
});
