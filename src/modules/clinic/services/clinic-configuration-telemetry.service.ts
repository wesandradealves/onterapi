import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  Clinic,
  ClinicConfigurationSection,
  ClinicConfigurationState,
  ClinicConfigurationTelemetry,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { ClinicConfigurationCacheService } from './clinic-configuration-cache.service';

interface MarkTelemetryBaseParams {
  clinic: Clinic;
  section: ClinicConfigurationSection;
  requestedBy: string;
}

@Injectable()
export class ClinicConfigurationTelemetryService {
  private readonly logger = new Logger(ClinicConfigurationTelemetryService.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    private readonly cacheService: ClinicConfigurationCacheService,
  ) {}

  getTelemetry(
    clinic: Clinic,
    section: ClinicConfigurationSection,
  ): ClinicConfigurationTelemetry | undefined {
    return clinic.configurationTelemetry?.[section];
  }

  async markSaving(
    params: MarkTelemetryBaseParams & { payload?: Record<string, unknown> },
  ): Promise<ClinicConfigurationTelemetry> {
    const now = new Date();
    const previous = this.getTelemetry(params.clinic, params.section);
    const completionScore =
      previous?.completionScore ??
      this.computeCompletionScore(params.section, params.payload ?? {});

    const telemetry: ClinicConfigurationTelemetry = {
      section: params.section,
      state: 'saving',
      completionScore,
      lastAttemptAt: now,
      lastSavedAt: previous?.lastSavedAt,
      lastErrorAt: previous?.lastErrorAt,
      lastErrorMessage: previous?.lastErrorMessage,
      lastUpdatedBy: params.requestedBy,
      autosaveIntervalSeconds: this.resolveAutosaveInterval(
        params.section,
        params.payload,
        previous?.autosaveIntervalSeconds,
      ),
      pendingConflicts: previous?.pendingConflicts,
    };

    await this.persistTelemetry(params.clinic, telemetry);
    await this.invalidateCache(params.clinic, params.section);

    return telemetry;
  }

  async markSaved(
    params: MarkTelemetryBaseParams & {
      payload: Record<string, unknown>;
      pendingConflicts?: number;
    },
  ): Promise<ClinicConfigurationTelemetry> {
    const now = new Date();
    const completionScore = this.computeCompletionScore(params.section, params.payload);

    const telemetry: ClinicConfigurationTelemetry = {
      section: params.section,
      state: 'saved',
      completionScore,
      lastAttemptAt: now,
      lastSavedAt: now,
      lastUpdatedBy: params.requestedBy,
      autosaveIntervalSeconds: this.resolveAutosaveInterval(
        params.section,
        params.payload,
        undefined,
      ),
      pendingConflicts: params.pendingConflicts ?? 0,
    };

    await this.persistTelemetry(params.clinic, telemetry);
    await this.invalidateCache(params.clinic, params.section);

    return telemetry;
  }

  async markError(
    params: MarkTelemetryBaseParams & { error: unknown },
  ): Promise<ClinicConfigurationTelemetry> {
    const now = new Date();
    const previous = this.getTelemetry(params.clinic, params.section);
    const telemetry: ClinicConfigurationTelemetry = {
      section: params.section,
      state: 'error',
      completionScore: previous?.completionScore ?? 0,
      lastAttemptAt: now,
      lastSavedAt: previous?.lastSavedAt,
      lastErrorAt: now,
      lastErrorMessage: this.extractErrorMessage(params.error),
      lastUpdatedBy: params.requestedBy,
      autosaveIntervalSeconds: previous?.autosaveIntervalSeconds,
      pendingConflicts: previous?.pendingConflicts,
    };

    await this.persistTelemetry(params.clinic, telemetry);
    await this.invalidateCache(params.clinic, params.section);

    return telemetry;
  }

  ensureTelemetry(params: {
    clinic: Clinic;
    section: ClinicConfigurationSection;
    payload: Record<string, unknown>;
    appliedAt?: Date;
    createdBy: string;
    autoApply: boolean;
  }): ClinicConfigurationTelemetry {
    const existing = this.getTelemetry(params.clinic, params.section);

    if (existing) {
      return existing;
    }

    const completionScore = this.computeCompletionScore(params.section, params.payload);
    const state: ClinicConfigurationState = params.appliedAt
      ? 'saved'
      : params.autoApply
        ? 'saving'
        : 'idle';

    return {
      section: params.section,
      state,
      completionScore,
      lastAttemptAt: params.appliedAt,
      lastSavedAt: params.appliedAt,
      lastUpdatedBy: params.createdBy,
      autosaveIntervalSeconds: this.resolveAutosaveInterval(
        params.section,
        params.payload,
        undefined,
      ),
      pendingConflicts: 0,
    };
  }

  computeCompletionScore(
    section: ClinicConfigurationSection,
    payload: Record<string, unknown>,
  ): number {
    try {
      switch (section) {
        case 'general':
          return this.computeGeneralScore(payload);
        case 'team':
          return this.computeTeamScore(payload);
        case 'schedule':
          return this.computeScheduleScore(payload);
        case 'services':
          return this.computeServicesScore(payload);
        case 'payments':
          return this.computePaymentsScore(payload);
        case 'integrations':
          return this.computeIntegrationsScore(payload);
        case 'notifications':
          return this.computeNotificationsScore(payload);
        case 'security':
          return this.computeSecurityScore(payload);
        case 'branding':
          return this.computeBrandingScore(payload);
        default:
          return 0;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to compute completion score for section ${section}: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  private async persistTelemetry(
    clinic: Clinic,
    telemetry: ClinicConfigurationTelemetry,
  ): Promise<void> {
    await this.clinicRepository.updateConfigurationTelemetry({
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
      section: telemetry.section,
      telemetry,
    });
  }

  private async invalidateCache(
    clinic: Clinic,
    section: ClinicConfigurationSection,
  ): Promise<void> {
    await this.cacheService.invalidate({
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
      section,
    });
  }

  private computeGeneralScore(payload: Record<string, unknown>): number {
    const general = this.ensureObject(payload);
    const address = this.ensureObject(general['address']);
    const contact = this.ensureObject(general['contact']);
    const document = this.ensureObject(general['document']);

    const checks = [
      this.isNonEmptyString(general['tradeName']),
      this.isNonEmptyString(document['type']) && this.isNonEmptyString(document['value']),
      this.isNonEmptyString(address['zipCode']),
      this.isNonEmptyString(address['street']),
      this.isNonEmptyString(address['city']),
      this.isNonEmptyString(address['state']),
      this.isValidEmail(contact['email']),
      this.hasContactPhone(contact),
    ];

    return this.computeScore(checks);
  }

  private computeTeamScore(payload: Record<string, unknown>): number {
    const team = this.ensureObject(payload);
    const quotas = Array.isArray(team['quotas']) ? (team['quotas'] as unknown[]) : [];

    const checks = [
      quotas.length > 0,
      quotas.every((quota) => {
        const quotaObj = this.ensureObject(quota);
        return (
          this.isNonEmptyString(quotaObj['role']) &&
          typeof quotaObj['limit'] === 'number' &&
          quotaObj['limit'] > 0
        );
      }),
      this.isNonEmptyString(team['defaultMemberStatus']),
      typeof team['allowExternalInvitations'] === 'boolean',
      typeof team['requireFinancialClearance'] === 'boolean',
    ];

    return this.computeScore(checks);
  }

  private computeScheduleScore(payload: Record<string, unknown>): number {
    const schedule = this.ensureObject(payload);
    const workingDays = Array.isArray(schedule['workingDays'])
      ? (schedule['workingDays'] as unknown[])
      : [];

    const hasActiveIntervals = workingDays.some((day) => {
      const dayObj = this.ensureObject(day);
      if (!dayObj['active']) {
        return false;
      }
      const intervals = Array.isArray(dayObj['intervals'])
        ? (dayObj['intervals'] as unknown[])
        : [];
      return intervals.some((interval) => {
        const intervalObj = this.ensureObject(interval);
        return (
          this.isNonEmptyString(intervalObj['start']) && this.isNonEmptyString(intervalObj['end'])
        );
      });
    });

    const checks = [
      this.isNonEmptyString(schedule['timezone']),
      hasActiveIntervals,
      typeof schedule['autosaveIntervalSeconds'] === 'number' &&
        schedule['autosaveIntervalSeconds'] > 0,
    ];

    return this.computeScore(checks);
  }

  private computeServicesScore(payload: Record<string, unknown>): number {
    const servicesContainer = this.ensureObject(payload);
    const services = Array.isArray(servicesContainer['services'])
      ? (servicesContainer['services'] as unknown[])
      : [];

    const checks = [
      services.length > 0,
      services.every((service) => {
        const item = this.ensureObject(service);
        return (
          this.isNonEmptyString(item['name']) &&
          typeof item['durationMinutes'] === 'number' &&
          item['durationMinutes'] > 0
        );
      }),
      services.every((service) => {
        const item = this.ensureObject(service);
        return typeof item['price'] === 'number' && item['price'] >= 0;
      }),
    ];

    return this.computeScore(checks);
  }

  private computePaymentsScore(payload: Record<string, unknown>): number {
    const payments = this.ensureObject(payload);
    const splitRules = Array.isArray(payments['splitRules'])
      ? (payments['splitRules'] as unknown[])
      : [];
    const cancellationPolicies = Array.isArray(payments['cancellationPolicies'])
      ? (payments['cancellationPolicies'] as unknown[])
      : [];

    const splitSum = splitRules.reduce<number>((acc, rule) => {
      const ruleObj = this.ensureObject(rule);
      const percentage = typeof ruleObj['percentage'] === 'number' ? ruleObj['percentage'] : 0;
      return acc + percentage;
    }, 0);

    const checks = [
      this.isNonEmptyString(payments['credentialsId']),
      splitRules.length > 0 && Math.abs(splitSum - 100) < 0.01,
      Object.keys(this.ensureObject(payments['inadimplencyRule'])).length > 0,
      Object.keys(this.ensureObject(payments['refundPolicy'])).length > 0,
      cancellationPolicies.length > 0,
    ];

    return this.computeScore(checks);
  }

  private computeIntegrationsScore(payload: Record<string, unknown>): number {
    const integrations = this.ensureObject(payload);
    const whatsapp = this.ensureObject(integrations['whatsapp']);
    const google = this.ensureObject(integrations['googleCalendar']);
    const email = this.ensureObject(integrations['email']);

    const checks: boolean[] = [];

    if (Object.keys(whatsapp).length > 0) {
      checks.push(
        whatsapp['enabled'] === true && this.isNonEmptyString(whatsapp['businessNumber']),
      );
    }

    if (Object.keys(google).length > 0) {
      checks.push(google['enabled'] === true && this.isNonEmptyString(google['conflictPolicy']));
    }

    if (Object.keys(email).length > 0) {
      checks.push(email['enabled'] === true && this.isNonEmptyString(email['fromEmail']));
    }

    if (checks.length === 0) {
      return 0;
    }

    return this.computeScore(checks);
  }

  private computeNotificationsScore(payload: Record<string, unknown>): number {
    const notifications = this.ensureObject(payload);
    const templates = Array.isArray(notifications['templates'])
      ? (notifications['templates'] as unknown[])
      : [];
    const quietHours = this.ensureObject(notifications['quietHours']);
    const channels = Array.isArray(notifications['channels'])
      ? (notifications['channels'] as unknown[])
      : [];

    const checks = [
      channels.length > 0,
      templates.length > 0,
      templates.every((template) => {
        const templateObj = this.ensureObject(template);
        return (
          this.isNonEmptyString(templateObj['id']) &&
          this.isNonEmptyString(templateObj['event']) &&
          this.isNonEmptyString(templateObj['channel'])
        );
      }),
      !quietHours.start ||
        (this.isNonEmptyString(quietHours['start']) && this.isNonEmptyString(quietHours['end'])),
    ];

    return this.computeScore(checks);
  }

  private computeSecurityScore(raw: Record<string, unknown>): number {
    const settings = (
      raw.securitySettings && typeof raw.securitySettings === 'object'
        ? (raw.securitySettings as Record<string, unknown>)
        : raw
    ) as Record<string, unknown>;

    const twoFactor = (settings.twoFactor ?? {}) as Record<string, unknown>;
    const passwordPolicy = (settings.passwordPolicy ?? {}) as Record<string, unknown>;
    const session = (settings.session ?? {}) as Record<string, unknown>;
    const ipRestrictions = (settings.ipRestrictions ?? {}) as Record<string, unknown>;
    const audit = (settings.audit ?? {}) as Record<string, unknown>;
    const compliance = (settings.compliance ?? {}) as Record<string, unknown>;

    let score = 0;

    const twoFactorEnabled = Boolean(twoFactor.enabled);
    const requiredRoles = Array.isArray(twoFactor.requiredRoles)
      ? (twoFactor.requiredRoles as unknown[]).length
      : 0;
    if (twoFactorEnabled || requiredRoles > 0) {
      score += 20;
    }

    const minLength = Number(passwordPolicy.minLength ?? 0);
    const uppercase = Boolean(passwordPolicy.requireUppercase);
    const lowercase = Boolean(passwordPolicy.requireLowercase);
    const numbers = Boolean(passwordPolicy.requireNumbers);
    const specials = Boolean(passwordPolicy.requireSpecialCharacters);
    if (minLength >= 8 && uppercase && lowercase && numbers && specials) {
      score += 20;
    } else if (minLength >= 6 && uppercase && lowercase && numbers) {
      score += 10;
    }

    const idleTimeout = Number(session.idleTimeoutMinutes ?? 0);
    const absoluteTimeout = Number(session.absoluteTimeoutMinutes ?? 0);
    if (idleTimeout >= 10 && absoluteTimeout >= idleTimeout) {
      score += 20;
    } else if (idleTimeout >= 5 && absoluteTimeout >= idleTimeout) {
      score += 10;
    }

    const ipEnabled = Boolean(ipRestrictions.enabled);
    const allowlistSize = Array.isArray(ipRestrictions.allowlist)
      ? (ipRestrictions.allowlist as unknown[]).length
      : 0;
    if (ipEnabled && allowlistSize > 0) {
      score += 20;
    } else if (!ipEnabled) {
      score += 10;
    }

    const retentionDays = Number(audit.retentionDays ?? 0);
    if (retentionDays >= 180) {
      score += 20;
    } else if (retentionDays >= 90) {
      score += 15;
    } else if (retentionDays >= 30) {
      score += 10;
    }

    score += this.computeSecurityComplianceScore(compliance['documents']);

    return Math.min(score, 100);
  }

  private computeSecurityComplianceScore(raw: unknown): number {
    if (!Array.isArray(raw) || raw.length === 0) {
      return 0;
    }

    let validCount = 0;
    let missingOrExpired = 0;

    raw.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const record = entry as Record<string, unknown>;
      const statusValue =
        typeof record.status === 'string' ? record.status.toLowerCase() : 'unknown';

      if (statusValue === 'missing' || statusValue === 'expired') {
        missingOrExpired += 1;
      } else {
        validCount += 1;
      }
    });

    if (validCount > 0 && missingOrExpired === 0) {
      return 20;
    }

    if (validCount > 0) {
      return 10;
    }

    return 0;
  }

  private computeBrandingScore(payload: Record<string, unknown>): number {
    const branding = this.ensureObject(payload);
    const palette = this.ensureObject(branding['palette']);
    const typography = this.ensureObject(branding['typography']);

    const checks = [
      this.isNonEmptyString(branding['logoUrl']) || this.isNonEmptyString(branding['darkLogoUrl']),
      this.isNonEmptyString(palette['primary']),
      this.isNonEmptyString(typography['primaryFont']),
    ];

    return this.computeScore(checks);
  }

  private resolveAutosaveInterval(
    section: ClinicConfigurationSection,
    payload?: Record<string, unknown>,
    fallback?: number,
  ): number | undefined {
    if (!payload) {
      return fallback;
    }

    if (section !== 'schedule') {
      return fallback;
    }

    const schedule = this.ensureObject(payload);
    const value = schedule['autosaveIntervalSeconds'];

    if (typeof value === 'number' && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return fallback;
  }

  private computeScore(checks: boolean[]): number {
    const total = checks.length;
    if (total === 0) {
      return 0;
    }

    const satisfied = checks.filter(Boolean).length;
    return Math.round((satisfied / total) * 100);
  }

  private ensureObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isValidEmail(value: unknown): boolean {
    if (!this.isNonEmptyString(value)) {
      return false;
    }
    const email = String(value).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private hasContactPhone(contact: Record<string, unknown>): boolean {
    return this.isNonEmptyString(contact['phone']) || this.isNonEmptyString(contact['whatsapp']);
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error && error.message) {
      return this.toAscii(error.message);
    }

    if (typeof error === 'string') {
      return this.toAscii(error);
    }

    return undefined;
  }

  private toAscii(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
  }
}
