import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
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
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicConfigurationVersionResponseDto } from '../dtos/clinic-configuration-response.dto';
import { ClinicGeneralSettingsResponseDto } from '../dtos/clinic-general-settings-response.dto';
import { ClinicHoldSettingsResponseDto } from '../dtos/clinic-hold-settings-response.dto';
import { ClinicTeamSettingsResponseDto } from '../dtos/clinic-team-settings-response.dto';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import {
  updateClinicGeneralSettingsSchema,
  UpdateClinicGeneralSettingsSchema,
} from '../schemas/update-clinic-general-settings.schema';
import {
  updateClinicHoldSettingsSchema,
  UpdateClinicHoldSettingsSchema,
} from '../schemas/update-clinic-hold-settings.schema';
import {
  ClinicRequestContext,
  toUpdateClinicGeneralSettingsInput,
  toUpdateClinicHoldSettingsInput,
} from '../mappers/clinic-request.mapper';
import {
  type IUpdateClinicGeneralSettingsUseCase,
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import {
  type IUpdateClinicHoldSettingsUseCase,
  IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import {
  type IGetClinicGeneralSettingsUseCase,
  IGetClinicGeneralSettingsUseCase as IGetClinicGeneralSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-general-settings.use-case.interface';
import {
  type IGetClinicUseCase,
  IGetClinicUseCase as IGetClinicUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import {
  type IGetClinicTeamSettingsUseCase,
  IGetClinicTeamSettingsUseCase as IGetClinicTeamSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-team-settings.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicConfigurationController {
  constructor(
    @Inject(IUpdateClinicGeneralSettingsUseCaseToken)
    private readonly updateClinicGeneralSettingsUseCase: IUpdateClinicGeneralSettingsUseCase,
    @Inject(IUpdateClinicHoldSettingsUseCaseToken)
    private readonly updateClinicHoldSettingsUseCase: IUpdateClinicHoldSettingsUseCase,
    @Inject(IGetClinicGeneralSettingsUseCaseToken)
    private readonly getClinicGeneralSettingsUseCase: IGetClinicGeneralSettingsUseCase,
    @Inject(IGetClinicTeamSettingsUseCaseToken)
    private readonly getClinicTeamSettingsUseCase: IGetClinicTeamSettingsUseCase,
    @Inject(IGetClinicUseCaseToken)
    private readonly getClinicUseCase: IGetClinicUseCase,
  ) {}

  @Get('general')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configurações gerais atuais da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicGeneralSettingsResponseDto })
  async getGeneralSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicGeneralSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicGeneralSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.generalSettings(version);
  }

  @Get('hold')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configurações de hold da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicHoldSettingsResponseDto })
  async getHoldSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicHoldSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const clinic = await this.getClinicUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.holdSettings(clinic);
  }

  @Get('team')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configurações de equipe da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicTeamSettingsResponseDto })
  async getTeamSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicTeamSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicTeamSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.teamSettings(version);
  }

  @Patch('general')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configurações gerais da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicConfigurationVersionResponseDto })
  @ZodApiBody({ schema: updateClinicGeneralSettingsSchema })
  async updateGeneralSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicGeneralSettingsSchema))
    body: UpdateClinicGeneralSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicConfigurationVersionResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicGeneralSettingsInput(clinicId, body, context);
    const version = await this.updateClinicGeneralSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.configuration(version);
  }

  @Patch('hold')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configurações de hold da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicSummaryDto })
  @ZodApiBody({ schema: updateClinicHoldSettingsSchema })
  async updateHoldSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicHoldSettingsSchema))
    body: UpdateClinicHoldSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicSummaryDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicHoldSettingsInput(clinicId, body, context);
    const clinic = await this.updateClinicHoldSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.summary(clinic);
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
