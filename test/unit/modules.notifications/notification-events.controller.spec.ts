import { NotificationEventsController } from '../../../src/modules/notifications/api/controllers/notification-events.controller';
import { IListNotificationEventsUseCase } from '../../../src/domain/notifications/interfaces/use-cases/list-notification-events.use-case.interface';
import { NotificationEvent } from '../../../src/domain/notifications/types/notification.types';

const createUseCaseMock = (): jest.Mocked<IListNotificationEventsUseCase> =>
  ({
    execute: jest.fn(),
    executeOrThrow: jest.fn(),
  }) as unknown as jest.Mocked<IListNotificationEventsUseCase>;

describe('NotificationEventsController', () => {
  let controller: NotificationEventsController;
  let useCase: jest.Mocked<IListNotificationEventsUseCase>;

  beforeEach(() => {
    useCase = createUseCaseMock();
    controller = new NotificationEventsController(useCase);
  });

  it('should map query params and return presenter response', async () => {
    const events: NotificationEvent[] = [
      {
        id: 'evt-1',
        eventName: 'notifications.test',
        aggregateId: 'agg-1',
        payload: { foo: 'bar' },
        recipients: ['user-1'],
        channels: ['email'],
        status: 'processed',
        queuedAt: new Date('2025-10-14T11:00:00Z'),
        processedAt: new Date('2025-10-14T11:05:00Z'),
        createdAt: new Date('2025-10-14T11:00:00Z'),
        updatedAt: new Date('2025-10-14T11:05:00Z'),
      },
    ];

    useCase.executeOrThrow.mockResolvedValue({ data: events, total: 1 });

    const result = await controller.list({
      eventName: 'notifications.test',
      status: 'processed',
      from: '2025-10-14T10:00:00Z',
      to: '2025-10-15T10:00:00Z',
      page: 2,
      limit: 5,
    } as any);

    expect(useCase.executeOrThrow).toHaveBeenCalledWith({
      eventName: 'notifications.test',
      status: 'processed',
      from: new Date('2025-10-14T10:00:00Z'),
      to: new Date('2025-10-15T10:00:00Z'),
      page: 2,
      limit: 5,
    });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('evt-1');
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
  });
});
