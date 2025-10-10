import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe';
import {
  CreateBookingUseCaseInput,
  ICreateBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/create-booking.use-case.interface';
import {
  CancelBookingUseCaseInput,
  ICancelBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/cancel-booking.use-case.interface';
import {
  CreateHoldUseCaseInput,
  ICreateHoldUseCase,
} from '@domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import {
  ConfirmBookingUseCaseInput,
  IConfirmBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/confirm-booking.use-case.interface';
import {
  IRescheduleBookingUseCase,
  RescheduleBookingUseCaseInput,
} from '@domain/scheduling/interfaces/use-cases/reschedule-booking.use-case.interface';
import {
  IMarkBookingNoShowUseCase,
  MarkBookingNoShowUseCaseInput,
} from '@domain/scheduling/interfaces/use-cases/mark-booking-no-show.use-case.interface';
import {
  IRecordPaymentStatusUseCase,
  RecordPaymentStatusUseCaseInput,
} from '@domain/scheduling/interfaces/use-cases/record-payment-status.use-case.interface';
import { BookingPresenter } from '../presenters/booking.presenter';
import { BookingHoldPresenter } from '../presenters/booking-hold.presenter';
import { BookingResponseDto } from '../dtos/booking-response.dto';
import { BookingHoldResponseDto } from '../dtos/booking-hold-response.dto';
import { CreateBookingDto } from '../dtos/create-booking.dto';
import { CancelBookingDto } from '../dtos/cancel-booking.dto';
import { CreateHoldDto } from '../dtos/create-hold.dto';
import { ConfirmBookingDto } from '../dtos/confirm-booking.dto';
import { RescheduleBookingDto } from '../dtos/reschedule-booking.dto';
import { MarkBookingNoShowDto } from '../dtos/mark-booking-no-show.dto';
import { UpdatePaymentStatusDto } from '../dtos/update-payment-status.dto';
import { CreateBookingSchema, createBookingSchema } from '../schemas/create-booking.schema';
import { CancelBookingSchema, cancelBookingSchema } from '../schemas/cancel-booking.schema';
import { CreateHoldSchema, createHoldSchema } from '../schemas/create-hold.schema';
import { ConfirmBookingSchema, confirmBookingSchema } from '../schemas/confirm-booking.schema';
import {
  RescheduleBookingSchema,
  rescheduleBookingSchema,
} from '../schemas/reschedule-booking.schema';
import {
  MarkBookingNoShowSchema,
  markBookingNoShowSchema,
} from '../schemas/mark-booking-no-show.schema';
import {
  UpdatePaymentStatusSchema,
  updatePaymentStatusSchema,
} from '../schemas/update-payment-status.schema';
import {
  SchedulingRequestContext,
  toCancelBookingInput,
  toConfirmBookingInput,
  toCreateBookingInput,
  toCreateHoldInput,
  toMarkBookingNoShowInput,
  toRecordPaymentStatusInput,
  toRescheduleBookingInput,
} from '../mappers/booking-request.mapper';

@ApiTags('Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scheduling')
export class SchedulingController {
  private readonly logger = new Logger(SchedulingController.name);

  constructor(
    @Inject(ICreateBookingUseCase)
    private readonly createBookingUseCase: ICreateBookingUseCase,
    @Inject(ICancelBookingUseCase)
    private readonly cancelBookingUseCase: ICancelBookingUseCase,
    @Inject(ICreateHoldUseCase)
    private readonly createHoldUseCase: ICreateHoldUseCase,
    @Inject(IConfirmBookingUseCase)
    private readonly confirmBookingUseCase: IConfirmBookingUseCase,
    @Inject(IRescheduleBookingUseCase)
    private readonly rescheduleBookingUseCase: IRescheduleBookingUseCase,
    @Inject(IMarkBookingNoShowUseCase)
    private readonly markBookingNoShowUseCase: IMarkBookingNoShowUseCase,
    @Inject(IRecordPaymentStatusUseCase)
    private readonly recordPaymentStatusUseCase: IRecordPaymentStatusUseCase,
  ) {}

  @Post('holds')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Criar hold de agendamento',
    description: 'Reserva um horário na agenda considerando conflitos e janela mínima.',
  })
  @ApiBody({ type: CreateHoldDto })
  @ApiResponse({ status: 201, type: BookingHoldResponseDto })
  async createHold(
    @Body(new ZodValidationPipe(createHoldSchema)) body: CreateHoldSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingHoldResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: CreateHoldUseCaseInput = toCreateHoldInput(body, context);

    const hold = await this.createHoldUseCase.executeOrThrow(input);

    this.logger.log('Hold criado com sucesso', {
      holdId: hold.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    return BookingHoldPresenter.toResponse(hold);
  }

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Criar agendamento a partir de um hold',
    description:
      'Confirma um hold ativo e cria o agendamento correspondente, publicando evento de criacao.',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async createBooking(
    @Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: CreateBookingUseCaseInput = toCreateBookingInput(body, context);

    const booking = await this.createBookingUseCase.executeOrThrow(input);

    this.logger.log('Agendamento criado com sucesso', {
      bookingId: booking.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    return BookingPresenter.toResponse(booking);
  }

  @Post('bookings/:bookingId/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Confirmar agendamento',
    description:
      'Confirma o agendamento, atualiza status financeiro e publica o evento correspondente.',
  })
  @ApiParam({ name: 'bookingId', description: 'Identificador do agendamento' })
  @ApiBody({ type: ConfirmBookingDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async confirmBooking(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(confirmBookingSchema)) body: ConfirmBookingSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: ConfirmBookingUseCaseInput = toConfirmBookingInput(bookingId, body, context);

    const confirmed = await this.confirmBookingUseCase.executeOrThrow(input);

    this.logger.log('Agendamento confirmado', {
      bookingId: confirmed.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
      holdId: body.holdId,
      paymentStatus: confirmed.paymentStatus,
    });

    return BookingPresenter.toResponse(confirmed);
  }

  @Post('bookings/:bookingId/reschedule')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Reagendar atendimento',
    description:
      'Atualiza horário do atendimento e aplica controles de recorrência, emitindo o evento de reagendamento.',
  })
  @ApiParam({ name: 'bookingId', description: 'Identificador do agendamento' })
  @ApiBody({ type: RescheduleBookingDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async rescheduleBooking(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(rescheduleBookingSchema)) body: RescheduleBookingSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: RescheduleBookingUseCaseInput = toRescheduleBookingInput(bookingId, body, context);

    const rescheduled = await this.rescheduleBookingUseCase.executeOrThrow(input);

    this.logger.log('Agendamento reagendado', {
      bookingId: rescheduled.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
      newStartAt: rescheduled.startAtUtc.toISOString(),
      newEndAt: rescheduled.endAtUtc.toISOString(),
      reason: body.reason,
    });

    return BookingPresenter.toResponse(rescheduled);
  }

  @Post('bookings/:bookingId/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Cancelar agendamento',
    description: 'Cancela o agendamento informado e publica o evento de cancelamento.',
  })
  @ApiParam({ name: 'bookingId', description: 'Identificador do agendamento' })
  @ApiBody({ type: CancelBookingDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async cancelBooking(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(cancelBookingSchema)) body: CancelBookingSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: CancelBookingUseCaseInput = toCancelBookingInput(bookingId, body, context);

    const cancelled = await this.cancelBookingUseCase.executeOrThrow(input);

    this.logger.log('Agendamento cancelado', {
      bookingId: cancelled.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
      reason: body.reason ?? null,
    });

    return BookingPresenter.toResponse(cancelled);
  }

  @Patch('bookings/:bookingId/payment-status')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Atualizar status financeiro',
    description:
      'Registra a mudanca de status de pagamento do agendamento e notifica consumidores via evento.',
  })
  @ApiParam({ name: 'bookingId', description: 'Identificador do agendamento' })
  @ApiBody({ type: UpdatePaymentStatusDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async updatePaymentStatus(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(updatePaymentStatusSchema))
    body: UpdatePaymentStatusSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: RecordPaymentStatusUseCaseInput = toRecordPaymentStatusInput(
      bookingId,
      body,
      context,
    );

    const updated = await this.recordPaymentStatusUseCase.executeOrThrow(input);

    this.logger.log('Status de pagamento atualizado', {
      bookingId: updated.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
      paymentStatus: updated.paymentStatus,
    });

    return BookingPresenter.toResponse(updated);
  }

  @Post('bookings/:bookingId/no-show')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Marcar no-show',
    description:
      'Marca o agendamento como no-show após validar a tolerância configurada e publica o evento correspondente.',
  })
  @ApiParam({ name: 'bookingId', description: 'Identificador do agendamento' })
  @ApiBody({ type: MarkBookingNoShowDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async markNoShow(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(markBookingNoShowSchema)) body: MarkBookingNoShowSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<BookingResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const input: MarkBookingNoShowUseCaseInput = toMarkBookingNoShowInput(bookingId, body, context);

    const noShow = await this.markBookingNoShowUseCase.executeOrThrow(input);

    this.logger.log('Agendamento marcado como no-show', {
      bookingId: noShow.id,
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
      markedAt: noShow.noShowMarkedAtUtc?.toISOString() ?? null,
    });

    return BookingPresenter.toResponse(noShow);
  }

  private resolveContext(
    currentUser: ICurrentUser,
    tenantOverride?: string | null,
  ): SchedulingRequestContext {
    return {
      tenantId: this.resolveTenantId(currentUser, tenantOverride),
      userId: currentUser.id,
      role: currentUser.role,
    };
  }

  private resolveTenantId(currentUser: ICurrentUser, tenantOverride?: string | null): string {
    const metadata = (currentUser.metadata ?? {}) as Record<string, unknown>;
    const normalizedOverride = typeof tenantOverride === 'string' ? tenantOverride.trim() : '';
    const isSuperAdmin = currentUser.role === RolesEnum.SUPER_ADMIN;

    const metadataTenantId = this.extractTenant(metadata['tenantId']);
    const metadataTenantLegacy = this.extractTenant(metadata['tenant_id']);

    const knownTenantIds = [currentUser?.tenantId, metadataTenantId, metadataTenantLegacy].filter(
      (value): value is string => Boolean(value && value.trim().length),
    );

    if (normalizedOverride) {
      if (isSuperAdmin) {
        this.logger.log('Tenant override aceito (super admin)', {
          userId: currentUser.id,
          tenantOverride: normalizedOverride,
        });
        return normalizedOverride;
      }

      if (!knownTenantIds.includes(normalizedOverride)) {
        this.logger.warn('Tenant override rejeitado', {
          userId: currentUser.id,
          role: currentUser.role,
          tenantOverride: normalizedOverride,
          knownTenantIds,
        });
        throw new ForbiddenException('Tenant informado nao pertence ao usuario');
      }

      return normalizedOverride;
    }

    const tenantId = knownTenantIds[0] ?? '';

    if (!tenantId) {
      this.logger.error('Impossivel resolver tenant do usuario', {
        userId: currentUser.id,
        role: currentUser.role,
        tenantOverride: normalizedOverride || null,
        tokenTenantId: currentUser?.tenantId ?? null,
        metadataTenantId,
        metadataTenantLegacy,
      });
      throw new ForbiddenException('Usuario nao possui tenant associado');
    }

    return tenantId;
  }

  private extractTenant(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
}
