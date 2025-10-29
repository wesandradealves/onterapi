import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ExecuteClinicPaymentPayoutInput,
  ExecuteClinicPaymentPayoutResult,
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

interface AsaasTransferResponse {
  id?: string;
  status?: string;
  scheduleDate?: string;
  transferDate?: string;
  value?: number;
  description?: string;
  failureReason?: string;
  [key: string]: unknown;
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

  async executePayout(
    input: ExecuteClinicPaymentPayoutInput,
  ): Promise<ExecuteClinicPaymentPayoutResult> {
    if (input.provider !== 'asaas') {
      throw ClinicErrorFactory.paymentProviderNotSupported('Gateway de payout nao suportado');
    }

    if (!input.bankAccountId || input.bankAccountId.trim().length === 0) {
      throw ClinicErrorFactory.paymentPayoutFailed(
        'Conta bancaria destino nao configurada para o provedor ASAAS',
      );
    }

    const apiKey = input.sandboxMode
      ? (input.credentials.sandboxApiKey ?? input.credentials.productionApiKey)
      : input.credentials.productionApiKey;

    if (!apiKey) {
      throw ClinicErrorFactory.paymentCredentialsInvalid(
        'Credencial ASAAS nao disponivel para executar o payout',
      );
    }

    const baseUrl = input.sandboxMode
      ? (this.configService.get<string>('ASAAS_SANDBOX_BASE_URL') ?? this.defaultSandboxUrl)
      : (this.configService.get<string>('ASAAS_BASE_URL') ?? this.defaultBaseUrl);

    const url = `${baseUrl.replace(/\/$/, '')}/transfers`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const payload = {
        value: (input.amountCents / 100).toFixed(2),
        bankAccountId: input.bankAccountId,
        description: input.description,
        externalReference: input.externalReference,
        metadata: input.metadata ?? {},
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => undefined);
        this.logger.error(
          `ASAAS respondeu com status ${response.status} ao solicitar payout (externalRef=${input.externalReference})`,
        );
        throw ClinicErrorFactory.paymentPayoutFailed(
          bodyText && bodyText.length < 200 ? bodyText : 'Falha ao solicitar payout no ASAAS',
        );
      }

      const body = (await response.json()) as AsaasTransferResponse;
      const normalizedStatus = (body.status ?? '').toUpperCase();

      const status: ExecuteClinicPaymentPayoutResult['status'] =
        normalizedStatus === 'DONE' || normalizedStatus === 'COMPLETED'
          ? 'completed'
          : 'processing';

      const executedAtRaw = body.transferDate ?? body.scheduleDate;
      const executedAt = executedAtRaw ? new Date(executedAtRaw) : undefined;

      return {
        payoutId: body.id ?? input.externalReference,
        status,
        executedAt,
        providerResponse: body,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error(
          `Timeout ao solicitar payout ASAAS (externalRef=${input.externalReference}, sandbox=${input.sandboxMode})`,
        );
        throw ClinicErrorFactory.paymentPayoutFailed('Tempo excedido ao solicitar payout no ASAAS');
      }

      this.logger.error(
        `Erro ao solicitar payout ASAAS (externalRef=${input.externalReference}): ${(error as Error).message}`,
        error as Error,
      );
      throw ClinicErrorFactory.paymentPayoutFailed('Nao foi possivel solicitar o payout no ASAAS');
    } finally {
      clearTimeout(timeout);
    }
  }
}
