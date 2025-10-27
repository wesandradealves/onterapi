import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import {
  ClinicConfigurationSection,
  ClinicConfigurationTelemetry,
  ClinicConfigurationVersion,
} from '../../../domain/clinic/types/clinic.types';

interface CacheEntry {
  value: ClinicConfigurationVersion;
  expiresAt: number;
}

type SerializedTelemetry = Omit<
  ClinicConfigurationTelemetry,
  'lastAttemptAt' | 'lastSavedAt' | 'lastErrorAt'
> & {
  lastAttemptAt?: string;
  lastSavedAt?: string;
  lastErrorAt?: string;
};

type SerializedVersion = Omit<
  ClinicConfigurationVersion,
  'createdAt' | 'appliedAt' | 'telemetry'
> & {
  createdAt: string;
  appliedAt?: string;
  telemetry?: SerializedTelemetry;
};

@Injectable()
export class ClinicConfigurationCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ClinicConfigurationCacheService.name);
  private readonly ttlMs: number;
  private readonly namespace = 'clinic:configuration';
  private readonly fallbackStore = new Map<string, CacheEntry>();
  private readonly redis?: Redis;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = this.resolveTtl();
    const redisUrl = this.configService.get<string>('CLINIC_CONFIGURATION_CACHE_REDIS_URL')?.trim();

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableAutoPipelining: true,
      });

      this.redis.on('error', (error) => {
        this.logger.error('Erro no cache Redis das configuracoes da clinica', error as Error);
      });

      this.redis.on('connect', () => {
        this.logger.log(
          `Cache Redis das configuracoes da clinica conectado (${this.describeRedis(redisUrl)})`,
        );
      });

      this.redis.on('end', () => {
        this.logger.warn('Conexao Redis encerrada; utilizando cache em memoria como fallback');
      });

      void this.redis.connect().catch((error) => {
        this.logger.error(
          'Falha ao conectar no Redis das configuracoes da clinica; usando fallback em memoria',
          error as Error,
        );
      });
    } else {
      this.logger.log(
        'Cache de configuracoes da clinica utilizando modo em memoria (Redis nao definido)',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        this.logger.error(
          'Falha ao encerrar conexao Redis do cache de configuracoes',
          error as Error,
        );
      }
    }
  }

  async get(params: {
    tenantId: string;
    clinicId: string;
    section: ClinicConfigurationSection;
  }): Promise<ClinicConfigurationVersion | undefined> {
    const key = this.buildKey(params.tenantId, params.clinicId, params.section);

    if (this.redis) {
      try {
        const payload = await this.redis.get(key);

        if (payload) {
          const version = this.deserializeVersion(payload);
          this.storeFallback(key, version);
          return this.cloneVersion(version);
        }

        this.fallbackStore.delete(key);
        return undefined;
      } catch (error) {
        this.logger.error(
          `Falha ao ler cache Redis para a chave ${key}; usando fallback em memoria`,
          error as Error,
        );
      }
    }

    const fallback = this.fallbackStore.get(key);

    if (!fallback) {
      return undefined;
    }

    if (fallback.expiresAt <= Date.now()) {
      this.fallbackStore.delete(key);
      return undefined;
    }

    return this.cloneVersion(fallback.value);
  }

  async set(params: {
    tenantId: string;
    clinicId: string;
    section: ClinicConfigurationSection;
    version: ClinicConfigurationVersion;
  }): Promise<void> {
    const key = this.buildKey(params.tenantId, params.clinicId, params.section);
    const versionClone = this.cloneVersion(params.version);

    this.storeFallback(key, versionClone);

    if (this.redis) {
      try {
        await this.redis.set(
          key,
          JSON.stringify(this.serializeVersion(versionClone)),
          'PX',
          this.ttlMs,
        );
      } catch (error) {
        this.logger.error(
          `Falha ao gravar cache Redis para a chave ${key}; fallback em memoria permanecera ativo`,
          error as Error,
        );
      }
    }
  }

  async invalidate(params: {
    tenantId: string;
    clinicId: string;
    section: ClinicConfigurationSection;
  }): Promise<void> {
    const key = this.buildKey(params.tenantId, params.clinicId, params.section);

    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        this.logger.error(
          `Falha ao remover chave ${key} no cache Redis; removendo apenas do fallback em memoria`,
          error as Error,
        );
      }
    }

    this.fallbackStore.delete(key);
  }

  async clear(): Promise<void> {
    this.fallbackStore.clear();

    if (this.redis) {
      try {
        const stream = this.redis.scanStream({ match: `${this.namespace}:*`, count: 100 });
        const pipeline: Array<Promise<unknown>> = [];

        stream.on('data', (keys: string[]) => {
          if (keys.length === 0) {
            return;
          }
          keys.forEach((key) => pipeline.push(this.redis!.del(key)));
        });

        await new Promise<void>((resolve, reject) => {
          stream.on('end', () => resolve());
          stream.on('error', (error) => reject(error));
        });

        await Promise.allSettled(pipeline);
      } catch (error) {
        this.logger.error(
          'Falha ao limpar chaves Redis das configuracoes da clinica',
          error as Error,
        );
      }
    }
  }

  private resolveTtl(): number {
    const rawMs = this.configService.get<string | number | undefined>(
      'CLINIC_CONFIGURATION_CACHE_TTL_MS',
    );
    const rawSeconds = this.configService.get<string | number | undefined>(
      'CLINIC_CONFIGURATION_CACHE_TTL_SECONDS',
    );

    const ttlFromMs = this.normalizeNumber(rawMs);
    if (ttlFromMs && ttlFromMs > 0) {
      return ttlFromMs;
    }

    const ttlFromSeconds = this.normalizeNumber(rawSeconds);
    if (ttlFromSeconds && ttlFromSeconds > 0) {
      return ttlFromSeconds * 1000;
    }

    return 10 * 60 * 1000;
  }

  private normalizeNumber(value: string | number | undefined): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private describeRedis(url: string): string {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname ?? 'host-desconhecido';
      const port = parsed.port ? `:${parsed.port}` : '';
      const db = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
      return `${host}${port}${db}`;
    } catch {
      return 'endpoint-desconhecido';
    }
  }

  private buildKey(
    tenantId: string,
    clinicId: string,
    section: ClinicConfigurationSection,
  ): string {
    return `${this.namespace}:${tenantId}:${clinicId}:${section}`;
  }

  private storeFallback(key: string, version: ClinicConfigurationVersion): void {
    this.fallbackStore.set(key, {
      value: this.cloneVersion(version),
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  private serializeVersion(version: ClinicConfigurationVersion): SerializedVersion {
    return {
      ...version,
      payload: JSON.parse(JSON.stringify(version.payload ?? {})),
      createdAt: version.createdAt.toISOString(),
      appliedAt: version.appliedAt ? version.appliedAt.toISOString() : undefined,
      telemetry: version.telemetry ? this.serializeTelemetry(version.telemetry) : undefined,
    };
  }

  private serializeTelemetry(telemetry: ClinicConfigurationTelemetry): SerializedTelemetry {
    return {
      ...telemetry,
      lastAttemptAt: telemetry.lastAttemptAt ? telemetry.lastAttemptAt.toISOString() : undefined,
      lastSavedAt: telemetry.lastSavedAt ? telemetry.lastSavedAt.toISOString() : undefined,
      lastErrorAt: telemetry.lastErrorAt ? telemetry.lastErrorAt.toISOString() : undefined,
    };
  }

  private deserializeVersion(payload: string): ClinicConfigurationVersion {
    const parsed = JSON.parse(payload) as SerializedVersion;
    return {
      ...parsed,
      payload: JSON.parse(JSON.stringify(parsed.payload ?? {})),
      createdAt: new Date(parsed.createdAt),
      appliedAt: parsed.appliedAt ? new Date(parsed.appliedAt) : undefined,
      telemetry: parsed.telemetry ? this.deserializeTelemetry(parsed.telemetry) : undefined,
    };
  }

  private deserializeTelemetry(telemetry: SerializedTelemetry): ClinicConfigurationTelemetry {
    return {
      ...telemetry,
      lastAttemptAt: telemetry.lastAttemptAt ? new Date(telemetry.lastAttemptAt) : undefined,
      lastSavedAt: telemetry.lastSavedAt ? new Date(telemetry.lastSavedAt) : undefined,
      lastErrorAt: telemetry.lastErrorAt ? new Date(telemetry.lastErrorAt) : undefined,
    };
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
