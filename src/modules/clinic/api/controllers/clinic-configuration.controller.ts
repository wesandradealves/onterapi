import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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
import { ClinicScheduleSettingsResponseDto } from '../dtos/clinic-schedule-settings-response.dto';
import { ClinicPaymentSettingsResponseDto } from '../dtos/clinic-payment-settings-response.dto';
import { ClinicServiceSettingsResponseDto } from '../dtos/clinic-service-settings-response.dto';
import { ClinicIntegrationSettingsResponseDto } from '../dtos/clinic-integration-settings-response.dto';
import { ClinicNotificationSettingsResponseDto } from '../dtos/clinic-notification-settings-response.dto';
import { ClinicBrandingSettingsResponseDto } from '../dtos/clinic-branding-settings-response.dto';
import { ClinicSecuritySettingsResponseDto } from '../dtos/clinic-security-settings-response.dto';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import { ClinicTemplatePropagationResponseDto } from '../dtos/clinic-template-propagation-response.dto';
import { ClinicTemplateOverrideListResponseDto } from '../dtos/clinic-template-overrides-response.dto';
import { Response } from 'express';
import { ClinicConfigurationExportService } from '../../services/clinic-configuration-export.service';
import {
  updateClinicGeneralSettingsSchema,
  UpdateClinicGeneralSettingsSchema,
} from '../schemas/update-clinic-general-settings.schema';
import {
  updateClinicTeamSettingsSchema,
  UpdateClinicTeamSettingsSchema,
} from '../schemas/update-clinic-team-settings.schema';
import {
  updateClinicHoldSettingsSchema,
  UpdateClinicHoldSettingsSchema,
} from '../schemas/update-clinic-hold-settings.schema';
import {
  updateClinicScheduleSettingsSchema,
  UpdateClinicScheduleSettingsSchema,
} from '../schemas/update-clinic-schedule-settings.schema';
import {
  updateClinicServiceSettingsSchema,
  UpdateClinicServiceSettingsSchema,
} from '../schemas/update-clinic-service-settings.schema';
import {
  updateClinicPaymentSettingsSchema,
  UpdateClinicPaymentSettingsSchema,
} from '../schemas/update-clinic-payment-settings.schema';
import {
  updateClinicIntegrationSettingsSchema,
  UpdateClinicIntegrationSettingsSchema,
} from '../schemas/update-clinic-integration-settings.schema';
import {
  updateClinicNotificationSettingsSchema,
  UpdateClinicNotificationSettingsSchema,
} from '../schemas/update-clinic-notification-settings.schema';
import {
  updateClinicBrandingSettingsSchema,
  UpdateClinicBrandingSettingsSchema,
} from '../schemas/update-clinic-branding-settings.schema';
import {
  updateClinicSecuritySettingsSchema,
  UpdateClinicSecuritySettingsSchema,
} from '../schemas/update-clinic-security-settings.schema';
import { ClinicScopeGuard } from '../../guards/clinic-scope.guard';
import {
  propagateClinicTemplateSchema,
  PropagateClinicTemplateSchema,
} from '../schemas/propagate-clinic-template.schema';
import {
  listClinicTemplateOverridesSchema,
  ListClinicTemplateOverridesSchema,
} from '../schemas/list-clinic-template-overrides.schema';
import { ClinicTemplateOverride } from '../../../../domain/clinic/types/clinic.types';
import {
  ClinicRequestContext,
  toPropagateClinicTemplateInput,
  toUpdateClinicBrandingSettingsInput,
  toUpdateClinicGeneralSettingsInput,
  toUpdateClinicHoldSettingsInput,
  toUpdateClinicIntegrationSettingsInput,
  toUpdateClinicNotificationSettingsInput,
  toUpdateClinicPaymentSettingsInput,
  toUpdateClinicScheduleSettingsInput,
  toUpdateClinicSecuritySettingsInput,
  toUpdateClinicServiceSettingsInput,
  toUpdateClinicTeamSettingsInput,
} from '../mappers/clinic-request.mapper';
import {
  type IUpdateClinicGeneralSettingsUseCase,
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import {
  type IUpdateClinicTeamSettingsUseCase,
  IUpdateClinicTeamSettingsUseCase as IUpdateClinicTeamSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-team-settings.use-case.interface';
import {
  type IUpdateClinicHoldSettingsUseCase,
  IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import {
  type IUpdateClinicServiceSettingsUseCase,
  IUpdateClinicServiceSettingsUseCase as IUpdateClinicServiceSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-service-settings.use-case.interface';
import {
  type IUpdateClinicPaymentSettingsUseCase,
  IUpdateClinicPaymentSettingsUseCase as IUpdateClinicPaymentSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-payment-settings.use-case.interface';
import {
  type IUpdateClinicIntegrationSettingsUseCase,
  IUpdateClinicIntegrationSettingsUseCase as IUpdateClinicIntegrationSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-integration-settings.use-case.interface';
import {
  type IUpdateClinicNotificationSettingsUseCase,
  IUpdateClinicNotificationSettingsUseCase as IUpdateClinicNotificationSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-notification-settings.use-case.interface';
import {
  type IUpdateClinicBrandingSettingsUseCase,
  IUpdateClinicBrandingSettingsUseCase as IUpdateClinicBrandingSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-branding-settings.use-case.interface';
import {
  type IPropagateClinicTemplateUseCase,
  IPropagateClinicTemplateUseCase as IPropagateClinicTemplateUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/propagate-clinic-template.use-case.interface';
import {
  type IListClinicTemplateOverridesUseCase,
  IListClinicTemplateOverridesUseCase as IListClinicTemplateOverridesUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-template-overrides.use-case.interface';
import {
  type IUpdateClinicScheduleSettingsUseCase,
  IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
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
import {
  type IGetClinicScheduleSettingsUseCase,
  IGetClinicScheduleSettingsUseCase as IGetClinicScheduleSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-schedule-settings.use-case.interface';
import {
  type IGetClinicServiceSettingsUseCase,
  IGetClinicServiceSettingsUseCase as IGetClinicServiceSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-service-settings.use-case.interface';
import {
  type IGetClinicPaymentSettingsUseCase,
  IGetClinicPaymentSettingsUseCase as IGetClinicPaymentSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-payment-settings.use-case.interface';
import {
  type IGetClinicIntegrationSettingsUseCase,
  IGetClinicIntegrationSettingsUseCase as IGetClinicIntegrationSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-integration-settings.use-case.interface';
import {
  type IGetClinicNotificationSettingsUseCase,
  IGetClinicNotificationSettingsUseCase as IGetClinicNotificationSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-notification-settings.use-case.interface';
import {
  type IGetClinicBrandingSettingsUseCase,
  IGetClinicBrandingSettingsUseCase as IGetClinicBrandingSettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-branding-settings.use-case.interface';
import {
  type IGetClinicSecuritySettingsUseCase,
  IGetClinicSecuritySettingsUseCase as IGetClinicSecuritySettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-security-settings.use-case.interface';
import {
  type IUpdateClinicSecuritySettingsUseCase,
  IUpdateClinicSecuritySettingsUseCase as IUpdateClinicSecuritySettingsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-security-settings.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/settings')
@UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
export class ClinicConfigurationController {
  constructor(
    @Inject(IUpdateClinicGeneralSettingsUseCaseToken)
    private readonly updateClinicGeneralSettingsUseCase: IUpdateClinicGeneralSettingsUseCase,
    @Inject(IUpdateClinicTeamSettingsUseCaseToken)
    private readonly updateClinicTeamSettingsUseCase: IUpdateClinicTeamSettingsUseCase,
    @Inject(IUpdateClinicHoldSettingsUseCaseToken)
    private readonly updateClinicHoldSettingsUseCase: IUpdateClinicHoldSettingsUseCase,
    @Inject(IUpdateClinicServiceSettingsUseCaseToken)
    private readonly updateClinicServiceSettingsUseCase: IUpdateClinicServiceSettingsUseCase,
    @Inject(IUpdateClinicPaymentSettingsUseCaseToken)
    private readonly updateClinicPaymentSettingsUseCase: IUpdateClinicPaymentSettingsUseCase,
    @Inject(IUpdateClinicIntegrationSettingsUseCaseToken)
    private readonly updateClinicIntegrationSettingsUseCase: IUpdateClinicIntegrationSettingsUseCase,
    @Inject(IUpdateClinicNotificationSettingsUseCaseToken)
    private readonly updateClinicNotificationSettingsUseCase: IUpdateClinicNotificationSettingsUseCase,
    @Inject(IUpdateClinicSecuritySettingsUseCaseToken)
    private readonly updateClinicSecuritySettingsUseCase: IUpdateClinicSecuritySettingsUseCase,
    @Inject(IUpdateClinicBrandingSettingsUseCaseToken)
    private readonly updateClinicBrandingSettingsUseCase: IUpdateClinicBrandingSettingsUseCase,
    @Inject(IUpdateClinicScheduleSettingsUseCaseToken)
    private readonly updateClinicScheduleSettingsUseCase: IUpdateClinicScheduleSettingsUseCase,
    @Inject(IPropagateClinicTemplateUseCaseToken)
    private readonly propagateClinicTemplateUseCase: IPropagateClinicTemplateUseCase,
    @Inject(IGetClinicGeneralSettingsUseCaseToken)
    private readonly getClinicGeneralSettingsUseCase: IGetClinicGeneralSettingsUseCase,
    @Inject(IGetClinicTeamSettingsUseCaseToken)
    private readonly getClinicTeamSettingsUseCase: IGetClinicTeamSettingsUseCase,
    @Inject(IGetClinicScheduleSettingsUseCaseToken)
    private readonly getClinicScheduleSettingsUseCase: IGetClinicScheduleSettingsUseCase,
    @Inject(IGetClinicServiceSettingsUseCaseToken)
    private readonly getClinicServiceSettingsUseCase: IGetClinicServiceSettingsUseCase,
    @Inject(IGetClinicPaymentSettingsUseCaseToken)
    private readonly getClinicPaymentSettingsUseCase: IGetClinicPaymentSettingsUseCase,
    @Inject(IGetClinicIntegrationSettingsUseCaseToken)
    private readonly getClinicIntegrationSettingsUseCase: IGetClinicIntegrationSettingsUseCase,
    @Inject(IGetClinicNotificationSettingsUseCaseToken)
    private readonly getClinicNotificationSettingsUseCase: IGetClinicNotificationSettingsUseCase,
    @Inject(IGetClinicSecuritySettingsUseCaseToken)
    private readonly getClinicSecuritySettingsUseCase: IGetClinicSecuritySettingsUseCase,
    @Inject(IGetClinicBrandingSettingsUseCaseToken)
    private readonly getClinicBrandingSettingsUseCase: IGetClinicBrandingSettingsUseCase,
    @Inject(IListClinicTemplateOverridesUseCaseToken)
    private readonly listClinicTemplateOverridesUseCase: IListClinicTemplateOverridesUseCase,
    @Inject(IGetClinicUseCaseToken)
    private readonly getClinicUseCase: IGetClinicUseCase,
    private readonly configurationExportService: ClinicConfigurationExportService,
  ) {}

  @Get('general')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes gerais atuais da clinica' })
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

  @Get('template-overrides')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar overrides de template da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({
    name: 'section',
    required: false,
    enum: [
      'general',
      'team',
      'schedule',
      'services',
      'payments',
      'integrations',
      'notifications',
      'security',
      'branding',
    ],
  })
  @ApiQuery({ name: 'includeSuperseded', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: ClinicTemplateOverrideListResponseDto })
  async listTemplateOverrides(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicTemplateOverridesSchema))
    query: ListClinicTemplateOverridesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicTemplateOverrideListResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);

    const result = await this.listClinicTemplateOverridesUseCase.executeOrThrow({
      tenantId: context.tenantId,
      clinicId,
      section: query.section,
      includeSuperseded: query.includeSuperseded,
      page: query.page,
      limit: query.limit,
    });

    const hasNextPage = result.page * result.limit < result.total;

    return {
      data: result.data.map((item) => ClinicPresenter.templateOverride(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasNextPage,
    };
  }

  @Get('template-overrides/export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar overrides de template da clinica (CSV)' })
  @ApiProduces('text/csv')
  async exportTemplateOverridesCsv(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicTemplateOverridesSchema))
    query: ListClinicTemplateOverridesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Res() res: Response,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);
    const overrides = await this.collectTemplateOverrides({
      clinicId,
      tenantId: context.tenantId,
      query,
    });

    const csvLines = this.configurationExportService.buildTemplateOverridesCsv(overrides);
    const filename = `clinic-template-overrides-${clinicId}-${Date.now()}.csv`;

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csvLines.join('\n'));
  }

  @Get('template-overrides/export.xls')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar overrides de template da clinica (Excel)' })
  @ApiProduces('application/vnd.ms-excel')
  async exportTemplateOverridesExcel(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicTemplateOverridesSchema))
    query: ListClinicTemplateOverridesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Res() res: Response,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);
    const overrides = await this.collectTemplateOverrides({
      clinicId,
      tenantId: context.tenantId,
      query,
    });

    const buffer = await this.configurationExportService.buildTemplateOverridesExcel(overrides);
    const filename = `clinic-template-overrides-${clinicId}-${Date.now()}.xls`;

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/vnd.ms-excel')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Get('template-overrides/export.pdf')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar overrides de template da clinica (PDF)' })
  @ApiProduces('application/pdf')
  async exportTemplateOverridesPdf(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicTemplateOverridesSchema))
    query: ListClinicTemplateOverridesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Res() res: Response,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);
    const overrides = await this.collectTemplateOverrides({
      clinicId,
      tenantId: context.tenantId,
      query,
    });

    const buffer = await this.configurationExportService.buildTemplateOverridesPdf(overrides);
    const filename = `clinic-template-overrides-${clinicId}-${Date.now()}.pdf`;

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Patch('services')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de servicos da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicServiceSettingsResponseDto })
  @ZodApiBody({ schema: updateClinicServiceSettingsSchema })
  async updateServiceSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicServiceSettingsSchema))
    body: UpdateClinicServiceSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicServiceSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicServiceSettingsInput(clinicId, body, context);
    const version = await this.updateClinicServiceSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.serviceSettings(version);
  }

  @Patch('payments')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes financeiras da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicPaymentSettingsResponseDto })
  @ZodApiBody({ schema: updateClinicPaymentSettingsSchema })
  async updatePaymentSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicPaymentSettingsSchema))
    body: UpdateClinicPaymentSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicPaymentSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicPaymentSettingsInput(clinicId, body, context);
    const version = await this.updateClinicPaymentSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.paymentSettings(version);
  }

  @Patch('integrations')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de integracoes da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicIntegrationSettingsResponseDto })
  @ZodApiBody({ schema: updateClinicIntegrationSettingsSchema })
  async updateIntegrationSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicIntegrationSettingsSchema))
    body: UpdateClinicIntegrationSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicIntegrationSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicIntegrationSettingsInput(clinicId, body, context);
    const version = await this.updateClinicIntegrationSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.integrationSettings(version);
  }

  @Patch('notifications')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de notificacoes da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicNotificationSettingsResponseDto })
  @ZodApiBody({ schema: updateClinicNotificationSettingsSchema })
  async updateNotificationSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicNotificationSettingsSchema))
    body: UpdateClinicNotificationSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicNotificationSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicNotificationSettingsInput(clinicId, body, context);
    const version = await this.updateClinicNotificationSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.notificationSettings(version);
  }

  @Patch('security')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de seguranca da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicSecuritySettingsResponseDto })
  @ZodApiBody({ schema: updateClinicSecuritySettingsSchema })
  async updateSecuritySettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicSecuritySettingsSchema))
    body: UpdateClinicSecuritySettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicSecuritySettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicSecuritySettingsInput(clinicId, body, context);
    const version = await this.updateClinicSecuritySettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.securitySettings(version);
  }

  @Patch('branding')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar identidade visual da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicBrandingSettingsResponseDto })
  @ZodApiBody({ schema: updateClinicBrandingSettingsSchema })
  async updateBrandingSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicBrandingSettingsSchema))
    body: UpdateClinicBrandingSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicBrandingSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicBrandingSettingsInput(clinicId, body, context);
    const version = await this.updateClinicBrandingSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.brandingSettings(version);
  }

  @Get('hold')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de hold da clinica' })
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
  @ApiOperation({ summary: 'Obter configuracoes de equipe da clinica' })
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

  @Get('schedule')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de agenda da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicScheduleSettingsResponseDto })
  async getScheduleSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicScheduleSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicScheduleSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.scheduleSettings(version);
  }

  @Get('services')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de servicos da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicServiceSettingsResponseDto })
  async getServiceSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicServiceSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicServiceSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.serviceSettings(version);
  }

  @Get('payments')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes financeiras da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicPaymentSettingsResponseDto })
  async getPaymentSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicPaymentSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicPaymentSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.paymentSettings(version);
  }

  @Get('integrations')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de integracoes da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicIntegrationSettingsResponseDto })
  async getIntegrationSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicIntegrationSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicIntegrationSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.integrationSettings(version);
  }

  @Get('notifications')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de notificacoes da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicNotificationSettingsResponseDto })
  async getNotificationSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicNotificationSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicNotificationSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.notificationSettings(version);
  }

  @Get('security')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de seguranca da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicSecuritySettingsResponseDto })
  async getSecuritySettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicSecuritySettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicSecuritySettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.securitySettings(version);
  }

  @Get('branding')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter configuracoes de identidade visual da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicBrandingSettingsResponseDto })
  async getBrandingSettings(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicBrandingSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const version = await this.getClinicBrandingSettingsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.brandingSettings(version);
  }

  @Get('propagation')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter ultimos dados de propagacao de template da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicTemplatePropagationResponseDto })
  async getTemplatePropagation(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicTemplatePropagationResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const clinic = await this.getClinicUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
    });

    return ClinicPresenter.templatePropagation(clinic);
  }

  @Patch('general')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes gerais da clinica' })
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

  @Patch('team')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de equipe da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicTeamSettingsResponseDto })
  @ZodApiBody({ schema: updateClinicTeamSettingsSchema })
  async updateTeamSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicTeamSettingsSchema))
    body: UpdateClinicTeamSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicTeamSettingsResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicTeamSettingsInput(clinicId, body, context);
    const version = await this.updateClinicTeamSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.teamSettings(version);
  }

  @Patch('hold')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de hold da clinica' })
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

  @Patch('schedule')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar configuracoes de agenda da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicConfigurationVersionResponseDto })
  @ZodApiBody({ schema: updateClinicScheduleSettingsSchema })
  async updateScheduleSettings(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicScheduleSettingsSchema))
    body: UpdateClinicScheduleSettingsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicConfigurationVersionResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toUpdateClinicScheduleSettingsInput(clinicId, body, context);
    const version = await this.updateClinicScheduleSettingsUseCase.executeOrThrow(input);

    return ClinicPresenter.configuration(version);
  }

  @Patch('propagate')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Propagar configuracoes para clinicas alvo' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: [ClinicConfigurationVersionResponseDto] })
  @ZodApiBody({ schema: propagateClinicTemplateSchema })
  async propagateTemplate(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(propagateClinicTemplateSchema))
    body: PropagateClinicTemplateSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicConfigurationVersionResponseDto[]> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toPropagateClinicTemplateInput(clinicId, body, context);
    const versions = await this.propagateClinicTemplateUseCase.executeOrThrow(input);

    return versions.map((version) => ClinicPresenter.configuration(version));
  }

  private async collectTemplateOverrides(params: {
    clinicId: string;
    tenantId: string;
    query: ListClinicTemplateOverridesSchema;
  }): Promise<ClinicTemplateOverride[]> {
    const limitCandidate =
      params.query.limit && params.query.limit > 0 ? Math.floor(params.query.limit) : 100;
    const limit = Math.min(limitCandidate, 100);
    let page = params.query.page && params.query.page > 0 ? Math.floor(params.query.page) : 1;

    const overrides: ClinicTemplateOverride[] = [];

    do {
      const result = await this.listClinicTemplateOverridesUseCase.executeOrThrow({
        tenantId: params.tenantId,
        clinicId: params.clinicId,
        section: params.query.section,
        includeSuperseded: params.query.includeSuperseded,
        page,
        limit,
      });

      overrides.push(...result.data);

      if (result.page * result.limit >= result.total || result.data.length === 0) {
        break;
      }

      page += 1;
    } while (overrides.length <= 100_000);

    return overrides;
  }

  private resolveContext(currentUser: ICurrentUser, tenantId?: string): ClinicRequestContext {
    const resolvedTenantId = tenantId ?? currentUser.tenantId;

    if (!resolvedTenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    return {
      tenantId: resolvedTenantId,
      userId: currentUser.id,
    };
  }
}
