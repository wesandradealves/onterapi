import { Inject, Injectable, Logger } from '@nestjs/common';

import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import {
  ClinicMemberStatus,
  ClinicNotificationChannelConfig,
  ClinicNotificationSettingsConfig,
  ClinicStaffRole,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { ClinicAlertResolvedEvent, ClinicAlertTriggeredEvent } from './clinic-alert-event.types';

const RECIPIENT_ROLES: ClinicStaffRole[] = [RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER];
const ACTIVE_STATUS: ClinicMemberStatus[] = ['active'];

const ALERT_TRIGGER_EVENT = 'clinic.alert.triggered';
const ALERT_RESOLVE_EVENT = 'clinic.alert.resolved';

const DEFAULT_FALLBACK_CHANNEL: string = 'email';

type NotificationContext = {
  settings: ClinicNotificationSettingsConfig | null;
  clinicName: string;
};

@Injectable()
export class ClinicAlertNotificationService {
  private readonly logger = new Logger(ClinicAlertNotificationService.name);

  constructor(
    private readonly messageBus: MessageBus,
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly clinicConfigurationRepository: IClinicConfigurationRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
  ) {}

  async notifyAlertTriggered(event: ClinicAlertTriggeredEvent): Promise<void> {
    const { aggregateId, payload } = event;
    const triggeredAt = this.normalizeDate(payload.triggeredAt);

    const [recipientIds, context] = await Promise.all([
      this.resolveRecipients(payload.tenantId, payload.clinicId),
      this.resolveNotificationContext(payload.tenantId, payload.clinicId),
    ]);

    await this.messageBus.publish(
      DomainEvents.notificationsClinicAlertTriggered(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        type: String(payload.type),
        channel: String(payload.channel),
        triggeredBy: payload.triggeredBy,
        triggeredAt,
        payload: payload.payload ?? {},
        recipientIds,
      }),
    );

    await this.dispatchAlertEmail({
      eventKey: ALERT_TRIGGER_EVENT,
      context,
      recipientIds,
      payload: {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        alertType: String(payload.type),
        channel: String(payload.channel),
        triggeredBy: payload.triggeredBy,
        triggeredAt,
        details: payload.payload ?? {},
        status: 'triggered',
      },
    });

    this.logger.debug('Dispatching clinic alert triggered notifications', {
      alertId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      type: payload.type,
      channel: payload.channel,
      recipients: recipientIds,
    });
  }

  async notifyAlertResolved(event: ClinicAlertResolvedEvent): Promise<void> {
    const { aggregateId, payload } = event;
    const resolvedAt = this.normalizeDate(payload.resolvedAt);

    const [recipientIds, context] = await Promise.all([
      this.resolveRecipients(payload.tenantId, payload.clinicId),
      this.resolveNotificationContext(payload.tenantId, payload.clinicId),
    ]);

    await this.messageBus.publish(
      DomainEvents.notificationsClinicAlertResolved(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        type: String(payload.type),
        channel: payload.channel ? String(payload.channel) : undefined,
        resolvedBy: payload.resolvedBy,
        resolvedAt,
        triggeredAt: payload.triggeredAt ? this.normalizeDate(payload.triggeredAt) : undefined,
        triggeredBy: payload.triggeredBy,
        payload: payload.payload ?? {},
        recipientIds,
      }),
    );

    await this.dispatchAlertEmail({
      eventKey: ALERT_RESOLVE_EVENT,
      context,
      recipientIds,
      payload: {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        alertType: String(payload.type),
        channel: payload.channel ? String(payload.channel) : undefined,
        triggeredBy: payload.triggeredBy,
        triggeredAt: this.normalizeDate(payload.triggeredAt ?? payload.resolvedAt),
        resolvedBy: payload.resolvedBy,
        resolvedAt,
        details: payload.payload ?? {},
        status: 'resolved',
      },
    });

    this.logger.debug('Dispatching clinic alert resolved notifications', {
      alertId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      type: payload.type,
      recipients: recipientIds,
    });
  }

  private async dispatchAlertEmail(input: {
    eventKey: string;
    context: NotificationContext;
    recipientIds: string[];
    payload: {
      tenantId: string;
      clinicId: string;
      alertType: string;
      channel?: string;
      triggeredBy?: string;
      triggeredAt: Date;
      resolvedBy?: string;
      resolvedAt?: Date;
      details: Record<string, unknown>;
      status: 'triggered' | 'resolved';
    };
  }): Promise<void> {
    const { context, payload, eventKey } = input;
    const channels = this.selectChannels(context.settings, eventKey);

    if (!channels.includes('email')) {
      return;
    }

    if (!this.isChannelEnabled(context.settings, 'email')) {
      this.logger.debug('Email channel disabled for clinic alert notifications', {
        clinicId: payload.clinicId,
        tenantId: payload.tenantId,
        eventKey,
      });
      return;
    }

    if (
      this.isInQuietHours(payload.triggeredAt, 'email', context.settings) &&
      payload.status === 'triggered'
    ) {
      this.logger.debug('Alert email suppressed due to quiet hours', {
        clinicId: payload.clinicId,
        tenantId: payload.tenantId,
        eventKey,
      });
      return;
    }

    const recipients = await this.resolveRecipientEmails(input.recipientIds);

    if (recipients.length === 0) {
      this.logger.warn('Nenhum email encontrado para destinatarios do alerta', {
        clinicId: payload.clinicId,
        tenantId: payload.tenantId,
      });
      return;
    }

    await Promise.all(
      recipients.map(async (recipient) => {
        const result = await this.emailService.sendClinicAlertEmail({
          to: recipient.email,
          clinicName: context.clinicName,
          alertType: payload.alertType,
          status: payload.status,
          triggeredAt: payload.triggeredAt,
          resolvedAt: payload.resolvedAt,
          triggeredBy: payload.triggeredBy,
          resolvedBy: payload.resolvedBy,
          channel: payload.channel,
          payload: payload.details,
        });

        if (result.error) {
          this.logger.error('Falha ao enviar email de alerta da clinica', result.error, {
            clinicId: payload.clinicId,
            tenantId: payload.tenantId,
            recipient: recipient.email,
            eventKey,
          });
        }
      }),
    );
  }

  private async resolveNotificationContext(
    tenantId: string,
    clinicId: string,
  ): Promise<NotificationContext> {
    const [settings, clinic] = await Promise.all([
      this.loadNotificationSettings(clinicId),
      this.clinicRepository.findById(clinicId),
    ]);

    const clinicName =
      clinic && clinic.tenantId === tenantId ? (clinic.name ?? clinicId) : clinicId;

    return {
      settings,
      clinicName,
    };
  }

  private async loadNotificationSettings(
    clinicId: string,
  ): Promise<ClinicNotificationSettingsConfig | null> {
    const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
      clinicId,
      'notifications',
    );

    if (!version || !version.payload || typeof version.payload !== 'object') {
      return null;
    }

    const payload = version.payload as Record<string, unknown>;
    const raw =
      payload.notificationSettings && typeof payload.notificationSettings === 'object'
        ? (payload.notificationSettings as Record<string, unknown>)
        : payload;

    const settings = this.castNotificationSettings(raw);
    return settings ?? null;
  }

  private castNotificationSettings(
    raw: Record<string, unknown>,
  ): ClinicNotificationSettingsConfig | undefined {
    if (!raw) {
      return undefined;
    }

    const channels = Array.isArray(raw.channels) ? raw.channels : [];
    const templates = Array.isArray(raw.templates) ? raw.templates : [];
    const rules = Array.isArray(raw.rules) ? raw.rules : [];

    return {
      channels: channels as ClinicNotificationSettingsConfig['channels'],
      templates: templates as ClinicNotificationSettingsConfig['templates'],
      rules: rules as ClinicNotificationSettingsConfig['rules'],
      quietHours:
        raw.quietHours && typeof raw.quietHours === 'object'
          ? (raw.quietHours as ClinicNotificationSettingsConfig['quietHours'])
          : undefined,
      events: Array.isArray(raw.events) ? (raw.events as string[]) : undefined,
      metadata:
        raw.metadata && typeof raw.metadata === 'object'
          ? (raw.metadata as Record<string, unknown>)
          : undefined,
    };
  }

  private selectChannels(
    settings: ClinicNotificationSettingsConfig | null,
    eventKey: string,
  ): string[] {
    if (!settings) {
      return [DEFAULT_FALLBACK_CHANNEL];
    }

    if (settings.events && !settings.events.includes(eventKey)) {
      return [];
    }

    const matchingRules = settings.rules?.filter((rule) => rule.event === eventKey) ?? [];
    const eligibleRules = matchingRules.filter((rule) => rule.enabled !== false);

    if (matchingRules.length > 0 && eligibleRules.length === 0) {
      return [];
    }

    if (eligibleRules.length > 0) {
      const channels = new Set<string>();
      eligibleRules.forEach((rule) => {
        (rule.channels ?? []).forEach((channel) => channels.add(String(channel)));
      });
      return Array.from(channels);
    }

    const defaults =
      settings.channels
        ?.filter((channel) => channel.defaultEnabled)
        .map((channel) => String(channel.type)) ?? [];

    if (defaults.length > 0) {
      return Array.from(new Set(defaults));
    }

    return [DEFAULT_FALLBACK_CHANNEL];
  }

  private isChannelEnabled(
    settings: ClinicNotificationSettingsConfig | null,
    channel: string,
  ): boolean {
    if (!settings) {
      return channel === DEFAULT_FALLBACK_CHANNEL;
    }

    const config = this.findChannelConfig(settings, channel);
    if (!config) {
      return false;
    }

    return config.enabled !== false;
  }

  private findChannelConfig(
    settings: ClinicNotificationSettingsConfig,
    channel: string,
  ): ClinicNotificationChannelConfig | undefined | null {
    return settings.channels?.find((config) => String(config.type) === channel);
  }

  private async resolveRecipients(tenantId: string, clinicId: string): Promise<string[]> {
    const { data } = await this.clinicMemberRepository.listMembers({
      clinicId,
      tenantId,
      roles: RECIPIENT_ROLES,
      status: ACTIVE_STATUS,
      limit: 100,
      page: 1,
    });

    const recipients = new Set<string>();

    data.forEach((member) => {
      if (member.userId) {
        recipients.add(member.userId);
      }
    });

    if (recipients.size === 0) {
      this.logger.warn('Nenhum destinatario ativo encontrado para alerta da clinica', {
        tenantId,
        clinicId,
      });
    }

    return Array.from(recipients);
  }

  private async resolveRecipientEmails(userIds: string[]): Promise<Array<{ email: string }>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) {
      return [];
    }

    const users = await Promise.all(uniqueIds.map((id) => this.userRepository.findById(id)));

    const emails: Array<{ email: string }> = [];
    users.forEach((user) => {
      if (user && user.email && user.isActive !== false) {
        emails.push({ email: user.email });
      }
    });

    return emails;
  }

  private isInQuietHours(
    date: Date,
    channel: string,
    settings: ClinicNotificationSettingsConfig | null,
  ): boolean {
    if (!settings) {
      return false;
    }

    const channelConfig = this.findChannelConfig(settings, channel);
    if (channelConfig?.quietHours && this.matchesQuietHours(date, channelConfig.quietHours)) {
      return true;
    }

    if (settings.quietHours && this.matchesQuietHours(date, settings.quietHours)) {
      return true;
    }

    return false;
  }

  private matchesQuietHours(
    date: Date,
    quietHours: { start: string; end: string; timezone?: string } | undefined,
  ): boolean {
    if (!quietHours || !quietHours.start || !quietHours.end) {
      return false;
    }

    const target = this.convertToTimezone(date, quietHours.timezone ?? 'UTC');
    const minutes = target.getHours() * 60 + target.getMinutes();
    const start = this.parseTimeToMinutes(quietHours.start);
    const end = this.parseTimeToMinutes(quietHours.end);

    if (start === undefined || end === undefined) {
      return false;
    }

    if (start <= end) {
      return minutes >= start && minutes < end;
    }

    return minutes >= start || minutes < end;
  }

  private convertToTimezone(date: Date, timezone: string): Date {
    try {
      const locale = date.toLocaleString('en-US', { timeZone: timezone });
      return new Date(locale);
    } catch {
      return date;
    }
  }

  private parseTimeToMinutes(value: string): number | undefined {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) {
      return undefined;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return undefined;
    }

    return hours * 60 + minutes;
  }

  private normalizeDate(value: unknown): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }
}
