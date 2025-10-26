import { ClinicOverbookingNotificationService } from '../../../src/modules/clinic/services/clinic-overbooking-notification.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { ClinicNotificationContextService } from '../../../src/modules/clinic/services/clinic-notification-context.service';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IEmailService } from '../../../src/domain/auth/interfaces/services/email.service.interface';
import { IWhatsAppService } from '../../../src/domain/integrations/interfaces/services/whatsapp.service.interface';
import { IPushNotificationService } from '../../../src/domain/integrations/interfaces/services/push-notification.service.interface';
import {
  ClinicOverbookingReviewedEvent,
  ClinicOverbookingReviewRequestedEvent,
} from '../../../src/modules/clinic/services/clinic-overbooking-event.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

const buildReviewRequestedEvent = (): ClinicOverbookingReviewRequestedEvent =>
  ({
    eventId: 'evt-1',
    eventName: DomainEvents.CLINIC_OVERBOOKING_REVIEW_REQUESTED,
    aggregateId: 'hold-1',
    occurredOn: new Date('2099-01-01T12:00:00Z'),
    metadata: {},
    payload: {
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      patientId: 'patient-1',
      serviceTypeId: 'service-1',
      riskScore: 62,
      threshold: 70,
      reasons: ['low_occupancy'],
      context: { averageOccupancy: 0.5 },
      requestedBy: 'user-1',
      requestedAt: new Date('2099-01-01T11:58:00Z'),
      autoApproved: false,
    },
  }) as ClinicOverbookingReviewRequestedEvent;

const buildReviewOutcomeEvent = (status: 'approved' | 'rejected'): ClinicOverbookingReviewedEvent =>
  ({
    eventId: `evt-${status}`,
    eventName: DomainEvents.CLINIC_OVERBOOKING_REVIEWED,
    aggregateId: 'hold-1',
    occurredOn: new Date('2099-01-01T12:05:00Z'),
    metadata: {},
    payload: {
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      patientId: 'patient-1',
      serviceTypeId: 'service-1',
      riskScore: 62,
      threshold: 70,
      status,
      reviewedBy: 'manager-1',
      reviewedAt: new Date('2099-01-01T12:04:00Z'),
      justification: status === 'rejected' ? 'Risco elevado' : undefined,
      reasons: ['low_occupancy'],
      context: { averageOccupancy: 0.5 },
      autoApproved: status === 'approved',
      requestedBy: 'user-1',
      requestedAt: new Date('2099-01-01T11:58:00Z'),
    },
  }) as ClinicOverbookingReviewedEvent;

describe('ClinicOverbookingNotificationService', () => {
  let messageBus: Mocked<MessageBus>;
  let notificationContext: Mocked<ClinicNotificationContextService>;
  let clinicRepository: Mocked<IClinicRepository>;
  let emailService: Mocked<IEmailService>;
  let pushNotificationService: Mocked<IPushNotificationService>;
  let whatsappService: Mocked<IWhatsAppService>;
  let service: ClinicOverbookingNotificationService;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    notificationContext = {
      resolveRecipients: jest.fn().mockResolvedValue(['professional-1']),
      resolveNotificationSettings: jest.fn().mockResolvedValue(null),
      resolveChannels: jest.fn().mockReturnValue(['system']),
      normalizeDispatchChannels: jest.fn((channels: string[]) => {
        if (!Array.isArray(channels)) {
          return [];
        }

        const normalized: string[] = [];

        for (const entry of channels) {
          if (typeof entry !== 'string') {
            continue;
          }

          const trimmed = entry.trim().toLowerCase();
          const mapped = trimmed === 'system' ? 'push' : trimmed;

          if (!normalized.includes(mapped)) {
            normalized.push(mapped);
          }
        }

        return normalized;
      }),
      resolveRecipientEmails: jest
        .fn()
        .mockResolvedValue([{ userId: 'professional-1', email: 'pro@example.com' }]),
      resolveRecipientPhones: jest
        .fn()
        .mockResolvedValue([{ userId: 'professional-1', phone: '+5511999999999' }]),
      resolveRecipientPushTokens: jest
        .fn()
        .mockResolvedValue([{ userId: 'professional-1', tokens: ['push-token-1'] }]),
      resolveWhatsAppSettings: jest.fn().mockResolvedValue(null),
      removeInvalidPushTokens: jest.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<ClinicNotificationContextService>;

    clinicRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'clinic-1', name: 'Clinica XPTO' } as any),
    } as unknown as Mocked<IClinicRepository>;

    emailService = {
      sendClinicOverbookingEmail: jest.fn().mockResolvedValue({ data: undefined }),
    } as unknown as Mocked<IEmailService>;

    pushNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({ data: { rejectedTokens: [] } }),
    } as unknown as Mocked<IPushNotificationService>;

    whatsappService = {
      sendMessage: jest.fn().mockResolvedValue({ data: undefined }),
    } as unknown as Mocked<IWhatsAppService>;

    messageBus.publish.mockResolvedValue(undefined);

    service = new ClinicOverbookingNotificationService(
      messageBus,
      notificationContext,
      clinicRepository,
      emailService,
      pushNotificationService,
      whatsappService,
    );
  });
  it('publica evento de notificacao para revisao pendente', async () => {
    await service.notifyReviewRequested(buildReviewRequestedEvent());

    expect(notificationContext.resolveRecipients).toHaveBeenCalled();
    expect(notificationContext.resolveChannels).toHaveBeenCalledWith(
      expect.objectContaining({ eventKey: 'clinic.overbooking.review_requested' }),
    );
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const event = messageBus.publish.mock.calls[0][0];
    expect(event.eventName).toBe(DomainEvents.NOTIFICATION_CLINIC_OVERBOOKING_REVIEW_REQUESTED);
    expect(event.payload.status).toBe('pending_review');
    expect(event.payload.channels).toEqual(['push']);
    expect(emailService.sendClinicOverbookingEmail).not.toHaveBeenCalled();
  });

  it('envia email quando canal email esta habilitado para revisao pendente', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce(['system', 'email']);

    await service.notifyReviewRequested(buildReviewRequestedEvent());

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(pushNotificationService.sendNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicOverbookingEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicOverbookingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'review_requested',
        holdId: 'hold-1',
        clinicName: 'Clinica XPTO',
      }),
    );
  });
  it('envia whatsapp quando canal habilitado', async () => {
    notificationContext.resolveChannels.mockReset();
    notificationContext.resolveChannels.mockImplementation(() => ['system', 'whatsapp']);
    notificationContext.resolveWhatsAppSettings.mockResolvedValueOnce({ enabled: true });
    notificationContext.resolveRecipientPhones.mockResolvedValueOnce([
      {
        userId: 'professional-1',
        phone: '+5511988887777',
      },
    ]);

    await service.notifyReviewRequested(buildReviewRequestedEvent());

    expect(notificationContext.resolveChannels).toHaveBeenCalledTimes(1);
    expect(notificationContext.resolveChannels.mock.results[0].value).toEqual([
      'system',
      'whatsapp',
    ]);
    expect(pushNotificationService.sendNotification).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    const payload = whatsappService.sendMessage.mock.calls[0][0];
    expect(payload.to).toMatch(/^\+\d{10,15}$/);
    expect(typeof payload.body).toBe('string');

    notificationContext.resolveChannels.mockImplementation(() => ['system']);
  });

  it('remove tokens rejeitados apos notificacao de overbooking', async () => {
    pushNotificationService.sendNotification.mockResolvedValueOnce({
      data: { rejectedTokens: ['push-token-1'] },
    });

    await service.notifyReviewRequested(buildReviewRequestedEvent());

    expect(notificationContext.removeInvalidPushTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        rejectedTokens: ['push-token-1'],
        scope: 'clinic-overbooking',
      }),
    );
  });

  it('publica evento e envia email para resultado de revisao', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce(['system', 'email']);

    await service.notifyReviewOutcome(buildReviewOutcomeEvent('approved'));

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const event = messageBus.publish.mock.calls[0][0];
    expect(event.eventName).toBe(DomainEvents.NOTIFICATION_CLINIC_OVERBOOKING_REVIEWED);
    expect(event.payload.status).toBe('approved');
    expect(event.payload.channels).toEqual(['push', 'email']);
    expect(pushNotificationService.sendNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicOverbookingEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicOverbookingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        holdId: 'hold-1',
      }),
    );
  });

  it('nao publica quando nao ha destinatarios', async () => {
    notificationContext.resolveRecipients.mockResolvedValueOnce([]);

    const event = buildReviewOutcomeEvent('rejected');
    event.payload.reviewedBy = undefined as unknown as string;
    event.payload.requestedBy = undefined;

    await service.notifyReviewOutcome(event);

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(emailService.sendClinicOverbookingEmail).not.toHaveBeenCalled();
    expect(pushNotificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('nao publica quando nenhum canal esta disponivel', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce([]);

    await service.notifyReviewRequested(buildReviewRequestedEvent());

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(emailService.sendClinicOverbookingEmail).not.toHaveBeenCalled();
    expect(pushNotificationService.sendNotification).not.toHaveBeenCalled();
  });
});
