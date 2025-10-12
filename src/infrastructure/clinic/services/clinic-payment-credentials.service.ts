import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IClinicPaymentCredentialsService } from '../../../domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { ClinicPaymentCredentials } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

const DEFAULT_PROVIDER = 'asaas';

@Injectable()
export class ClinicPaymentCredentialsService implements IClinicPaymentCredentialsService {
  private readonly logger = new Logger(ClinicPaymentCredentialsService.name);

  constructor(private readonly configService: ConfigService) {}

  async resolveCredentials(input: {
    credentialsId: string;
    clinicId?: string;
    tenantId?: string;
  }): Promise<ClinicPaymentCredentials> {
    const normalizedKey = this.normalizeKey(input.credentialsId);
    const rawBase = this.configService.get<string>(normalizedKey);
    const rawSandbox = this.configService.get<string>(`${normalizedKey}_SANDBOX`);

    if (!rawBase || rawBase.trim().length === 0) {
      this.logger.error(
        `Credenciais de pagamento nao encontradas para ${input.credentialsId} (clinic=${input.clinicId ?? '?'})`,
      );
      throw ClinicErrorFactory.paymentCredentialsNotFound(
        'Credenciais de pagamento nao configuradas para a clinica',
      );
    }

    const credentials = this.parseCredentialPayload(rawBase, rawSandbox);

    if (!credentials.productionApiKey) {
      this.logger.error(
        `Credencial de pagamento invalida para ${input.credentialsId}: ausencia de productionApiKey`,
      );
      throw ClinicErrorFactory.paymentCredentialsInvalid(
        'Credenciais de pagamento configuradas de forma invalida',
      );
    }

    return {
      provider: DEFAULT_PROVIDER,
      productionApiKey: credentials.productionApiKey,
      sandboxApiKey: credentials.sandboxApiKey,
    };
  }

  private normalizeKey(credentialsId: string): string {
    const sanitized = credentialsId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return `CLINIC_PAYMENT_CREDENTIAL_${sanitized}`;
  }

  private parseCredentialPayload(
    baseValue: string,
    sandboxValue?: string,
  ): { productionApiKey?: string; sandboxApiKey?: string } {
    const result: { productionApiKey?: string; sandboxApiKey?: string } = {};

    const trimmedBase = baseValue.trim();
    if (trimmedBase.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmedBase) as Record<string, unknown>;
        result.productionApiKey = this.pickString(parsed, [
          'productionApiKey',
          'apiKey',
          'key',
          'token',
        ]);
        result.sandboxApiKey =
          this.pickString(parsed, ['sandboxApiKey', 'sandboxKey', 'sandbox', 'sandboxToken']) ??
          result.sandboxApiKey;
      } catch (error) {
        this.logger.error('Falha ao interpretar credencial de pagamento JSON', error as Error);
        result.productionApiKey = trimmedBase;
      }
    } else {
      result.productionApiKey = trimmedBase;
    }

    if (sandboxValue && sandboxValue.trim().length > 0) {
      result.sandboxApiKey = sandboxValue.trim();
    }

    return result;
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }
}
