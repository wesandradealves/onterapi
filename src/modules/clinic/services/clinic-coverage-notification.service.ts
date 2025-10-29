import { Inject, Injectable, Logger } from '@nestjs/common';

import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { ClinicNotificationContextService } from './clinic-notification-context.service';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IPushNotificationService } from '../../../domain/integrations/interfaces/services/push-notification.service.interface';
import {
  IWhatsAppService,
  WhatsAppMessagePayload,
} from '../../../domain/integrations/interfaces/services/whatsapp.service.interface';
import {
  ClinicCoverageAppliedEvent,
  ClinicCoverageAppliedPayload,
  ClinicCoverageReleasedEvent,
  ClinicCoverageReleasedPayload,
} from './clinic-coverage-event.types';

const COVERAGE_EVENT_KEY_APPLIED = 'clinic.coverage.applied';
const COVERAGE_EVENT_KEY_RELEASED = 'clinic.coverage.released';
const COVERAGE_PUSH_CATEGORY = 'clinic_coverage';
const COVERAGE_NOTIFICATION_FALLBACK = ['system'];

@Injectable()
export class ClinicCoverageNotificationService {
  private readonly logger = new Logger(ClinicCoverageNotificationService.name);

  constructor(
    private readonly messageBus: MessageBus,
    private readonly notificationContext: ClinicNotificationContextService,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IPushNotificationService)
    private readonly pushNotificationService: IPushNotificationService,
    @Inject(IWhatsAppService)
    private readonly whatsappService: IWhatsAppService,
  ) {}

  async notifyCoverageApplied(event: ClinicCoverageAppliedEvent): Promise<void> {
    await this.dispatchNotification('applied', event.payload, event.aggregateId);
  }

  async notifyCoverageReleased(event: ClinicCoverageReleasedEvent): Promise<void> {
    await this.dispatchNotification('released', event.payload, event.aggregateId);
  }

  private async dispatchNotification(
    status: 'applied' | 'released',
    rawPayload: ClinicCoverageAppliedPayload | ClinicCoverageReleasedPayload,
    coverageId: string,
  ): Promise<void> {
    const payload = this.normalizePayload(status, rawPayload);

    const recipientIds = await this.resolveRecipients(payload);
    if (recipientIds.length === 0) {
      this.logger.debug('Cobertura: nenhum destinatario elegivel', {
        coverageId,
        clinicId: payload.clinicId,
        status,
      });
      return;
    }

    const settings = await this.notificationContext.resolveNotificationSettings(
      payload.tenantId,
      payload.clinicId,
    );

    const eventKey =
      status === 'applied' ? COVERAGE_EVENT_KEY_APPLIED : COVERAGE_EVENT_KEY_RELEASED;
    const eventDate =
      status === 'applied' ? payload.triggeredAt : (payload.reference ?? new Date());

    const channels = this.notificationContext.resolveChannels({
      settings,
      eventKey,
      eventDate,
      fallbackChannels: COVERAGE_NOTIFICATION_FALLBACK,
      logScope: 'clinic-coverage',
    });

    if (channels.length === 0) {
      this.logger.debug('Cobertura: nenhum canal habilitado', {
        coverageId,
        clinicId: payload.clinicId,
        status,
      });
      return;
    }

    const normalizedChannels = this.notificationContext.normalizeDispatchChannels(channels);
    const dispatchChannels = normalizedChannels.filter((channel) =>
      ['push', 'whatsapp'].includes(channel),
    );

    if (dispatchChannels.length === 0) {
      this.logger.debug('Cobertura: canais normalizados vazios', {
        coverageId,
        clinicId: payload.clinicId,
        status,
        normalizedChannels,
      });
      return;
    }

    if (dispatchChannels.includes('push')) {
      await this.dispatchPush({ coverageId, status, payload, recipientIds });
    }

    if (dispatchChannels.includes('whatsapp')) {
      await this.dispatchWhatsApp({ coverageId, status, payload, recipientIds });
    }

    await this.publishNotificationEvent(status, coverageId, {
      payload,
      recipientIds,
      channels: dispatchChannels,
    });
  }

  private async resolveRecipients(payload: NormalizedCoveragePayload): Promise<string[]> {
    const unique = new Set<string>();

    if (payload.coverageProfessionalId) {
      unique.add(payload.coverageProfessionalId);
    }

    if (payload.originalProfessionalId) {
      unique.add(payload.originalProfessionalId);
    }

    const defaultRecipients = await this.notificationContext.resolveRecipients({
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
    });

    defaultRecipients.forEach((recipient) => unique.add(recipient));

    return Array.from(unique).filter((recipient) => recipient && recipient.length > 0);
  }

  private async dispatchPush(input: {
    coverageId: string;
    status: 'applied' | 'released';
    payload: NormalizedCoveragePayload;
    recipientIds: string[];
  }): Promise<void> {
    const tokens = await this.notificationContext.resolveRecipientPushTokens(input.recipientIds);

    const flattened = tokens.flatMap((entry) => entry.tokens ?? []);
    if (flattened.length === 0) {
      this.logger.debug('Cobertura: nenhum token push encontrado', {
        coverageId: input.coverageId,
        clinicId: input.payload.clinicId,
        status: input.status,
      });
      return;
    }

    const clinic = await this.clinicRepository.findById(input.payload.clinicId);
    const clinicName = clinic?.name ?? 'Clinica';

    const message = this.buildPushMessage({
      status: input.status,
      clinicName,
      payload: input.payload,
    });

    const result = await this.pushNotificationService.sendNotification({
      tokens: flattened,
      title: message.title,
      body: message.body,
      category: COVERAGE_PUSH_CATEGORY,
      tenantId: input.payload.tenantId,
      clinicId: input.payload.clinicId,
      data: {
        coverageId: input.coverageId,
        status: input.status,
        triggerSource: input.payload.triggerSource,
      },
    });

    if (result.error) {
      this.logger.error('Cobertura: falha ao enviar push', result.error, {
        coverageId: input.coverageId,
        clinicId: input.payload.clinicId,
        status: input.status,
      });
      return;
    }

    const rejected = result.data?.rejectedTokens ?? [];
    if (rejected.length > 0) {
      await this.notificationContext.removeInvalidPushTokens({
        tenantId: input.payload.tenantId,
        clinicId: input.payload.clinicId,
        recipients: tokens,
        rejectedTokens: rejected,
        scope: 'clinic-coverage',
      });
    }
  }

  private async dispatchWhatsApp(input: {
    coverageId: string;
    status: 'applied' | 'released';
    payload: NormalizedCoveragePayload;
    recipientIds: string[];
  }): Promise<void> {
    const phones = await this.notificationContext.resolveRecipientPhones(input.recipientIds);
    if (phones.length === 0) {
      this.logger.debug('Cobertura: nenhum telefone encontrado para WhatsApp', {
        coverageId: input.coverageId,
        clinicId: input.payload.clinicId,
        status: input.status,
      });
      return;
    }

    const clinic = await this.clinicRepository.findById(input.payload.clinicId);
    const clinicName = clinic?.name ?? 'Clinica';
    const body = this.buildWhatsAppBody({
      status: input.status,
      clinicName,
      payload: input.payload,
    });

    await Promise.all(
      phones.map(async ({ phone }) => {
        const message: WhatsAppMessagePayload = { to: phone, body };
        const result = await this.whatsappService.sendMessage(message);

        if (result.error) {
          this.logger.error('Cobertura: falha ao enviar WhatsApp', result.error, {
            coverageId: input.coverageId,
            clinicId: input.payload.clinicId,
            status: input.status,
            recipient: phone,
          });
        }
      }),
    );
  }

  private async publishNotificationEvent(
    status: 'applied' | 'released',
    coverageId: string,
    params: {
      payload: NormalizedCoveragePayload;
      recipientIds: string[];
      channels: string[];
    },
  ): Promise<void> {
    const startAt = params.payload.startAt ?? params.payload.triggeredAt;
    const endAt = params.payload.endAt ?? params.payload.reference ?? params.payload.triggeredAt;
    const reference = params.payload.reference ?? params.payload.triggeredAt;

    const event =
      status === 'applied'
        ? DomainEvents.notificationsClinicCoverageApplied(coverageId, {
            tenantId: params.payload.tenantId,
            clinicId: params.payload.clinicId,
            originalProfessionalId: params.payload.originalProfessionalId,
            coverageProfessionalId: params.payload.coverageProfessionalId,
            startAt,
            endAt,
            triggerSource: params.payload.triggerSource,
            triggeredBy: params.payload.triggeredBy,
            triggeredAt: params.payload.triggeredAt,
            channels: params.channels,
            recipientIds: params.recipientIds,
            summary: params.payload.summary,
          })
        : DomainEvents.notificationsClinicCoverageReleased(coverageId, {
            tenantId: params.payload.tenantId,
            clinicId: params.payload.clinicId,
            originalProfessionalId: params.payload.originalProfessionalId,
            coverageProfessionalId: params.payload.coverageProfessionalId,
            reference,
            triggerSource: params.payload.triggerSource,
            triggeredBy: params.payload.triggeredBy,
            triggeredAt: params.payload.triggeredAt,
            channels: params.channels,
            recipientIds: params.recipientIds,
            summary: params.payload.summary,
          });

    await this.messageBus.publish(event);
  }

  private buildPushMessage(input: {
    status: 'applied' | 'released';
    clinicName: string;
    payload: NormalizedCoveragePayload;
  }): { title: string; body: string } {
    const startAt = input.payload.startAt ?? input.payload.triggeredAt;
    const endAt = input.payload.endAt ?? input.payload.reference ?? input.payload.triggeredAt;
    const reference = input.payload.reference ?? input.payload.triggeredAt;

    if (input.status === 'applied') {
      return {
        title: 'Cobertura ativada',
        body: `Cobertura iniciada em ${input.clinicName} de ${this.formatDate(
          startAt,
        )} a ${this.formatDate(endAt)}.`,
      };
    }

    return {
      title: 'Cobertura finalizada',
      body: `Cobertura encerrada em ${input.clinicName} (${this.formatDate(reference)}).`,
    };
  }

  private buildWhatsAppBody(input: {
    status: 'applied' | 'released';
    clinicName: string;
    payload: NormalizedCoveragePayload;
  }): string {
    const startAt = input.payload.startAt ?? input.payload.triggeredAt;
    const endAt = input.payload.endAt ?? input.payload.reference ?? input.payload.triggeredAt;
    const reference = input.payload.reference ?? input.payload.triggeredAt;

    if (input.status === 'applied') {
      return [
        `Cobertura ativada em ${input.clinicName}.`,
        `Periodo: ${this.formatDate(startAt)} - ${this.formatDate(endAt)}.`,
        `Profissional titular: ${input.payload.originalProfessionalId}.`,
        `Profissional cobertura: ${input.payload.coverageProfessionalId}.`,
      ].join(' ');
    }

    return [
      `Cobertura encerrada em ${input.clinicName}.`,
      `Profissional cobertura: ${input.payload.coverageProfessionalId}.`,
      `Referencia: ${this.formatDate(reference)}.`,
    ].join(' ');
  }

  private normalizePayload(
    status: 'applied' | 'released',
    payload: ClinicCoverageAppliedPayload | ClinicCoverageReleasedPayload,
  ): NormalizedCoveragePayload {
    const base = {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      originalProfessionalId: payload.originalProfessionalId,
      coverageProfessionalId: payload.coverageProfessionalId,
      triggerSource: payload.triggerSource,
      triggeredBy: payload.triggeredBy,
      triggeredAt: this.toDate(payload.triggeredAt),
      summary: payload.summary,
    } as NormalizedCoveragePayload;

    if (status === 'applied') {
      base.startAt = this.toDate((payload as ClinicCoverageAppliedPayload).startAt);
      base.endAt = this.toDate((payload as ClinicCoverageAppliedPayload).endAt);
    } else {
      base.reference = this.toDate((payload as ClinicCoverageReleasedPayload).reference);
      const appliedPayload = payload as Partial<ClinicCoverageAppliedPayload>;
      if (appliedPayload.startAt) {
        base.startAt = this.toDate(appliedPayload.startAt);
      }
      if (appliedPayload.endAt) {
        base.endAt = this.toDate(appliedPayload.endAt);
      }
    }

    return base;
  }

  private toDate(value: Date | string | undefined | null): Date {
    if (!value) {
      return new Date();
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private formatDate(value: Date): string {
    return value.toLocaleString('pt-BR', { hour12: false });
  }
}

type NormalizedCoveragePayload = {
  tenantId: string;
  clinicId: string;
  originalProfessionalId: string;
  coverageProfessionalId: string;
  startAt?: Date;
  endAt?: Date;
  reference?: Date;
  triggerSource: 'manual' | 'automatic';
  triggeredBy: string;
  triggeredAt: Date;
  summary: {
    clinicHolds: number;
    schedulingHolds: number;
    bookings: number;
    appointments: number;
  };
};
