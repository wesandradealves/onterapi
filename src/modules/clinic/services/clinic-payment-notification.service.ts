import { Inject, Injectable, Logger } from '@nestjs/common';

import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import {
  ClinicAppointment,
  ClinicMemberStatus,
  ClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement,
  ClinicStaffRole,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import {
  IWhatsAppService,
  WhatsAppMessagePayload,
} from '../../../domain/integrations/interfaces/services/whatsapp.service.interface';
import {
  ClinicPaymentChargebackEvent,
  ClinicPaymentFailedEvent,
  ClinicPaymentRefundedEvent,
  ClinicPaymentSettledEvent,
} from './clinic-payment-event.types';
import { ClinicNotificationContextService } from './clinic-notification-context.service';

const NOTIFICATION_CHANNEL_FALLBACK: string[] = ['system'];
const RECIPIENT_ROLES: ClinicStaffRole[] = [RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER];
const ACTIVE_STATUS: ClinicMemberStatus[] = ['active'];
const PAYMENT_SETTLED_EVENT = 'clinic.payment.settled';
const PAYMENT_REFUNDED_EVENT = 'clinic.payment.refunded';
const PAYMENT_CHARGEBACK_EVENT = 'clinic.payment.chargeback';
const PAYMENT_FAILED_EVENT = 'clinic.payment.failed';

@Injectable()
export class ClinicPaymentNotificationService {
  private readonly logger = new Logger(ClinicPaymentNotificationService.name);

  constructor(
    private readonly messageBus: MessageBus,
    private readonly notificationContext: ClinicNotificationContextService,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
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
    const recipients = await this.notificationContext.resolveRecipients({
      tenantId: input.appointment.tenantId,
      clinicId: input.appointment.clinicId,
      includeProfessionalId: input.appointment.professionalId,
      roles: RECIPIENT_ROLES,
      statuses: ACTIVE_STATUS,
    });

    if (recipients.length === 0) {
      this.logger.debug('Liquidacao sem destinatarios elegiveis para notificacao', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey: PAYMENT_SETTLED_EVENT,
      eventDate: new Date(input.settlement.settledAt),
      fallbackChannels: NOTIFICATION_CHANNEL_FALLBACK,
      logScope: 'payments',
    });

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
    const recipients = await this.notificationContext.resolveRecipients({
      tenantId: input.appointment.tenantId,
      clinicId: input.appointment.clinicId,
      includeProfessionalId: input.appointment.professionalId,
      roles: RECIPIENT_ROLES,
      statuses: ACTIVE_STATUS,
    });

    if (recipients.length === 0) {
      this.logger.debug('Reembolso sem destinatarios elegiveis para notificacao', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey: PAYMENT_REFUNDED_EVENT,
      eventDate: new Date(input.refund.refundedAt),
      fallbackChannels: NOTIFICATION_CHANNEL_FALLBACK,
      logScope: 'payments',
    });

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
    const recipients = await this.notificationContext.resolveRecipients({
      tenantId: input.appointment.tenantId,
      clinicId: input.appointment.clinicId,
      includeProfessionalId: input.appointment.professionalId,
      roles: RECIPIENT_ROLES,
      statuses: ACTIVE_STATUS,
    });

    if (recipients.length === 0) {
      this.logger.debug('Chargeback sem destinatarios elegiveis para notificacao', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey: PAYMENT_CHARGEBACK_EVENT,
      eventDate: new Date(input.chargeback.chargebackAt),
      fallbackChannels: NOTIFICATION_CHANNEL_FALLBACK,
      logScope: 'payments',
    });

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

  async notifyFailure(input: {
    appointment: ClinicAppointment;
    event: ClinicPaymentFailedEvent;
  }): Promise<void> {
    const recipients = await this.notificationContext.resolveRecipients({
      tenantId: input.appointment.tenantId,
      clinicId: input.appointment.clinicId,
      includeProfessionalId: input.appointment.professionalId,
      roles: RECIPIENT_ROLES,
      statuses: ACTIVE_STATUS,
    });

    if (recipients.length === 0) {
      this.logger.debug('Falha de pagamento sem destinatarios elegiveis para notificacao', {
        appointmentId: input.appointment.id,
        clinicId: input.appointment.clinicId,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      input.appointment.tenantId,
      input.appointment.clinicId,
    );
    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey: PAYMENT_FAILED_EVENT,
      eventDate: new Date(input.event.payload.failedAt),
      fallbackChannels: NOTIFICATION_CHANNEL_FALLBACK,
      logScope: 'payments',
    });

    if (channels.length === 0) {
      this.logger.debug('Falha de pagamento sem canais habilitados para notificacao', {
        clinicId: input.appointment.clinicId,
        appointmentId: input.appointment.id,
        event: PAYMENT_FAILED_EVENT,
      });
      return;
    }

    const failureReason = input.event.payload.reason ?? input.event.payload.gatewayStatus;

    await this.messageBus.publish(
      DomainEvents.notificationsClinicPaymentFailed(input.appointment.id, {
        tenantId: input.appointment.tenantId,
        clinicId: input.appointment.clinicId,
        professionalId: input.appointment.professionalId,
        patientId: input.appointment.patientId,
        serviceTypeId: input.appointment.serviceTypeId,
        paymentTransactionId: input.event.payload.paymentTransactionId,
        failedAt: new Date(input.event.payload.failedAt),
        reason: failureReason ?? null,
        gatewayStatus: input.event.payload.gatewayStatus,
        sandbox: Boolean(input.event.payload.sandbox),
        fingerprint: input.event.payload.fingerprint ?? null,
        payloadId: input.event.payload.payloadId ?? null,
        channels,
        recipientIds: recipients,
      }),
    );

    const amountCents =
      input.event.payload.amount?.value !== undefined && input.event.payload.amount?.value !== null
        ? Math.round((input.event.payload.amount.value ?? 0) * 100)
        : undefined;
    const netAmountCents =
      input.event.payload.amount?.netValue !== undefined &&
      input.event.payload.amount?.netValue !== null
        ? Math.round((input.event.payload.amount.netValue ?? 0) * 100)
        : undefined;

    const details: Record<string, unknown> = {};
    if (failureReason) {
      details.reason = failureReason;
    }

    if (channels.includes('email')) {
      await this.dispatchPaymentEmail({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'failed',
        eventAt: new Date(input.event.payload.failedAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents,
        netAmountCents,
        details,
      });
    }

    if (channels.includes('whatsapp')) {
      await this.dispatchPaymentWhatsApp({
        appointment: input.appointment,
        recipientIds: recipients,
        clinicId: input.appointment.clinicId,
        status: 'failed',
        eventAt: new Date(input.event.payload.failedAt),
        transactionId: input.event.payload.paymentTransactionId,
        serviceTypeId: input.appointment.serviceTypeId,
        amountCents,
        netAmountCents,
        details,
      });
    }

    this.logger.debug('Notificacao de falha de pagamento enfileirada', {
      appointmentId: input.appointment.id,
      recipients,
      channels,
      transactionId: input.event.payload.paymentTransactionId,
    });
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
    status: 'settled' | 'refunded' | 'chargeback' | 'failed';
    eventAt: Date;
    transactionId: string;
    serviceTypeId?: string;
    amountCents?: number;
    netAmountCents?: number | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const emails = await this.notificationContext.resolveRecipientEmails(input.recipientIds);
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
    status: 'settled' | 'refunded' | 'chargeback' | 'failed';
    eventAt: Date;
    transactionId: string;
    serviceTypeId?: string;
    amountCents?: number;
    netAmountCents?: number | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const settings = await this.notificationContext.resolveWhatsAppSettings(input.clinicId);
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

    const phoneContacts = await this.notificationContext.resolveRecipientPhones(input.recipientIds);
    const phones = phoneContacts.map((contact) => contact.phone);
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
      details: input.details,
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
    status: 'settled' | 'refunded' | 'chargeback' | 'failed';
    eventAt: Date;
    transactionId: string;
    amountCents?: number;
    netAmountCents?: number | null;
    details?: Record<string, unknown>;
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
      input.details && typeof input.details.reason === 'string'
        ? `Motivo: ${String(input.details.reason)}`
        : null,
      `Data: ${eventDate}`,
      '',
      'Esta mensagem foi enviada automaticamente pela Onterapi.',
    ].filter(Boolean);

    return (lines as string[]).join('\n');
  }

  private resolvePaymentStatusLabel(
    status: 'settled' | 'refunded' | 'chargeback' | 'failed',
  ): string {
    switch (status) {
      case 'settled':
        return 'Pagamento liquidado';
      case 'refunded':
        return 'Pagamento reembolsado';
      case 'chargeback':
        return 'Chargeback registrado';
      case 'failed':
        return 'Pagamento nao foi concluido';
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
