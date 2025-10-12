import {
  BadRequestException,
  Body,
  Controller,
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
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicConfigurationVersionResponseDto } from '../dtos/clinic-configuration-response.dto';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import { updateClinicGeneralSettingsSchema, UpdateClinicGeneralSettingsSchema } from '../schemas/update-clinic-general-settings.schema';
import { updateClinicHoldSettingsSchema, UpdateClinicHoldSettingsSchema } from '../schemas/update-clinic-hold-settings.schema';
import {
  ClinicRequestContext,
  toUpdateClinicGeneralSettingsInput,
  toUpdateClinicHoldSettingsInput,
} from '../mappers/clinic-request.mapper';
import type { IUpdateClinicGeneralSettingsUseCase } from '../../../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import type { IUpdateClinicHoldSettingsUseCase } from '../../../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import { IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';

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
  ) {}

  @Patch('general')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configurações gerais da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicConfigurationVersionResponseDto })
  async updateGeneralSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicGeneralSettingsSchema)) body: UpdateClinicGeneralSettingsSchema,
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
  async updateHoldSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicHoldSettingsSchema)) body: UpdateClinicHoldSettingsSchema,
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
