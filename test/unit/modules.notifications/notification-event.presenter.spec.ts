import { NotificationEventPresenter } from '../../../src/modules/notifications/api/presenters/notification-event.presenter';
import { NotificationEvent } from '../../../src/domain/notifications/types/notification.types';

describe('NotificationEventPresenter', () => {
  const baseEvent: NotificationEvent = {
    id: 'evt-1',
    eventName: 'clinic.payment.settled',
    aggregateId: 'pay-1',
    payload: { amount: 12000 },
    recipients: ['user-1@example.com'],
    channels: ['email'],
    status: 'queued',
    queuedAt: new Date('2025-10-12T10:00:00Z'),
    createdAt: new Date('2025-10-12T10:00:00Z'),
    updatedAt: new Date('2025-10-12T10:00:00Z'),
  };

  it('formats queued events without processed timestamp', () => {
    const dto = NotificationEventPresenter.toDto(baseEvent);

    expect(dto.processedAt).toBeUndefined();
    expect(dto.queuedAt).toBe('2025-10-12T10:00:00.000Z');
  });

  it('formats processed events with processed timestamp', () => {
    const processed: NotificationEvent = {
      ...baseEvent,
      id: 'evt-processed',
      status: 'processed',
      processedAt: new Date('2025-10-12T12:00:00Z'),
      updatedAt: new Date('2025-10-12T12:00:00Z'),
    };

    const dto = NotificationEventPresenter.toDto(processed);

    expect(dto.status).toBe('processed');
    expect(dto.processedAt).toBe('2025-10-12T12:00:00.000Z');
  });

  it('builds paginated list response', () => {
    const events = [
      baseEvent,
      {
        ...baseEvent,
        id: 'evt-2',
        eventName: 'clinic.alert.triggered',
        aggregateId: 'alert-1',
      },
    ];

    const list = NotificationEventPresenter.list(events, 2, 1, 25);

    expect(list.total).toBe(2);
    expect(list.page).toBe(1);
    expect(list.limit).toBe(25);
    expect(list.data).toHaveLength(2);
    expect(list.data[1].eventName).toBe('clinic.alert.triggered');
  });
});
