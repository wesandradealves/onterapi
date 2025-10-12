import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { ZodApiBody } from '../../../../shared/decorators/zod-api-body.decorator';
import { ClinicHoldResponseDto } from '../dtos/clinic-hold-response.dto';
import { ClinicAppointmentConfirmationResponseDto } from '../dtos/clinic-appointment-confirmation-response.dto';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import {
  createClinicHoldSchema,
  CreateClinicHoldSchema,
} from '../schemas/create-clinic-hold.schema';
import {
  confirmClinicHoldSchema,
  ConfirmClinicHoldSchema,
} from '../schemas/confirm-clinic-hold.schema';
import {
  ClinicRequestContext,
  toConfirmClinicHoldInput,
  toCreateClinicHoldInput,
} from '../mappers/clinic-request.mapper';
import {
  type ICreateClinicHoldUseCase,
  ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
import {
  type IConfirmClinicAppointmentUseCase,
  IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/holds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicHoldController {
  constructor(
    @Inject(ICreateClinicHoldUseCaseToken)
    private readonly createClinicHoldUseCase: ICreateClinicHoldUseCase,
    @Inject(IConfirmClinicAppointmentUseCaseToken)
    private readonly confirmClinicAppointmentUseCase: IConfirmClinicAppointmentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.SECRETARY,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Criar hold clínico' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 201, type: ClinicHoldResponseDto })
  @ZodApiBody({ schema: createClinicHoldSchema })
  async createHold(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(createClinicHoldSchema)) body: CreateClinicHoldSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicHoldResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);
    const input = toCreateClinicHoldInput(clinicId, body, context);

    const hold = await this.createClinicHoldUseCase.executeOrThrow(input);
    return ClinicPresenter.hold(hold);
  }

  @Post(':holdId/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.SECRETARY,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Confirmar hold clÃ­nico' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'holdId', type: String })
  @ApiResponse({ status: 200, type: ClinicAppointmentConfirmationResponseDto })
  @ZodApiBody({ schema: confirmClinicHoldSchema })
  async confirmHold(
    @Param('clinicId') clinicId: string,
    @Param('holdId') holdId: string,
    @Body(new ZodValidationPipe(confirmClinicHoldSchema)) body: ConfirmClinicHoldSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicAppointmentConfirmationResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);
    const input = toConfirmClinicHoldInput(clinicId, holdId, body, context);

    const confirmation = await this.confirmClinicAppointmentUseCase.executeOrThrow(input);

    return ClinicPresenter.holdConfirmation(confirmation);
  }

  private resolveContext(currentUser: ICurrentUser, tenantId?: string): ClinicRequestContext {
    const resolvedTenantId = tenantId ?? currentUser.tenantId;

    if (!resolvedTenantId) {
      throw new BadRequestException('Tenant não informado');
    }

    return {
      tenantId: resolvedTenantId,
      userId: currentUser.id,
    };
  }
}
