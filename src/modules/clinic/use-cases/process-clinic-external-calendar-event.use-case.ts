import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IProcessClinicExternalCalendarEventUseCase,
  IProcessClinicExternalCalendarEventUseCase as IProcessClinicExternalCalendarEventUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/process-clinic-external-calendar-event.use-case.interface';
import {
  IExternalCalendarEventsRepository,
  IExternalCalendarEventsRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import {
  IClinicHoldRepository,
  IClinicHoldRepository as IClinicHoldRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import {
  IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ExternalCalendarEvent } from '../../../domain/scheduling/types/scheduling.types';
import {
  ClinicExternalCalendarEventPayload,
  ProcessClinicExternalCalendarEventInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicGoogleIntegrationSettings,
  extractGoogleIntegrationSettings,
} from '../services/clinic-google-integration-settings.util';

type ExternalEventDecision = {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  validationErrors: string[] | null;
  autoApproved: boolean;
};

type EvaluationContext = {
  clinicId: string;
  tenantId: string;
  professionalId: string;
  start: Date;
  end: Date;
  inboundStatus: ClinicExternalCalendarEventPayload['status'];
  existingEventId?: string;
  calendarId?: string;
  locationId?: string;
  resources: string[];
  clinicSettings?: ClinicGoogleIntegrationSettings | null;
};

@Injectable()
export class ProcessClinicExternalCalendarEventUseCase
  extends BaseUseCase<ProcessClinicExternalCalendarEventInput, ExternalCalendarEvent>
  implements IProcessClinicExternalCalendarEventUseCase
{
  protected readonly logger = new Logger(ProcessClinicExternalCalendarEventUseCase.name);

  constructor(
    @Inject(IExternalCalendarEventsRepositoryToken)
    private readonly externalEventsRepository: IExternalCalendarEventsRepository,
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly clinicConfigurationRepository: IClinicConfigurationRepository,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(
    input: ProcessClinicExternalCalendarEventInput,
  ): Promise<ExternalCalendarEvent> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const payload = input.payload;
    const start = new Date(payload.startAt);
    const end = new Date(payload.endAt);

    if (!this.isValidDate(start) || !this.isValidDate(end)) {
      throw ClinicErrorFactory.externalEventInvalid(
        'Datas informadas para o evento externo sao invalidas',
      );
    }

    if (end <= start) {
      throw ClinicErrorFactory.externalEventInvalid(
        'Horario final do evento externo deve ser posterior ao horario inicial',
      );
    }

    const existingEvent = await this.externalEventsRepository.findByExternalId(
      input.tenantId,
      input.professionalId,
      payload.externalEventId,
    );

    if (payload.status === 'cancelled') {
      const cancelled = await this.externalEventsRepository.upsert({
        id: existingEvent?.id,
        tenantId: input.tenantId,
        professionalId: input.professionalId,
        source: 'google_calendar',
        externalId: payload.externalEventId,
        startAtUtc: start,
        endAtUtc: end,
        timezone: payload.timezone,
        status: 'cancelled',
        validationErrors: null,
        resourceId: payload.calendarId ?? null,
      });

      await this.registerAudit(input, payload, cancelled.status, null);
      return cancelled;
    }

    const integrationSettings = await this.resolveGoogleSettings(input.clinicId);
    const normalizedResources = this.normalizeResources(payload.resources);
    const evaluation = await this.evaluateEvent({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      start,
      end,
      inboundStatus: payload.status,
      existingEventId: existingEvent?.id,
      calendarId: payload.calendarId,
      locationId: payload.locationId,
      resources: normalizedResources,
      clinicSettings: integrationSettings,
    });

    const updated = await this.externalEventsRepository.upsert({
      id: existingEvent?.id,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      source: 'google_calendar',
      externalId: payload.externalEventId,
      startAtUtc: start,
      endAtUtc: end,
      timezone: payload.timezone,
      status: evaluation.status,
      validationErrors: evaluation.validationErrors,
      resourceId: payload.calendarId ?? null,
    });

    await this.registerAudit(input, payload, evaluation.status, evaluation.validationErrors, {
      autoApproved: evaluation.autoApproved,
      settings: integrationSettings ?? undefined,
    });

    return updated;
  }

  private async resolveGoogleSettings(
    clinicId: string,
  ): Promise<ClinicGoogleIntegrationSettings | null> {
    try {
      const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
        clinicId,
        'integrations',
      );

      if (!version) {
        return null;
      }

      return extractGoogleIntegrationSettings(version.payload);
    } catch (error) {
      this.logger.error(
        'Falha ao carregar configuracoes de integracao Google Calendar',
        error as Error,
        {
          clinicId,
        },
      );
      return null;
    }
  }

  private async evaluateEvent(context: EvaluationContext): Promise<ExternalEventDecision> {
    const conflicts: string[] = [];
    const now = new Date();

    if (!context.clinicSettings) {
      conflicts.push('integration_not_configured');
    } else if (context.clinicSettings.enabled !== true) {
      conflicts.push('integration_disabled');
    }

    if (context.end <= now) {
      conflicts.push('event_in_past');
    }

    if (context.inboundStatus === 'tentative') {
      conflicts.push('status_tentative');
    }

    const overlappingAppointments = await this.clinicAppointmentRepository.findActiveOverlap({
      tenantId: context.tenantId,
      professionalId: context.professionalId,
      start: context.start,
      end: context.end,
      excludeAppointmentId: undefined,
    });

    if (overlappingAppointments.length > 0) {
      conflicts.push('appointment_conflict');
    }

    const overlappingHolds = await this.clinicHoldRepository.findActiveOverlapByProfessional({
      tenantId: context.tenantId,
      professionalId: context.professionalId,
      start: context.start,
      end: context.end,
      excludeHoldId: undefined,
    });

    if (overlappingHolds.length > 0) {
      conflicts.push('hold_conflict');
    }

    const approvedExternal = await this.externalEventsRepository.findApprovedOverlap({
      tenantId: context.tenantId,
      professionalId: context.professionalId,
      start: context.start,
      end: context.end,
      excludeEventId: context.existingEventId,
    });

    if (approvedExternal.length > 0) {
      conflicts.push('external_conflict');
    }

    const resourceConflicts = await this.detectResourceConflicts(context);
    conflicts.push(...resourceConflicts);

    const requireManualApproval =
      !context.clinicSettings ||
      context.clinicSettings.requireValidationForExternalEvents !== false ||
      conflicts.length > 0 ||
      context.clinicSettings.conflictPolicy === 'ask_user';

    if (requireManualApproval) {
      return {
        status: conflicts.length > 0 ? 'pending' : 'pending',
        validationErrors: conflicts.length > 0 ? conflicts : null,
        autoApproved: false,
      };
    }

    let autoApproved = false;

    if (
      context.clinicSettings &&
      context.clinicSettings.enabled === true &&
      context.inboundStatus === 'confirmed' &&
      conflicts.length === 0
    ) {
      autoApproved = true;
    }

    return {
      status: autoApproved ? 'approved' : 'pending',
      validationErrors: conflicts.length > 0 ? conflicts : null,
      autoApproved,
    };
  }

  private async detectResourceConflicts(context: EvaluationContext): Promise<string[]> {
    const reasons: string[] = [];

    const hasLocation = context.locationId && context.locationId.trim().length > 0;
    const hasResources = context.resources.length > 0;

    if (!hasLocation && !hasResources) {
      return reasons;
    }

    const conflicts = await this.clinicHoldRepository.findActiveOverlapByResources({
      tenantId: context.tenantId,
      clinicId: context.clinicId,
      start: context.start,
      end: context.end,
      locationId: hasLocation ? context.locationId : undefined,
      resources: hasResources ? context.resources : undefined,
    });

    if (conflicts.length > 0) {
      reasons.push('resource_conflict');
    }

    return reasons;
  }

  private normalizeResources(resources?: string[]): string[] {
    if (!resources || resources.length === 0) {
      return [];
    }

    return resources.map((resource) => resource.trim()).filter((resource) => resource.length > 0);
  }

  private isValidDate(value: Date): boolean {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }

  private async registerAudit(
    input: ProcessClinicExternalCalendarEventInput,
    payload: ClinicExternalCalendarEventPayload,
    status: ExternalCalendarEvent['status'],
    validationErrors: string[] | null,
    extras?: {
      autoApproved?: boolean;
      settings?: ClinicGoogleIntegrationSettings;
    },
  ): Promise<void> {
    await this.auditService.register({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      performedBy: input.triggeredBy ?? 'google_calendar',
      event: 'clinic.google_calendar.event_processed',
      detail: {
        professionalId: input.professionalId,
        externalEventId: payload.externalEventId,
        inboundStatus: payload.status,
        storedStatus: status,
        validationErrors: validationErrors ?? null,
        autoApproved: extras?.autoApproved ?? false,
        calendarId: payload.calendarId ?? null,
        locationId: payload.locationId ?? null,
        resources: payload.resources ?? [],
        settingsSnapshot: extras?.settings ?? null,
        rawPayload: payload.rawPayload ?? null,
      },
    });
  }
}

export const ProcessClinicExternalCalendarEventUseCaseToken =
  IProcessClinicExternalCalendarEventUseCaseToken;
