import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IClinicPaymentGatewayService,
  VerifyClinicPaymentInput,
  VerifyClinicPaymentResult,
} from '../../../domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { mapAsaasPaymentStatus } from '../../../modules/clinic/utils/asaas-payment-status.mapper';

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
      ? (input.credentials.sandboxApiKey ?? input.credentials.productionApiKey)
      : input.credentials.productionApiKey;

    if (!apiKey) {
      throw ClinicErrorFactory.paymentCredentialsInvalid(
        'Credencial ASAAS nao disponivel para o ambiente selecionado',
      );
    }

    const baseUrl = input.sandboxMode
      ? (this.configService.get<string>('ASAAS_SANDBOX_BASE_URL') ?? this.defaultSandboxUrl)
      : (this.configService.get<string>('ASAAS_BASE_URL') ?? this.defaultBaseUrl);

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
      const status = mapAsaasPaymentStatus(payload.status);

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
}
