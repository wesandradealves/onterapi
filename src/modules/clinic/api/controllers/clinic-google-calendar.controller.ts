import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../auth/decorators/public.decorator';
import {
  IProcessClinicExternalCalendarEventUseCase,
  IProcessClinicExternalCalendarEventUseCase as IProcessClinicExternalCalendarEventUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/process-clinic-external-calendar-event.use-case.interface';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { ZodApiBody } from '../../../../shared/decorators/zod-api-body.decorator';
import {
  ClinicGoogleWebhookSchema,
  clinicGoogleWebhookSchema,
} from '../schemas/clinic-google-webhook.schema';
import { ClinicGoogleWebhookGuard } from '../../guards/clinic-google-webhook.guard';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicExternalCalendarEventResponseDto } from '../dtos/clinic-external-calendar-event-response.dto';

@ApiTags('Clinic Webhooks')
@Controller('integrations/google-calendar/webhook')
export class ClinicGoogleCalendarController {
  constructor(
    @Inject(IProcessClinicExternalCalendarEventUseCaseToken)
    private readonly processExternalEventUseCase: IProcessClinicExternalCalendarEventUseCase,
  ) {}

  @Public()
  @Post()
  @UseGuards(ClinicGoogleWebhookGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Webhook de eventos do Google Calendar',
    description:
      'Recebe eventos externos do Google Calendar e registra bloqueios pendentes conforme regras da clinica.',
  })
  @ApiResponse({
    status: 202,
    description: 'Evento recebido para processamento.',
    type: ClinicExternalCalendarEventResponseDto,
  })
  @ZodApiBody({ schema: clinicGoogleWebhookSchema })
  async handleGoogleEvent(
    @Body(new ZodValidationPipe(clinicGoogleWebhookSchema)) body: ClinicGoogleWebhookSchema,
  ): Promise<ClinicExternalCalendarEventResponseDto> {
    const result = await this.processExternalEventUseCase.executeOrThrow({
      tenantId: body.tenantId,
      clinicId: body.clinicId,
      professionalId: body.professionalId,
      triggeredBy: body.triggeredBy,
      payload: {
        externalEventId: body.event.externalEventId,
        status: body.event.status,
        startAt: body.event.startAt,
        endAt: body.event.endAt,
        timezone: body.event.timezone,
        summary: body.event.summary,
        description: body.event.description,
        locationId: body.event.locationId,
        resources: body.event.resources,
        calendarId: body.event.calendarId,
        rawPayload: body.event.rawPayload,
      },
    });

    return ClinicPresenter.externalCalendarEvent(result);
  }
}
