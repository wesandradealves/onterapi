import { Inject, Injectable, Logger } from '@nestjs/common';

import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import {
  ClinicMemberStatus,
  ClinicNotificationChannelConfig,
  ClinicNotificationSettingsConfig,
  ClinicStaffRole,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

const DEFAULT_ROLES: ClinicStaffRole[] = [RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER];
const DEFAULT_STATUS: ClinicMemberStatus[] = ['active'];
const DEFAULT_CHANNEL_FALLBACK = ['system'];

export type ClinicWhatsAppIntegrationSettings = {
  enabled: boolean;
  provider?: string;
  businessNumber?: string;
  quietHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
  templates?: Array<{
    name: string;
    status?: string;
  }>;
};

interface ResolveRecipientsParams {
  tenantId: string;
  clinicId: string;
  roles?: ClinicStaffRole[];
  statuses?: ClinicMemberStatus[];
  includeProfessionalId?: string;
  limit?: number;
}

interface ResolveChannelsParams {
  settings: ClinicNotificationSettingsConfig | null;
  eventKey: string;
  eventDate: Date;
  fallbackChannels?: string[];
  logScope?: string;
}

interface QuietHoursConfig {
  start: string;
  end: string;
  timezone?: string;
}

@Injectable()
export class ClinicNotificationContextService {
  private readonly logger = new Logger(ClinicNotificationContextService.name);

  constructor(
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly clinicConfigurationRepository: IClinicConfigurationRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly auditService: ClinicAuditService,
  ) {}

  async resolveRecipients(params: ResolveRecipientsParams): Promise<string[]> {
    const uniqueRecipients = new Set<string>();

    if (params.includeProfessionalId) {
      uniqueRecipients.add(params.includeProfessionalId);
    }

    const { data } = await this.clinicMemberRepository.listMembers({
      clinicId: params.clinicId,
      tenantId: params.tenantId,
      status: params.statuses ?? DEFAULT_STATUS,
      roles: params.roles ?? DEFAULT_ROLES,
      limit: params.limit ?? 100,
    });

    for (const member of data) {
      if (member.userId) {
        uniqueRecipients.add(member.userId);
      }
    }

    return Array.from(uniqueRecipients);
  }

  async resolveNotificationSettings(
    tenantId: string,
    clinicId: string,
  ): Promise<ClinicNotificationSettingsConfig | null> {
    try {
      const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
        clinicId,
        'notifications',
      );

      if (!version) {
        return null;
      }

      const payload = version.payload ?? {};
      const settings =
        payload && typeof payload === 'object' && 'notificationSettings' in payload
          ? (payload as Record<string, unknown>).notificationSettings
          : payload;

      if (!settings || typeof settings !== 'object') {
        return null;
      }

      return this.castNotificationSettings(settings as Record<string, unknown>);
    } catch (error) {
      this.logger.error(
        'Falha ao carregar configuracoes de notificacoes da clinica',
        error as Error,
        { tenantId, clinicId },
      );
      return null;
    }
  }

  async resolveWhatsAppSettings(
    clinicId: string,
  ): Promise<ClinicWhatsAppIntegrationSettings | null> {
    try {
      const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
        clinicId,
        'integrations',
      );

      if (!version) {
        return null;
      }

      const payload = version.payload ?? {};
      const integrationRoot =
        payload && typeof payload === 'object' && 'integrationSettings' in payload
          ? (payload as Record<string, unknown>).integrationSettings
          : payload;

      const whatsappSection =
        integrationRoot && typeof integrationRoot === 'object' && 'whatsapp' in integrationRoot
          ? (integrationRoot as Record<string, unknown>).whatsapp
          : integrationRoot;

      if (!whatsappSection || typeof whatsappSection !== 'object') {
        return null;
      }

      const raw = whatsappSection as Record<string, unknown>;
      const templates = Array.isArray(raw.templates) ? raw.templates : [];

      return {
        enabled: raw.enabled === true,
        provider: typeof raw.provider === 'string' ? raw.provider : undefined,
        businessNumber: typeof raw.businessNumber === 'string' ? raw.businessNumber : undefined,
        quietHours:
          raw.quietHours && typeof raw.quietHours === 'object'
            ? (raw.quietHours as { start: string; end: string; timezone?: string })
            : undefined,
        templates: templates
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const reference = item as Record<string, unknown>;
            return {
              name: typeof reference.name === 'string' ? reference.name : '',
              status: typeof reference.status === 'string' ? reference.status : undefined,
            };
          }),
      };
    } catch (error) {
      this.logger.error('Falha ao carregar integracao WhatsApp da clinica', error as Error, {
        clinicId,
      });
      return null;
    }
  }

  resolveChannels(params: ResolveChannelsParams): string[] {
    const fallback = params.fallbackChannels ?? DEFAULT_CHANNEL_FALLBACK;
    const selectedChannels = this.selectChannels(params.settings, params.eventKey, fallback);

    if (selectedChannels.length === 0) {
      return [];
    }

    const filtered = selectedChannels.filter((channel) => {
      if (channel === 'system') {
        return true;
      }

      if (this.isInQuietHours(params.eventDate, channel, params.settings)) {
        this.logger.debug('Canal suprimido por quiet hours', {
          channel,
          event: params.eventKey,
          scope: params.logScope ?? 'clinic-notifications',
        });
        return false;
      }

      if (!this.isChannelEnabled(params.settings, channel)) {
        this.logger.debug('Canal desabilitado para notificacoes da clinica', {
          channel,
          event: params.eventKey,
          scope: params.logScope ?? 'clinic-notifications',
        });
        return false;
      }

      return true;
    });

    return filtered;
  }

  normalizeDispatchChannels(channels: string[]): string[] {
    if (!Array.isArray(channels) || channels.length === 0) {
      return [];
    }

    const normalized: string[] = [];

    for (const entry of channels) {
      if (typeof entry !== 'string') {
        continue;
      }

      const trimmed = entry.trim();
      if (trimmed.length === 0) {
        continue;
      }

      const lower = trimmed.toLowerCase();
      const mapped = lower === 'system' ? 'push' : lower;

      if (!normalized.includes(mapped)) {
        normalized.push(mapped);
      }
    }

    return normalized;
  }

  async resolveRecipientEmails(
    userIds: string[],
  ): Promise<Array<{ userId: string; email: string }>> {
    const contacts = await this.resolveRecipientContacts(userIds);
    return contacts
      .filter((contact) => Boolean(contact.email))
      .map((contact) => ({ userId: contact.userId, email: contact.email as string }));
  }

  async resolveRecipientPhones(
    userIds: string[],
  ): Promise<Array<{ userId: string; phone: string }>> {
    const contacts = await this.resolveRecipientContacts(userIds);
    return contacts
      .filter((contact) => Boolean(contact.phone))
      .map((contact) => ({ userId: contact.userId, phone: contact.phone as string }));
  }

  async resolveRecipientPushTokens(
    userIds: string[],
  ): Promise<Array<{ userId: string; tokens: string[] }>> {
    const contacts = await this.resolveRecipientContacts(userIds);

    return contacts
      .map((contact) => ({
        userId: contact.userId,
        tokens:
          Array.isArray(contact.pushTokens) && contact.pushTokens.length > 0
            ? contact.pushTokens
            : [],
      }))
      .filter((entry) => entry.tokens.length > 0);
  }

  async removeInvalidPushTokens(params: {
    tenantId: string;
    clinicId: string;
    recipients: Array<{ userId: string; tokens?: string[] }>;
    rejectedTokens: string[];
    scope?: string;
  }): Promise<void> {
    const rejected = new Set(
      (params.rejectedTokens ?? [])
        .filter((token): token is string => typeof token === 'string')
        .map((token) => token.trim())
        .filter((token) => token.length > 0),
    );

    if (rejected.size === 0) {
      return;
    }

    const scope = params.scope ?? 'clinic-notifications';

    for (const recipient of params.recipients) {
      if (!recipient.userId) {
        continue;
      }

      const recipientTokens = (recipient.tokens ?? [])
        .filter((token): token is string => typeof token === 'string')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

      const tokensToRemove = recipientTokens.filter((token) => rejected.has(token));

      if (tokensToRemove.length === 0) {
        continue;
      }

      try {
        const user = await this.userRepository.findById(recipient.userId);

        if (!user) {
          this.logger.warn(`${scope}: usuario nao encontrado ao remover tokens push`, {
            tenantId: params.tenantId,
            clinicId: params.clinicId,
            userId: recipient.userId,
            tokens: tokensToRemove.length,
          });
          continue;
        }

        const existingTokens = this.extractPushTokens(user);
        if (existingTokens.length === 0) {
          continue;
        }

        const filteredTokens = existingTokens.filter((token) => !rejected.has(token));
        if (filteredTokens.length === existingTokens.length) {
          continue;
        }

        const metadata =
          user.metadata && typeof user.metadata === 'object'
            ? { ...(user.metadata as Record<string, unknown>) }
            : ({} as Record<string, unknown>);

        const notification =
          metadata.notification && typeof metadata.notification === 'object'
            ? { ...(metadata.notification as Record<string, unknown>) }
            : ({} as Record<string, unknown>);

        if (filteredTokens.length > 0) {
          notification.pushTokens = filteredTokens;
        } else {
          delete notification.pushTokens;
        }

        if (Object.keys(notification).length === 0) {
          delete metadata.notification;
        } else {
          metadata.notification = notification;
        }

        await this.userRepository.update(user.id, { metadata });

        const removedCount = existingTokens.length - filteredTokens.length;

        this.logger.debug(`${scope}: tokens push removidos para usuario`, {
          tenantId: params.tenantId,
          clinicId: params.clinicId,
          userId: user.id,
          removed: removedCount,
        });

        await this.auditService.register({
          tenantId: params.tenantId,
          clinicId: params.clinicId,
          performedBy: 'system',
          event: 'clinic.notification.push_tokens_removed',
          detail: {
            userId: user.id,
            removedTokens: tokensToRemove,
            remainingTokens: filteredTokens,
            scope,
            removedCount,
          },
        });
      } catch (error) {
        this.logger.error(`${scope}: falha ao remover tokens push invalidos`, error as Error, {
          tenantId: params.tenantId,
          clinicId: params.clinicId,
          userId: recipient.userId,
        });
      }
    }
  }

  private async resolveRecipientContacts(
    userIds: string[],
  ): Promise<Array<{ userId: string; email?: string; phone?: string; pushTokens?: string[] }>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return [];
    }

    const users = await Promise.all(uniqueIds.map((id) => this.userRepository.findById(id)));
    const contacts: Array<{
      userId: string;
      email?: string;
      phone?: string;
      pushTokens?: string[];
    }> = [];

    uniqueIds.forEach((userId, index) => {
      const user = users[index];
      if (!user || user.isActive === false) {
        return;
      }

      contacts.push({
        userId,
        email: typeof user.email === 'string' ? user.email : undefined,
        phone: typeof user.phone === 'string' ? user.phone : undefined,
        pushTokens: this.extractPushTokens(user),
      });
    });

    return contacts;
  }

  private selectChannels(
    settings: ClinicNotificationSettingsConfig | null,
    eventKey: string,
    fallback: string[],
  ): string[] {
    if (!settings) {
      return [...fallback];
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

    return [...fallback];
  }

  private isChannelEnabled(
    settings: ClinicNotificationSettingsConfig | null,
    channel: string,
  ): boolean {
    if (!settings) {
      return channel === 'system';
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
  ): ClinicNotificationChannelConfig | undefined {
    return settings.channels?.find((item) => String(item.type) === channel);
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

  private matchesQuietHours(date: Date, quietHours?: QuietHoursConfig): boolean {
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

  private parseTimeToMinutes(value: string): number | undefined {
    const parts = value.split(':');
    if (parts.length !== 2) {
      return undefined;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return undefined;
    }

    return hours * 60 + minutes;
  }

  private convertToTimezone(date: Date, timezone: string): Date {
    try {
      const locale = 'en-US';
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      };

      const formatter = new Intl.DateTimeFormat(locale, options);
      const parts = formatter.formatToParts(date);
      const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

      const year = Number(lookup.year);
      const month = Number(lookup.month);
      const day = Number(lookup.day);
      const hour = Number(lookup.hour);
      const minute = Number(lookup.minute);

      if (
        Number.isNaN(year) ||
        Number.isNaN(month) ||
        Number.isNaN(day) ||
        Number.isNaN(hour) ||
        Number.isNaN(minute)
      ) {
        return date;
      }

      return new Date(Date.UTC(year, month - 1, day, hour, minute));
    } catch {
      return date;
    }
  }

  private extractPushTokens(
    user: { metadata?: Record<string, unknown> } | null | undefined,
  ): string[] {
    if (!user || !user.metadata || typeof user.metadata !== 'object') {
      return [];
    }

    const notification = (user.metadata as Record<string, unknown>).notification;
    if (!notification || typeof notification !== 'object') {
      return [];
    }

    const rawTokens = (notification as Record<string, unknown>).pushTokens;
    if (!Array.isArray(rawTokens)) {
      return [];
    }

    const tokens = rawTokens
      .filter((token): token is string => typeof token === 'string' && token.trim().length > 0)
      .map((token) => token.trim());

    return Array.from(new Set(tokens));
  }

  private castNotificationSettings(
    raw: Record<string, unknown>,
  ): ClinicNotificationSettingsConfig | null {
    if (!raw) {
      return null;
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
}
