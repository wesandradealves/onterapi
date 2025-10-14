import { Injectable, Logger } from '@nestjs/common';

import {
  ClinicConfigurationSection,
  ClinicConfigurationTelemetry,
  ClinicConfigurationVersion,
} from '../../../domain/clinic/types/clinic.types';

interface CacheEntry {
  value: ClinicConfigurationVersion;
  expiresAt: number;
}

@Injectable()
export class ClinicConfigurationCacheService {
  private readonly logger = new Logger(ClinicConfigurationCacheService.name);

  private readonly ttlMs = 10 * 60 * 1000;

  private readonly store = new Map<string, CacheEntry>();

  get(params: {
    tenantId: string;
    clinicId: string;
    section: ClinicConfigurationSection;
  }): ClinicConfigurationVersion | undefined {
    const key = this.buildKey(params.tenantId, params.clinicId, params.section);
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return this.cloneVersion(entry.value);
  }

  set(params: {
    tenantId: string;
    clinicId: string;
    section: ClinicConfigurationSection;
    version: ClinicConfigurationVersion;
  }): void {
    const key = this.buildKey(params.tenantId, params.clinicId, params.section);
    const expiresAt = Date.now() + this.ttlMs;
    this.store.set(key, { value: this.cloneVersion(params.version), expiresAt });
  }

  invalidate(params: {
    tenantId: string;
    clinicId: string;
    section: ClinicConfigurationSection;
  }): void {
    const key = this.buildKey(params.tenantId, params.clinicId, params.section);
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private buildKey(
    tenantId: string,
    clinicId: string,
    section: ClinicConfigurationSection,
  ): string {
    return `${tenantId}:${clinicId}:${section}`;
  }

  private cloneVersion(version: ClinicConfigurationVersion): ClinicConfigurationVersion {
    return {
      ...version,
      payload: JSON.parse(JSON.stringify(version.payload ?? {})),
      createdAt: new Date(version.createdAt),
      appliedAt: version.appliedAt ? new Date(version.appliedAt) : undefined,
      telemetry: version.telemetry ? this.cloneTelemetry(version.telemetry) : undefined,
    };
  }

  private cloneTelemetry(telemetry: ClinicConfigurationTelemetry): ClinicConfigurationTelemetry {
    return {
      ...telemetry,
      lastAttemptAt: telemetry.lastAttemptAt ? new Date(telemetry.lastAttemptAt) : undefined,
      lastSavedAt: telemetry.lastSavedAt ? new Date(telemetry.lastSavedAt) : undefined,
      lastErrorAt: telemetry.lastErrorAt ? new Date(telemetry.lastErrorAt) : undefined,
    };
  }
}
