import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../auth/decorators/public.decorator';
import {
  type IProcessClinicPaymentWebhookUseCase,
  IProcessClinicPaymentWebhookUseCase as IProcessClinicPaymentWebhookUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/process-clinic-payment-webhook.use-case.interface';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import {
  clinicAsaasWebhookSchema,
  ClinicAsaasWebhookSchema,
} from '../schemas/clinic-asaas-webhook.schema';
import { ClinicAsaasWebhookGuard } from '../../guards/clinic-asaas-webhook.guard';
import { ZodApiBody } from '../../../../shared/decorators/zod-api-body.decorator';

@ApiTags('Clinic Webhooks')
@Controller('integrations/asaas/webhook')
export class ClinicPaymentWebhookController {
  constructor(
    @Inject(IProcessClinicPaymentWebhookUseCaseToken)
    private readonly processWebhookUseCase: IProcessClinicPaymentWebhookUseCase,
  ) {}

  @Public()
  @Post()
  @UseGuards(ClinicAsaasWebhookGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Webhook de pagamentos ASAAS',
    description: 'Processa eventos de pagamento do ASAAS e sincroniza status na agenda da clinica.',
  })
  @ApiResponse({ status: 202, description: 'Evento recebido para processamento.' })
  @ZodApiBody({ schema: clinicAsaasWebhookSchema })
  async handleWebhook(
    @Body(new ZodValidationPipe(clinicAsaasWebhookSchema)) body: ClinicAsaasWebhookSchema,
  ): Promise<void> {
    await this.processWebhookUseCase.executeOrThrow({
      provider: 'asaas',
      payload: body,
      receivedAt: new Date(),
    });
  }
}
