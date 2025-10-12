import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IClinicPaymentGatewayService,
  VerifyClinicPaymentInput,
  VerifyClinicPaymentResult,
} from '../../../domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import { ClinicPaymentStatus } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface AsaasPaymentResponse {
  id?: string;
  status?: string;
  paymentDate?: string;
  netValue?: number;
  value?: number;
  customer?: string;
}

@Injectable()
export class ClinicAsaasGatewayService implements IClinicPaymentGatewayService {
  private readonly logger = new Logger(ClinicAsaasGatewayService.name);
  private readonly defaultBaseUrl = 'https://www.asaas.com/api/v3';
  private readonly defaultSandboxUrl = 'https://sandbox.asaas.com/api/v3';
  private readonly requestTimeoutMs = 10_000;

  constructor(private readonly configService: ConfigService) {}

  async verifyPayment(input: VerifyClinicPaymentInput): Promise<VerifyClinicPaymentResult> {
    if (input.provider !== 'asaas') {
      throw ClinicErrorFactory.paymentProviderNotSupported('Gateway de pagamento nao suportado');
    }

    const apiKey = input.sandboxMode
      ? input.credentials.sandboxApiKey ?? input.credentials.productionApiKey
      : input.credentials.productionApiKey;

    if (!apiKey) {
      throw ClinicErrorFactory.paymentCredentialsInvalid(
        'Credencial ASAAS nao disponivel para o ambiente selecionado',
      );
    }

    const baseUrl = input.sandboxMode
      ? this.configService.get<string>('ASAAS_SANDBOX_BASE_URL') ?? this.defaultSandboxUrl
      : this.configService.get<string>('ASAAS_BASE_URL') ?? this.defaultBaseUrl;

    const url = `${baseUrl.replace(/\/$/, '')}/payments/${encodeURIComponent(input.paymentId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => undefined);
        this.logger.error(
          `ASAAS respondeu com status ${response.status} para pagamento ${input.paymentId}`,
        );
        throw ClinicErrorFactory.paymentVerificationFailed(
          bodyText && bodyText.length < 200 ? bodyText : 'Falha ao consultar pagamento no ASAAS',
        );
      }

      const payload = (await response.json()) as AsaasPaymentResponse;
      const status = this.mapStatus(payload.status);

      if (!status) {
        throw ClinicErrorFactory.paymentVerificationFailed(
          `Status ASAAS desconhecido: ${payload.status ?? 'indefinido'}`,
        );
      }

      return {
        status,
        providerStatus: payload.status ?? 'UNKNOWN',
        paidAt: payload.paymentDate ? new Date(payload.paymentDate) : undefined,
        metadata: {
          value: payload.value,
          netValue: payload.netValue,
          customer: payload.customer,
          id: payload.id,
        },
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error(
          `Timeout consultando pagamento ASAAS ${input.paymentId} (sandbox=${input.sandboxMode})`,
        );
        throw ClinicErrorFactory.paymentVerificationFailed(
          'Tempo excedido ao consultar pagamento no ASAAS',
        );
      }

      this.logger.error(
        `Erro ao consultar pagamento ASAAS ${input.paymentId}: ${(error as Error).message}`,
        error as Error,
      );
      throw ClinicErrorFactory.paymentVerificationFailed(
        'Nao foi possivel validar o pagamento no ASAAS',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapStatus(status?: string): ClinicPaymentStatus | null {
    if (!status) {
      return null;
    }

    const normalized = status.toUpperCase();

    switch (normalized) {
      case 'RECEIVED':
      case 'RECEIVED_IN_CASH':
      case 'CONFIRMED':
      case 'RECEIVED_PARTIAL':
      case 'DUNNING_RECEIVED':
      case 'DUNNING_REQUESTED':
      case 'PAID_OVER':
        return 'approved';
      case 'REFUNDED':
        return 'refunded';
      case 'CHARGEBACK_REQUESTED':
      case 'CHARGEBACK_DISPUTE':
      case 'AWAITING_CHARGEBACK_REVERSAL':
        return 'chargeback';
      case 'RECEIVED_IN_ADVANCE':
      case 'ANTECIPATED':
        return 'settled';
      case 'PENDING':
      case 'PENDING_CUSTOMER':
      case 'AWAITING_RISK_ANALYSIS':
      case 'AWAITING_DOCUMENTS':
      case 'OVERDUE':
      case 'CANCELED':
      case 'EXPIRED':
      case 'DELETED':
      default:
        return normalized === 'SETTLED' ? 'settled' : 'failed';
    }
  }
}


