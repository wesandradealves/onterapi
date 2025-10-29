import { ClinicCoverageNotificationService } from '../../../src/modules/clinic/services/clinic-coverage-notification.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { ClinicNotificationContextService } from '../../../src/modules/clinic/services/clinic-notification-context.service';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IPushNotificationService } from '../../../src/domain/integrations/interfaces/services/push-notification.service.interface';
import { IWhatsAppService } from '../../../src/domain/integrations/interfaces/services/whatsapp.service.interface';
import {
  ClinicCoverageAppliedEvent,
  ClinicCoverageReleasedEvent,
} from '../../../src/modules/clinic/services/clinic-coverage-event.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

describe('ClinicCoverageNotificationService', () => {
  let messageBus: Mocked<MessageBus>;
  let notificationContext: Mocked<ClinicNotificationContextService>;
  let clinicRepository: Mocked<IClinicRepository>;
  let pushNotificationService: Mocked<IPushNotificationService>;
  let whatsappService: Mocked<IWhatsAppService>;
  let service: ClinicCoverageNotificationService;

  const startAt = new Date('2025-02-01T09:00:00.000Z');
  const endAt = new Date('2025-02-01T18:00:00.000Z');
  const reference = new Date('2025-02-01T19:00:00.000Z');

  const buildAppliedEvent = (): ClinicCoverageAppliedEvent =>
    DomainEvents.clinicCoverageApplied('coverage-1', {
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      originalProfessionalId: 'professional-owner',
      coverageProfessionalId: 'professional-coverage',
      startAt,
      endAt,
      triggerSource: 'manual',
      triggeredBy: 'manager-1',
      triggeredAt: new Date('2025-01-31T18:00:00.000Z'),
      summary: { clinicHolds: 1, schedulingHolds: 2, bookings: 3, appointments: 4 },
    }) as ClinicCoverageAppliedEvent;

  const buildReleasedEvent = (): ClinicCoverageReleasedEvent =>
    DomainEvents.clinicCoverageReleased('coverage-2', {
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      originalProfessionalId: 'professional-owner',
      coverageProfessionalId: 'professional-coverage',
      reference,
      triggerSource: 'automatic',
      triggeredBy: 'system:worker',
      triggeredAt: new Date('2025-02-01T19:05:00.000Z'),
      summary: { clinicHolds: 0, schedulingHolds: 1, bookings: 1, appointments: 1 },
    }) as ClinicCoverageReleasedEvent;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<MessageBus>;
    notificationContext = {
      resolveRecipients: jest.fn(),
      resolveNotificationSettings: jest.fn(),
      resolveChannels: jest.fn(),
      normalizeDispatchChannels: jest.fn(),
      resolveRecipientPushTokens: jest.fn(),
      removeInvalidPushTokens: jest.fn(),
      resolveRecipientPhones: jest.fn(),
    } as unknown as Mocked<ClinicNotificationContextService>;
    clinicRepository = {
      findById: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;
    pushNotificationService = {
      sendNotification: jest.fn(),
    } as unknown as Mocked<IPushNotificationService>;
    whatsappService = {
      sendMessage: jest.fn(),
    } as unknown as Mocked<IWhatsAppService>;

    service = new ClinicCoverageNotificationService(
      messageBus,
      notificationContext,
      clinicRepository,
      pushNotificationService,
      whatsappService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ignora processamento quando nenhum canal está habilitado', async () => {
    notificationContext.resolveRecipients.mockResolvedValue([]);
    notificationContext.resolveNotificationSettings.mockResolvedValue({});
    notificationContext.resolveChannels.mockReturnValue([]);
    notificationContext.normalizeDispatchChannels.mockReturnValue([]);

    await service.notifyCoverageApplied(buildAppliedEvent());

    expect(notificationContext.resolveRecipients).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
    });
    expect(notificationContext.resolveNotificationSettings).toHaveBeenCalled();
    expect(pushNotificationService.sendNotification).not.toHaveBeenCalled();
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('dispara push e WhatsApp e publica evento ao aplicar cobertura', async () => {
    notificationContext.resolveRecipients.mockResolvedValue(['manager-1']);
    notificationContext.resolveNotificationSettings.mockResolvedValue({});
    notificationContext.resolveChannels.mockReturnValue(['push', 'whatsapp']);
    notificationContext.normalizeDispatchChannels.mockReturnValue(['push', 'whatsapp']);
    notificationContext.resolveRecipientPushTokens.mockResolvedValue([
      { recipientId: 'professional-owner', tokens: ['valid-token', 'expired-token'] },
      { recipientId: 'manager-1', tokens: ['manager-token'] },
    ]);
    notificationContext.resolveRecipientPhones.mockResolvedValue([
      { recipientId: 'professional-owner', phone: '+5511999999999' },
      { recipientId: 'manager-1', phone: '+5511888888888' },
    ]);
    pushNotificationService.sendNotification.mockResolvedValue({
      data: { rejectedTokens: ['expired-token'] },
    });
    whatsappService.sendMessage.mockResolvedValue({ data: undefined });
    clinicRepository.findById.mockResolvedValue({
      id: 'clinic-1',
      name: 'Clinica OnTerapi',
    } as any);

    await service.notifyCoverageApplied(buildAppliedEvent());

    expect(notificationContext.resolveRecipients).toHaveBeenCalledTimes(1);
    expect(notificationContext.resolveNotificationSettings).toHaveBeenCalledWith(
      'tenant-1',
      'clinic-1',
    );
    expect(notificationContext.resolveRecipientPushTokens).toHaveBeenCalledWith([
      'professional-coverage',
      'professional-owner',
      'manager-1',
    ]);
    expect(pushNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['valid-token', 'expired-token', 'manager-token'],
        category: 'clinic_coverage',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
      }),
    );
    expect(notificationContext.removeInvalidPushTokens).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      recipients: [
        { recipientId: 'professional-owner', tokens: ['valid-token', 'expired-token'] },
        { recipientId: 'manager-1', tokens: ['manager-token'] },
      ],
      rejectedTokens: ['expired-token'],
      scope: 'clinic-coverage',
    });
    expect(notificationContext.resolveRecipientPhones).toHaveBeenCalledWith([
      'professional-coverage',
      'professional-owner',
      'manager-1',
    ]);
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(2);
    const whatsappPayload = whatsappService.sendMessage.mock.calls[0][0];
    expect(whatsappPayload.body).toContain('Cobertura ativada em Clinica OnTerapi.');
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const event = messageBus.publish.mock.calls[0][0];
    expect(event.eventName).toBe(DomainEvents.NOTIFICATION_CLINIC_COVERAGE_APPLIED);
    expect(event.payload.channels).toEqual(['push', 'whatsapp']);
    expect(event.payload.recipientIds.sort()).toEqual(
      ['professional-coverage', 'professional-owner', 'manager-1'].sort(),
    );
    expect(event.payload.summary).toEqual({
      clinicHolds: 1,
      schedulingHolds: 2,
      bookings: 3,
      appointments: 4,
    });
  });

  it('envia apenas WhatsApp e publica evento ao liberar cobertura', async () => {
    notificationContext.resolveRecipients.mockResolvedValue(['manager-1']);
    notificationContext.resolveNotificationSettings.mockResolvedValue({});
    notificationContext.resolveChannels.mockReturnValue(['whatsapp']);
    notificationContext.normalizeDispatchChannels.mockReturnValue(['whatsapp']);
    notificationContext.resolveRecipientPhones.mockResolvedValue([
      { recipientId: 'professional-owner', phone: '+5511999999999' },
    ]);
    clinicRepository.findById.mockResolvedValue({
      id: 'clinic-1',
      name: 'Clinica OnTerapi',
    } as any);
    whatsappService.sendMessage.mockResolvedValue({ data: undefined });

    await service.notifyCoverageReleased(buildReleasedEvent());

    expect(pushNotificationService.sendNotification).not.toHaveBeenCalled();
    expect(notificationContext.resolveRecipientPushTokens).not.toHaveBeenCalled();
    expect(notificationContext.resolveRecipientPhones).toHaveBeenCalledWith([
      'professional-coverage',
      'professional-owner',
      'manager-1',
    ]);
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    const event = messageBus.publish.mock.calls[0][0];
    expect(event.eventName).toBe(DomainEvents.NOTIFICATION_CLINIC_COVERAGE_RELEASED);
    expect(event.payload.channels).toEqual(['whatsapp']);
    expect(event.payload.reference).toEqual(reference);
  });
});
