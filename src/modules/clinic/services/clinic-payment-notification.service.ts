import { Inject, Injectable, Logger } from '@nestjs/common';

import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import {
  ClinicAppointment,
  ClinicMemberStatus,
  ClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement,
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
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import {
  IWhatsAppService,
  WhatsAppMessagePayload,
} from '../../../domain/integrations/interfaces/services/whatsapp.service.interface';
import {
  ClinicPaymentChargebackEvent,
  ClinicPaymentRefundedEvent,
  ClinicPaymentSettledEvent,
} from './clinic-payment-event.types';

const NOTIFICATION_CHANNEL_FALLBACK: string[] = ['system'];
const RECIPIENT_ROLES: ClinicStaffRole[] = [RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER];
const ACTIVE_STATUS: ClinicMemberStatus[] = ['active'];
const PAYMENT_SETTLED_EVENT = 'clinic.payment.settled';
const PAYMENT_REFUNDED_EVENT = 'clinic.payment.refunded';
const PAYMENT_CHARGEBACK_EVENT = 'clinic.payment.chargeback';

type ClinicWhatsAppIntegrationSettings = {
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

@Injectable()
export class ClinicPaymentNotificationService {
  private readonly logger = new Logger(ClinicPaymentNotificationService.name);

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
    @Inject(IWhatsAppService)
    private readonly whatsappService: IWhatsAppService,
  ) {}

  async notifySettlement(input: {
    appointment: ClinicAppointment;
    event: ClinicPaymentSettledEvent;
    settlement: ClinicPaymentLedgerSettlement;
  }): Promise<void> {
    const recipients = await this.resolveRecipients(
      input.appointment.tenantId,
      input.appointment.clinicId,
      input.appointment.professionalId,
    );

    if (recipients.length === 0) {
      this.logger.debug('Liquidação sem destinatários elegíveis para notificação', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.resolveChannels(
      settings,
      PAYMENT_SETTLED_EVENT,
      new Date(input.settlement.settledAt),
    );

    if (channels.length === 0) {
      this.logger.debug('Liquidacao de pagamento sem canais habilitados para notificacao', {
        clinicId: input.appointment.clinicId,
        appointmentId: input.appointment.id,
        event: PAYMENT_SETTLED_EVENT,
      });
      return;
    }

    await this.messageBus.publish(
      DomainEvents.notificationsClinicPaymentSettled(input.appointment.id, {
        tenantId: input.appointment.tenantId,
        clinicId: input.appointment.clinicId,
        professionalId: input.appointment.professionalId,
        patientId: input.appointment.patientId,
        serviceTypeId: input.appointment.serviceTypeId,
        paymentTransactionId: input.event.payload.paymentTransactionId,
        settledAt: new Date(input.settlement.settledAt),
        amount: {
          baseAmountCents: input.settlement.baseAmountCents,
          netAmountCents: input.settlement.netAmountCents ?? null,
        },
        split: input.settlement.split.map((item) => ({ ...item })),
        remainderCents: input.settlement.remainderCents,
        gatewayStatus: input.settlement.gatewayStatus,
        sandbox: Boolean(input.event.payload.sandbox),
        fingerprint: input.event.payload.fingerprint ?? null,
        payloadId: input.event.payload.payloadId ?? null,
        recipientIds: recipients,
        channels,
      }),
    );

    if (channels.includes('email')) {
      await this.dispatchPaymentEmail({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'settled',
        eventAt: new Date(input.settlement.settledAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents: input.settlement.baseAmountCents,
        netAmountCents: input.settlement.netAmountCents ?? null,
        details: {
          split: input.settlement.split,
          remainderCents: input.settlement.remainderCents,
        },
      });
    }

    if (channels.includes('whatsapp')) {
      await this.dispatchPaymentWhatsApp({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'settled',
        eventAt: new Date(input.settlement.settledAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents: input.settlement.baseAmountCents,
        netAmountCents: input.settlement.netAmountCents ?? null,
        details: {
          split: input.settlement.split,
          remainderCents: input.settlement.remainderCents,
        },
      });
    }

    this.logger.debug('Notificacao de pagamento liquidado enfileirada', {
      appointmentId: input.appointment.id,
      recipients,
      channels,
      transactionId: input.event.payload.paymentTransactionId,
    });
  }

  async notifyRefund(input: {
    appointment: ClinicAppointment;
    event: ClinicPaymentRefundedEvent;
    refund: ClinicPaymentLedgerRefund;
  }): Promise<void> {
    const recipients = await this.resolveRecipients(
      input.appointment.tenantId,
      input.appointment.clinicId,
      input.appointment.professionalId,
    );

    if (recipients.length === 0) {
      this.logger.debug('Reembolso sem destinatários elegíveis para notificação', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.resolveChannels(
      settings,
      PAYMENT_REFUNDED_EVENT,
      new Date(input.refund.refundedAt),
    );

    if (channels.length === 0) {
      this.logger.debug('Reembolso sem canais habilitados para notificacao', {
        clinicId: input.appointment.clinicId,
        appointmentId: input.appointment.id,
        event: PAYMENT_REFUNDED_EVENT,
      });
      return;
    }

    await this.messageBus.publish(
      DomainEvents.notificationsClinicPaymentRefunded(input.appointment.id, {
        tenantId: input.appointment.tenantId,
        clinicId: input.appointment.clinicId,
        professionalId: input.appointment.professionalId,
        patientId: input.appointment.patientId,
        serviceTypeId: input.appointment.serviceTypeId,
        paymentTransactionId: input.event.payload.paymentTransactionId,
        refundedAt: new Date(input.refund.refundedAt),
        amount: {
          valueCents: input.refund.amountCents ?? null,
          netValueCents: input.refund.netAmountCents ?? null,
        },
        gatewayStatus: input.refund.gatewayStatus,
        sandbox: Boolean(input.event.payload.sandbox),
        fingerprint: input.event.payload.fingerprint ?? null,
        payloadId: input.event.payload.payloadId ?? null,
        recipientIds: recipients,
        channels,
      }),
    );

    if (channels.includes('email')) {
      await this.dispatchPaymentEmail({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'refunded',
        eventAt: new Date(input.refund.refundedAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents: input.refund.amountCents,
        netAmountCents: input.refund.netAmountCents ?? null,
        details: {
          gatewayStatus: input.refund.gatewayStatus,
        },
      });
    }

    if (channels.includes('whatsapp')) {
      await this.dispatchPaymentWhatsApp({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'refunded',
        eventAt: new Date(input.refund.refundedAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents: input.refund.amountCents,
        netAmountCents: input.refund.netAmountCents ?? null,
        details: {
          gatewayStatus: input.refund.gatewayStatus,
        },
      });
    }

    this.logger.debug('Notificacao de reembolso enfileirada', {
      appointmentId: input.appointment.id,
      recipients,
      channels,
      transactionId: input.event.payload.paymentTransactionId,
    });
  }

  async notifyChargeback(input: {
    appointment: ClinicAppointment;
    event: ClinicPaymentChargebackEvent;
    chargeback: ClinicPaymentLedgerChargeback;
  }): Promise<void> {
    const recipients = await this.resolveRecipients(
      input.appointment.tenantId,
      input.appointment.clinicId,
      input.appointment.professionalId,
    );

    if (recipients.length === 0) {
      this.logger.debug('Chargeback sem destinatários elegíveis para notificação', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.resolveChannels(
      settings,
      PAYMENT_CHARGEBACK_EVENT,
      new Date(input.chargeback.chargebackAt),
    );

    if (channels.length === 0) {
      this.logger.debug('Chargeback sem canais habilitados para notificacao', {
        clinicId: input.appointment.clinicId,
        appointmentId: input.appointment.id,
        event: PAYMENT_CHARGEBACK_EVENT,
      });
      return;
    }

    await this.messageBus.publish(
      DomainEvents.notificationsClinicPaymentChargeback(input.appointment.id, {
        tenantId: input.appointment.tenantId,
        clinicId: input.appointment.clinicId,
        professionalId: input.appointment.professionalId,
        patientId: input.appointment.patientId,
        serviceTypeId: input.appointment.serviceTypeId,
        paymentTransactionId: input.event.payload.paymentTransactionId,
        chargebackAt: new Date(input.chargeback.chargebackAt),
        gatewayStatus: input.chargeback.gatewayStatus,
        sandbox: Boolean(input.event.payload.sandbox),
        fingerprint: input.event.payload.fingerprint ?? null,
        payloadId: input.event.payload.payloadId ?? null,
        recipientIds: recipients,
        channels,
      }),
    );

    if (channels.includes('email')) {
      await this.dispatchPaymentEmail({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'chargeback',
        eventAt: new Date(input.chargeback.chargebackAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents: input.chargeback.amountCents,
        netAmountCents: input.chargeback.netAmountCents ?? null,
        details: {
          gatewayStatus: input.chargeback.gatewayStatus,
        },
      });
    }

    if (channels.includes('whatsapp')) {
      await this.dispatchPaymentWhatsApp({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'chargeback',
        eventAt: new Date(input.chargeback.chargebackAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents: input.chargeback.amountCents,
        netAmountCents: input.chargeback.netAmountCents ?? null,
        details: {
          gatewayStatus: input.chargeback.gatewayStatus,
        },
      });
    }

    this.logger.debug('Notificacao de chargeback enfileirada', {
      appointmentId: input.appointment.id,
      recipients,
      channels,
      transactionId: input.event.payload.paymentTransactionId,
    });
  }

  private async resolveRecipients(
    tenantId: string,
    clinicId: string,
    professionalId: string,
  ): Promise<string[]> {
    const uniqueRecipients = new Set<string>();

    if (professionalId) {
      uniqueRecipients.add(professionalId);
    }

    const { data } = await this.clinicMemberRepository.listMembers({
      clinicId,
      tenantId,
      status: ACTIVE_STATUS,
      roles: RECIPIENT_ROLES,
      limit: 100,
    });

    for (const member of data) {
      if (member.userId) {
        uniqueRecipients.add(member.userId);
      }
    }

    return Array.from(uniqueRecipients);
  }

  private async resolveNotificationSettings(
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
        'Falha ao carregar configurações de notificações para a clínica',
        error as Error,
        { tenantId, clinicId },
      );
      return null;
    }
  }

  private async resolveWhatsAppSettings(
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
        businessNumber:
          typeof raw.businessNumber === 'string' ? raw.businessNumber : undefined,
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

  private resolveChannels(
    settings: ClinicNotificationSettingsConfig | null,
    eventKey: string,
    eventDate: Date,
  ): string[] {
    const selectedChannels = this.selectChannels(settings, eventKey);
    if (selectedChannels.length === 0) {
      return [];
    }

    const filtered = selectedChannels.filter((channel) => {
      if (channel === 'system') {
        return true;
      }

      if (this.isInQuietHours(eventDate, channel, settings)) {
        this.logger.debug('Canal suprimido por quiet hours', {
          channel,
          event: eventKey,
        });
        return false;
      }

      if (!this.isChannelEnabled(settings, channel)) {
        this.logger.debug('Canal desabilitado para notificações de pagamento', {
          channel,
          event: eventKey,
        });
        return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      return [];
    }

    return filtered;
  }

  private selectChannels(
    settings: ClinicNotificationSettingsConfig | null,
    eventKey: string,
  ): string[] {
    if (!settings) {
      return [...NOTIFICATION_CHANNEL_FALLBACK];
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

    return [...NOTIFICATION_CHANNEL_FALLBACK];
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

  private async dispatchPaymentEmail(input: {
    appointment: ClinicAppointment;
    recipientIds: string[];
    clinicId: string;
    status: 'settled' | 'refunded' | 'chargeback';
    eventAt: Date;
    transactionId: string;
    serviceTypeId?: string;
    amountCents?: number;
    netAmountCents?: number | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const emails = await this.resolveRecipientEmails(input.recipientIds);
    if (emails.length === 0) {
      this.logger.warn('Pagamentos: nenhum e-mail encontrado para destinatarios', {
        clinicId: input.clinicId,
        appointmentId: input.appointment.id,
      });
      return;
    }

    const clinic = await this.clinicRepository.findById(input.clinicId);
    const clinicName = clinic?.name ?? 'Clinica';

    await Promise.all(
      emails.map(async ({ email }) => {
        const result = await this.emailService.sendClinicPaymentEmail({
          to: email,
          clinicName,
          status: input.status,
          transactionId: input.transactionId,
          eventAt: input.eventAt,
          serviceType: input.serviceTypeId,
          amountCents: input.amountCents,
          netAmountCents: input.netAmountCents,
          details: input.details,
        });

        if (result.error) {
          this.logger.error('Falha ao enviar notificacao de pagamento por email', result.error, {
            clinicId: input.clinicId,
            appointmentId: input.appointment.id,
            recipient: email,
            status: input.status,
          });
        }
      }),
    );
  }

  private async dispatchPaymentWhatsApp(input: {
    appointment: ClinicAppointment;
    recipientIds: string[];
    clinicId: string;
    status: 'settled' | 'refunded' | 'chargeback';
    eventAt: Date;
    transactionId: string;
    serviceTypeId?: string;
    amountCents?: number;
    netAmountCents?: number | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const settings = await this.resolveWhatsAppSettings(input.clinicId);
    if (!settings || settings.enabled !== true) {
      this.logger.debug('WhatsApp desabilitado para a clinica. Ignorando envio.', {
        clinicId: input.clinicId,
      });
      return;
    }

    if (settings.quietHours && this.matchesQuietHours(input.eventAt, settings.quietHours)) {
      this.logger.debug('WhatsApp suprimido por quiet hours', {
        clinicId: input.clinicId,
        appointmentId: input.appointment.id,
      });
      return;
    }

    const phones = await this.resolveRecipientPhones(input.recipientIds);
    const uniquePhones = Array.from(new Set(phones));
    if (uniquePhones.length === 0) {
      this.logger.warn('Pagamentos: nenhum telefone encontrado para destinatarios', {
        clinicId: input.clinicId,
        appointmentId: input.appointment.id,
      });
      return;
    }

    const clinic = await this.clinicRepository.findById(input.clinicId);
    const clinicName = clinic?.name ?? 'Clinica';
    const message = this.formatWhatsAppMessage({
      clinicName,
      status: input.status,
      eventAt: input.eventAt,
      transactionId: input.transactionId,
      amountCents: input.amountCents,
      netAmountCents: input.netAmountCents ?? undefined,
    });

    await Promise.all(
      uniquePhones.map(async (phone) => {
        const normalized = this.normalizePhone(phone);
        if (!this.isValidPhone(normalized)) {
          this.logger.warn('WhatsApp ignorado: telefone invalido', {
            clinicId: input.clinicId,
            originalPhone: phone,
          });
          return;
        }

        const payload: WhatsAppMessagePayload = {
          to: normalized,
          body: message,
        };

        const result = await this.whatsappService.sendMessage(payload);
        if (result.error) {
          this.logger.error('Falha ao enviar notificacao de pagamento por WhatsApp', result.error, {
            clinicId: input.clinicId,
            appointmentId: input.appointment.id,
            recipient: normalized,
            status: input.status,
          });
        }
      }),
    );
  }

  private async resolveRecipientContacts(
    userIds: string[],
  ): Promise<Array<{ email?: string; phone?: string }>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) {
      return [];
    }

    const users = await Promise.all(uniqueIds.map((id) => this.userRepository.findById(id)));
    const contacts: Array<{ email?: string; phone?: string }> = [];

    for (const user of users) {
      if (!user || user.isActive === false) {
        continue;
      }

      contacts.push({
        email: typeof user.email === 'string' ? user.email : undefined,
        phone: typeof user.phone === 'string' ? user.phone : undefined,
      });
    }

    return contacts;
  }

  private async resolveRecipientEmails(userIds: string[]): Promise<Array<{ email: string }>> {
    const contacts = await this.resolveRecipientContacts(userIds);
    return contacts
      .filter((contact) => Boolean(contact.email))
      .map((contact) => ({ email: contact.email as string }));
  }

  private async resolveRecipientPhones(userIds: string[]): Promise<string[]> {
    const contacts = await this.resolveRecipientContacts(userIds);
    const phones = contacts
      .map((contact) => contact.phone)
      .filter((phone): phone is string => Boolean(phone));

    return phones;
  }

  private normalizePhone(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return '';
    }

    const digits = trimmed.replace(/\D+/g, '');
    if (digits.length === 0) {
      return '';
    }

    if (trimmed.startsWith('+')) {
      return `+${digits}`;
    }

    return `+${digits}`;
  }

  private isValidPhone(value: string): boolean {
    if (!value) {
      return false;
    }

    const digits = value.replace(/\D+/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  private formatWhatsAppMessage(input: {
    clinicName: string;
    status: 'settled' | 'refunded' | 'chargeback';
    eventAt: Date;
    transactionId: string;
    amountCents?: number;
    netAmountCents?: number | null;
  }): string {
    const statusLabel = this.resolvePaymentStatusLabel(input.status);
    const eventDate = input.eventAt.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const amount =
      input.amountCents !== undefined
        ? this.formatCurrency(input.amountCents / 100)
        : 'Valor nao informado';
    const netAmount =
      input.netAmountCents !== undefined && input.netAmountCents !== null
        ? this.formatCurrency(input.netAmountCents / 100)
        : null;

    const lines = [
      `*${input.clinicName}*`,
      statusLabel,
      `Transacao: ${input.transactionId}`,
      `Valor: ${amount}`,
      netAmount ? `Liquido: ${netAmount}` : null,
      `Data: ${eventDate}`,
      '',
      'Esta mensagem foi enviada automaticamente pela Onterapi.',
    ].filter(Boolean);

    return (lines as string[]).join('\n');
  }

  private resolvePaymentStatusLabel(
    status: 'settled' | 'refunded' | 'chargeback',
  ): string {
    switch (status) {
      case 'settled':
        return 'Pagamento liquidado';
      case 'refunded':
        return 'Pagamento reembolsado';
      case 'chargeback':
        return 'Chargeback registrado';
      default:
        return 'Atualizacao de pagamento';
    }
  }

  private formatCurrency(value: number): string {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    } catch {
      return `R$ ${value.toFixed(2)}`;
    }
  }
}
