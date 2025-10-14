import { ClinicAlertNotificationService } from '../../../src/modules/clinic/services/clinic-alert-notification.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import type { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import type { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import type { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IUserRepository } from '../../../src/domain/users/interfaces/repositories/user.repository.interface';
import type { IEmailService } from '../../../src/domain/auth/interfaces/services/email.service.interface';
import type {
  ClinicAlertResolvedEvent,
  ClinicAlertTriggeredEvent,
} from '../../../src/modules/clinic/services/clinic-alert-event.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';

const createMessageBusMock = (): jest.Mocked<MessageBus> =>
  ({
    publish: jest.fn(),
    publishMany: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }) as unknown as jest.Mocked<MessageBus>;

const createMemberRepositoryMock = (): jest.Mocked<IClinicMemberRepository> =>
  ({
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    findActiveByClinicAndUser: jest.fn(),
    transferProfessional: jest.fn(),
    listMembers: jest.fn(),
    countByRole: jest.fn(),
    hasQuotaAvailable: jest.fn(),
  }) as unknown as jest.Mocked<IClinicMemberRepository>;

const createConfigRepositoryMock = (): jest.Mocked<IClinicConfigurationRepository> =>
  ({
    findLatestAppliedVersion: jest.fn(),
    findVersionById: jest.fn(),
    listVersions: jest.fn(),
    createVersion: jest.fn(),
    applyVersion: jest.fn(),
    deleteVersion: jest.fn(),
  }) as unknown as jest.Mocked<IClinicConfigurationRepository>;

const createClinicRepositoryMock = (): jest.Mocked<IClinicRepository> =>
  ({
    create: jest.fn(),
    findById: jest.fn(),
    findByTenant: jest.fn(),
    findBySlug: jest.fn(),
    findByIds: jest.fn(),
    list: jest.fn(),
    updateHoldSettings: jest.fn(),
    updateStatus: jest.fn(),
    updatePrimaryOwner: jest.fn(),
    setCurrentConfigurationVersion: jest.fn(),
    updateConfigurationTelemetry: jest.fn(),
    updateGeneralProfile: jest.fn(),
    updateTemplatePropagationMetadata: jest.fn(),
    updateTemplateOverrideMetadata: jest.fn(),
    existsByDocument: jest.fn(),
  }) as unknown as jest.Mocked<IClinicRepository>;

const createUserRepositoryMock = (): jest.Mocked<IUserRepository> =>
  ({
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findBySupabaseId: jest.fn(),
    findByEmail: jest.fn(),
    findByCpf: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    checkUniqueness: jest.fn(),
  }) as unknown as jest.Mocked<IUserRepository>;

const createEmailServiceMock = (): jest.Mocked<IEmailService> =>
  ({
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendTwoFactorCode: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendSuspiciousLoginAlert: jest.fn(),
    sendLoginAlertEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
    sendClinicAlertEmail: jest.fn(),
    sendTwoFactorCodeEmail: jest.fn(),
    sendSuspiciousLoginEmail: jest.fn(),
  }) as unknown as jest.Mocked<IEmailService>;

describe('ClinicAlertNotificationService', () => {
  let messageBus: jest.Mocked<MessageBus>;
  let memberRepository: jest.Mocked<IClinicMemberRepository>;
  let configRepository: jest.Mocked<IClinicConfigurationRepository>;
  let clinicRepository: jest.Mocked<IClinicRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let service: ClinicAlertNotificationService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-10-14T10:00:00Z'));

    messageBus = createMessageBusMock();
    messageBus.publish.mockResolvedValue(undefined);
    memberRepository = createMemberRepositoryMock();
    configRepository = createConfigRepositoryMock();
    clinicRepository = createClinicRepositoryMock();
    userRepository = createUserRepositoryMock();
    emailService = createEmailServiceMock();
    emailService.sendClinicAlertEmail.mockResolvedValue({ data: undefined });

    memberRepository.listMembers.mockResolvedValue({
      data: [
        {
          id: 'member-1',
          clinicId: 'clinic-1',
          tenantId: 'tenant-1',
          userId: 'owner-1',
          role: 'CLINIC_OWNER',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          scope: [],
        },
        {
          id: 'member-2',
          clinicId: 'clinic-1',
          tenantId: 'tenant-1',
          userId: 'manager-1',
          role: 'MANAGER',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          scope: [],
        },
      ],
      total: 2,
    });

    configRepository.findLatestAppliedVersion.mockResolvedValue({
      id: 'version-1',
      clinicId: 'clinic-1',
      section: 'notifications',
      version: 3,
      payload: {
        notificationSettings: {
          channels: [
            { type: 'email', enabled: true, defaultEnabled: true },
            { type: 'push', enabled: true, defaultEnabled: true },
          ],
          rules: [
            { event: 'clinic.alert.triggered', enabled: true, channels: ['email'] },
            { event: 'clinic.alert.resolved', enabled: true, channels: ['email'] },
          ],
        },
      },
      createdBy: 'user-1',
      createdAt: new Date(),
      autoApply: true,
    } as any);

    clinicRepository.findById.mockResolvedValue({
      id: 'clinic-1',
      tenantId: 'tenant-1',
      name: 'Clinica Onterapi Centro',
    } as any);

    userRepository.findById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@onterapi.com`,
      isActive: true,
    })) as any;

    service = new ClinicAlertNotificationService(
      messageBus,
      memberRepository,
      configRepository,
      clinicRepository,
      userRepository,
      emailService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should publish notification event and send emails when alert is triggered', async () => {
    const triggeredEvent: ClinicAlertTriggeredEvent = {
      eventId: 'evt-1',
      eventName: DomainEvents.CLINIC_ALERT_TRIGGERED,
      aggregateId: 'alert-1',
      occurredOn: new Date(),
      payload: {
        alertId: 'alert-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        type: 'revenue_drop',
        channel: 'push',
        triggeredBy: 'owner-1',
        triggeredAt: new Date('2025-10-14T10:00:00Z'),
        payload: { delta: -18.4 },
      },
      metadata: { correlationId: 'corr-1' },
    };

    await service.notifyAlertTriggered(triggeredEvent);

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const [event] = messageBus.publish.mock.calls[0];
    expect(event.eventName).toBe(DomainEvents.NOTIFICATION_CLINIC_ALERT_TRIGGERED);
    expect(event.payload.recipientIds.sort()).toEqual(['manager-1', 'owner-1']);

    expect(emailService.sendClinicAlertEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendClinicAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner-1@onterapi.com',
        clinicName: 'Clinica Onterapi Centro',
        alertType: 'revenue_drop',
        status: 'triggered',
      }),
    );
  });

  it('should suppress emails during quiet hours but still publish event', async () => {
    configRepository.findLatestAppliedVersion.mockResolvedValueOnce({
      id: 'version-quiet',
      clinicId: 'clinic-1',
      section: 'notifications',
      version: 4,
      payload: {
        notificationSettings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              defaultEnabled: true,
              quietHours: { start: '08:00', end: '12:00', timezone: 'UTC' },
            },
          ],
          rules: [{ event: 'clinic.alert.triggered', enabled: true, channels: ['email'] }],
        },
      },
      createdBy: 'user-1',
      createdAt: new Date(),
      autoApply: true,
    } as any);

    const triggeredEvent: ClinicAlertTriggeredEvent = {
      eventId: 'evt-quiet',
      eventName: DomainEvents.CLINIC_ALERT_TRIGGERED,
      aggregateId: 'alert-quiet',
      occurredOn: new Date(),
      payload: {
        alertId: 'alert-quiet',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        type: 'compliance',
        channel: 'push',
        triggeredBy: 'manager-1',
        triggeredAt: new Date('2025-10-14T09:30:00Z'),
        payload: { missingDocs: 3 },
      },
      metadata: { correlationId: 'corr-q' },
    };

    await service.notifyAlertTriggered(triggeredEvent);

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicAlertEmail).not.toHaveBeenCalled();
  });

  it('should publish resolved event and send emails when channel remaining enabled', async () => {
    const resolvedEvent: ClinicAlertResolvedEvent = {
      eventId: 'evt-2',
      eventName: DomainEvents.CLINIC_ALERT_RESOLVED,
      aggregateId: 'alert-2',
      occurredOn: new Date(),
      payload: {
        alertId: 'alert-2',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        type: 'compliance',
        channel: 'push',
        resolvedBy: 'manager-1',
        resolvedAt: new Date('2025-10-14T12:00:00Z'),
        triggeredAt: new Date('2025-10-14T09:00:00Z'),
        triggeredBy: 'owner-1',
        payload: { documentsRestored: true },
      },
      metadata: { correlationId: 'corr-2' },
    };

    await service.notifyAlertResolved(resolvedEvent);

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const [resolvedNotification] = messageBus.publish.mock.calls[0];
    expect(resolvedNotification.eventName).toBe(DomainEvents.NOTIFICATION_CLINIC_ALERT_RESOLVED);
    expect(emailService.sendClinicAlertEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendClinicAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'resolved',
        resolvedBy: 'manager-1',
      }),
    );
  });

  it('should skip email dispatch when rules disable the event', async () => {
    configRepository.findLatestAppliedVersion.mockResolvedValueOnce({
      id: 'version-disabled',
      clinicId: 'clinic-1',
      section: 'notifications',
      version: 5,
      payload: {
        notificationSettings: {
          channels: [{ type: 'email', enabled: true, defaultEnabled: true }],
          rules: [{ event: 'clinic.alert.triggered', enabled: false, channels: ['email'] }],
        },
      },
      createdBy: 'user-1',
      createdAt: new Date(),
      autoApply: true,
    } as any);

    const triggeredEvent: ClinicAlertTriggeredEvent = {
      eventId: 'evt-disabled',
      eventName: DomainEvents.CLINIC_ALERT_TRIGGERED,
      aggregateId: 'alert-disabled',
      occurredOn: new Date(),
      payload: {
        alertId: 'alert-disabled',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        type: 'low_occupancy',
        channel: 'push',
        triggeredBy: 'owner-1',
        triggeredAt: new Date('2025-10-14T10:00:00Z'),
        payload: {},
      },
      metadata: { correlationId: 'corr-disabled' },
    };

    await service.notifyAlertTriggered(triggeredEvent);

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicAlertEmail).not.toHaveBeenCalled();
  });
});
