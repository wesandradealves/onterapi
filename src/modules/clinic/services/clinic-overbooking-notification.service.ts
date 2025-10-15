import { Inject, Injectable, Logger } from '@nestjs/common';

import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { ClinicNotificationContextService } from './clinic-notification-context.service';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import {
  IWhatsAppService,
  WhatsAppMessagePayload,
} from '../../../domain/integrations/interfaces/services/whatsapp.service.interface';
import {
  ClinicOverbookingReviewedEvent,
  ClinicOverbookingReviewRequestedEvent,
} from './clinic-overbooking-event.types';

const OVERBOOKING_EVENT_KEY_REVIEW_REQUESTED = 'clinic.overbooking.review_requested';
const OVERBOOKING_EVENT_KEY_REVIEWED = 'clinic.overbooking.reviewed';
const DEFAULT_NOTIFICATION_FALLBACK = ['system'];

@Injectable()
export class ClinicOverbookingNotificationService {
  private readonly logger = new Logger(ClinicOverbookingNotificationService.name);

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

  async notifyReviewRequested(event: ClinicOverbookingReviewRequestedEvent): Promise<void> {
    const recipients = await this.resolveRecipients({
      clinicId: event.payload.clinicId,
      tenantId: event.payload.tenantId,
      professionalId: event.payload.professionalId,
      additional: [event.payload.requestedBy],
    });

    if (recipients.length === 0) {
      this.logger.debug('Overbooking: nenhum destinatario encontrado para revisao pendente', {
        clinicId: event.payload.clinicId,
        holdId: event.aggregateId,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      event.payload.tenantId,
      event.payload.clinicId,
    );

    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey: OVERBOOKING_EVENT_KEY_REVIEW_REQUESTED,
      eventDate: event.payload.requestedAt ?? new Date(),
      fallbackChannels: DEFAULT_NOTIFICATION_FALLBACK,
      logScope: 'overbooking',
    });

    if (channels.length === 0) {
      this.logger.debug('Overbooking: nenhum canal habilitado para revisao pendente', {
        clinicId: event.payload.clinicId,
        holdId: event.aggregateId,
      });
      return;
    }

    await this.publishNotificationEvent('requested', event.aggregateId, {
      channels,
      recipients,
      payload: event.payload,
    });

    if (channels.includes('email')) {
      await this.dispatchEmail({
        holdId: event.aggregateId,
        clinicId: event.payload.clinicId,
        recipients,
        status: 'review_requested',
        payload: event.payload,
      });
    }

    if (channels.includes('whatsapp')) {
      await this.dispatchWhatsApp({
        holdId: event.aggregateId,
        clinicId: event.payload.clinicId,
        recipients,
        status: 'review_requested',
        payload: event.payload,
      });
    }
  }

  async notifyReviewOutcome(event: ClinicOverbookingReviewedEvent): Promise<void> {
    const recipients = await this.resolveRecipients({
      clinicId: event.payload.clinicId,
      tenantId: event.payload.tenantId,
      professionalId: event.payload.professionalId,
      additional: [event.payload.reviewedBy, event.payload.requestedBy],
    });

    if (recipients.length === 0) {
      this.logger.debug('Overbooking: nenhum destinatario encontrado para resultado de revisao', {
        clinicId: event.payload.clinicId,
        holdId: event.aggregateId,
        status: event.payload.status,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      event.payload.tenantId,
      event.payload.clinicId,
    );

    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey: OVERBOOKING_EVENT_KEY_REVIEWED,
      eventDate: event.payload.reviewedAt ?? new Date(),
      fallbackChannels: DEFAULT_NOTIFICATION_FALLBACK,
      logScope: 'overbooking',
    });

    if (channels.length === 0) {
      this.logger.debug('Overbooking: nenhum canal habilitado para resultado de revisao', {
        clinicId: event.payload.clinicId,
        holdId: event.aggregateId,
        status: event.payload.status,
      });
      return;
    }

    await this.publishNotificationEvent(event.payload.status, event.aggregateId, {
      channels,
      recipients,
      payload: event.payload,
    });

    if (channels.includes('email')) {
      await this.dispatchEmail({
        holdId: event.aggregateId,
        clinicId: event.payload.clinicId,
        recipients,
        status: event.payload.status,
        payload: event.payload,
      });
    }

    if (channels.includes('whatsapp')) {
      await this.dispatchWhatsApp({
        holdId: event.aggregateId,
        clinicId: event.payload.clinicId,
        recipients,
        status: event.payload.status,
        payload: event.payload,
      });
    }
  }

  private async resolveRecipients(params: {
    tenantId: string;
    clinicId: string;
    professionalId: string;
    additional?: Array<string | undefined>;
  }): Promise<string[]> {
    const primaryRecipients = await this.notificationContext.resolveRecipients({
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      includeProfessionalId: params.professionalId,
    });

    const unique = new Set(primaryRecipients);
    (params.additional ?? []).forEach((maybeId) => {
      if (maybeId) {
        unique.add(maybeId);
      }
    });

    return Array.from(unique);
  }

  private async publishNotificationEvent(
    phase: 'requested' | 'approved' | 'rejected',
    holdId: string,
    input: {
      channels: string[];
      recipients: string[];
      payload:
        | ClinicOverbookingReviewRequestedEvent['payload']
        | ClinicOverbookingReviewedEvent['payload'];
    },
  ): Promise<void> {
    if (phase === 'requested') {
      const payload = input.payload as ClinicOverbookingReviewRequestedEvent['payload'];
      await this.messageBus.publish(
        DomainEvents.notificationsClinicOverbookingReviewRequested(holdId, {
          tenantId: payload.tenantId,
          clinicId: payload.clinicId,
          professionalId: payload.professionalId,
          patientId: payload.patientId,
          serviceTypeId: payload.serviceTypeId,
          riskScore: payload.riskScore,
          threshold: payload.threshold,
          requestedBy: payload.requestedBy,
          requestedAt: payload.requestedAt ?? new Date(),
          reasons: payload.reasons ?? null,
          context: payload.context ?? null,
          autoApproved: payload.autoApproved ?? false,
          recipientIds: input.recipients,
          channels: input.channels,
        }),
      );
      return;
    }

    const payload = input.payload as ClinicOverbookingReviewedEvent['payload'];

    await this.messageBus.publish(
      DomainEvents.notificationsClinicOverbookingReviewed(holdId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        serviceTypeId: payload.serviceTypeId,
        status: payload.status,
        riskScore: payload.riskScore,
        threshold: payload.threshold,
        reviewedBy: payload.reviewedBy,
        reviewedAt: payload.reviewedAt ?? new Date(),
        justification: payload.justification ?? null,
        reasons: payload.reasons ?? null,
        context: payload.context ?? null,
        autoApproved: payload.autoApproved ?? false,
        requestedBy: payload.requestedBy,
        requestedAt: payload.requestedAt,
        recipientIds: input.recipients,
        channels: input.channels,
      }),
    );
  }

  private async dispatchWhatsApp(input: {
    holdId: string;
    clinicId: string;
    recipients: string[];
    status: 'review_requested' | 'approved' | 'rejected';
    payload:
      | ClinicOverbookingReviewRequestedEvent['payload']
      | ClinicOverbookingReviewedEvent['payload'];
  }): Promise<void> {
    const settings = await this.notificationContext.resolveWhatsAppSettings(input.clinicId);
    if (!settings || settings.enabled !== true) {
      this.logger.debug('Overbooking: WhatsApp desabilitado para a clinica', {
        clinicId: input.clinicId,
        holdId: input.holdId,
        status: input.status,
      });
      return;
    }

    const referenceDate = this.resolveEventDate(input.status, input.payload);

    if (settings.quietHours && this.matchesQuietHours(referenceDate, settings.quietHours)) {
      this.logger.debug('Overbooking: WhatsApp suprimido por quiet hours', {
        clinicId: input.clinicId,
        holdId: input.holdId,
        status: input.status,
      });
      return;
    }

    const contacts = await this.notificationContext.resolveRecipientPhones(input.recipients);
    const phones = contacts
      .map((contact) => contact.phone)
      .filter((phone): phone is string => Boolean(phone));

    if (phones.length === 0) {
      this.logger.warn('Overbooking: nenhum telefone encontrado para notificacao', {
        clinicId: input.clinicId,
        holdId: input.holdId,
        status: input.status,
      });
      return;
    }

    const clinic = await this.clinicRepository.findById(input.clinicId);
    const clinicName = clinic?.name ?? 'Clinica';
    const message = this.formatWhatsAppMessage({
      clinicName,
      status: input.status,
      payload: input.payload,
    });

    await Promise.all(
      phones.map(async (phone) => {
        const normalized = this.normalizePhone(phone);
        if (!this.isValidPhone(normalized)) {
          this.logger.warn('Overbooking: telefone invalido para WhatsApp', {
            clinicId: input.clinicId,
            holdId: input.holdId,
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
          this.logger.error('Overbooking: falha ao enviar WhatsApp', result.error, {
            clinicId: input.clinicId,
            holdId: input.holdId,
            recipient: normalized,
            status: input.status,
          });
        }
      }),
    );
  }

  private formatWhatsAppMessage(input: {
    clinicName: string;
    status: 'review_requested' | 'approved' | 'rejected';
    payload:
      | ClinicOverbookingReviewRequestedEvent['payload']
      | ClinicOverbookingReviewedEvent['payload'];
  }): string {
    const statusLabel = this.resolveWhatsappStatusLabel(input.status);
    const lines = [
      `*${input.clinicName}*`,
      statusLabel,
      `Profissional: ${input.payload.professionalId}`,
      `Paciente: ${input.payload.patientId}`,
      `Servico: ${input.payload.serviceTypeId}`,
      `Risco calculado: ${input.payload.riskScore}%`,
      `Limiar da clinica: ${input.payload.threshold}%`,
      input.status !== 'review_requested' && 'reviewedBy' in input.payload
        ? `Revisado por: ${input.payload.reviewedBy ?? 'N/D'}`
        : null,
      input.status !== 'review_requested' &&
      'justification' in input.payload &&
      input.payload.justification
        ? `Justificativa: ${input.payload.justification}`
        : null,
    ].filter(Boolean) as string[];

    lines.push('--', 'Mensagem automatica da Onterapi.');

    return lines.join('\n');
  }

  private resolveWhatsappStatusLabel(status: 'review_requested' | 'approved' | 'rejected'): string {
    switch (status) {
      case 'review_requested':
        return 'Revisao pendente';
      case 'approved':
        return 'Overbooking aprovado';
      case 'rejected':
        return 'Overbooking rejeitado';
      default:
        return 'Atualizacao de overbooking';
    }
  }

  private resolveEventDate(
    status: 'review_requested' | 'approved' | 'rejected',
    payload:
      | ClinicOverbookingReviewRequestedEvent['payload']
      | ClinicOverbookingReviewedEvent['payload'],
  ): Date {
    if (status === 'review_requested' && 'requestedAt' in payload && payload.requestedAt) {
      return new Date(payload.requestedAt);
    }

    if (status !== 'review_requested' && 'reviewedAt' in payload && payload.reviewedAt) {
      return new Date(payload.reviewedAt);
    }

    return new Date();
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

    if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
      return trimmed.startsWith('+') ? `+${digits}` : `+${digits.slice(2)}`;
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

  private matchesQuietHours(
    date: Date,
    quietHours?: { start: string; end: string; timezone?: string },
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
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

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
  private async dispatchEmail(input: {
    holdId: string;
    clinicId: string;
    recipients: string[];
    status: 'review_requested' | 'approved' | 'rejected';
    payload:
      | ClinicOverbookingReviewRequestedEvent['payload']
      | ClinicOverbookingReviewedEvent['payload'];
  }): Promise<void> {
    const emails = await this.notificationContext.resolveRecipientEmails(input.recipients);
    if (emails.length === 0) {
      this.logger.warn('Overbooking: nenhum email encontrado para notificacao', {
        clinicId: input.clinicId,
        holdId: input.holdId,
        status: input.status,
      });
      return;
    }

    const clinic = await this.clinicRepository.findById(input.clinicId);
    const clinicName = clinic?.name ?? 'Clinica';

    await Promise.all(
      emails.map(async ({ email }) => {
        const result = await this.emailService.sendClinicOverbookingEmail({
          to: email,
          clinicName,
          status: input.status,
          holdId: input.holdId,
          professionalId: input.payload.professionalId,
          patientId: input.payload.patientId,
          serviceTypeId: input.payload.serviceTypeId,
          riskScore: input.payload.riskScore,
          threshold: input.payload.threshold,
          requestedBy:
            'requestedBy' in input.payload && input.payload.requestedBy
              ? input.payload.requestedBy
              : undefined,
          requestedAt:
            'requestedAt' in input.payload && input.payload.requestedAt
              ? new Date(input.payload.requestedAt)
              : undefined,
          reviewedBy:
            input.status !== 'review_requested' && 'reviewedBy' in input.payload
              ? input.payload.reviewedBy
              : undefined,
          reviewedAt:
            input.status !== 'review_requested' && 'reviewedAt' in input.payload
              ? new Date(input.payload.reviewedAt ?? new Date())
              : undefined,
          justification:
            input.status !== 'review_requested' && 'justification' in input.payload
              ? (input.payload.justification ?? undefined)
              : undefined,
          reasons:
            'reasons' in input.payload && input.payload.reasons
              ? (input.payload.reasons ?? undefined)
              : undefined,
          context:
            'context' in input.payload && input.payload.context
              ? (input.payload.context as Record<string, unknown>)
              : undefined,
        });

        if (result.error) {
          this.logger.error('Overbooking: falha ao enviar email de notificacao', result.error, {
            clinicId: input.clinicId,
            holdId: input.holdId,
            recipient: email,
            status: input.status,
          });
        }
      }),
    );
  }
}
