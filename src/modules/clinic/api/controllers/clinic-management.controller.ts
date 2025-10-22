import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicDashboardAlertDto } from '../dtos/clinic-dashboard-response.dto';
import { ClinicProfessionalTransferResponseDto } from '../dtos/clinic-professional-transfer-response.dto';
import { ClinicManagementOverviewResponseDto } from '../dtos/clinic-management-overview-response.dto';
import {
  transferClinicProfessionalSchema,
  TransferClinicProfessionalSchema,
} from '../schemas/clinic-professional-transfer.schema';
import {
  ClinicRequestContext,
  toClinicManagementAlertsQuery,
  toClinicManagementOverviewQuery,
  toResolveClinicAlertInput,
  toTransferClinicProfessionalInput,
} from '../mappers/clinic-request.mapper';
import {
  getClinicManagementOverviewSchema,
  GetClinicManagementOverviewSchema,
} from '../schemas/get-clinic-management-overview.schema';
import {
  getClinicManagementAlertsSchema,
  GetClinicManagementAlertsSchema,
} from '../schemas/get-clinic-management-alerts.schema';
import {
  resolveClinicAlertSchema,
  ResolveClinicAlertSchema,
} from '../schemas/resolve-clinic-alert.schema';
import {
  type ITransferClinicProfessionalUseCase,
  ITransferClinicProfessionalUseCase as ITransferClinicProfessionalUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/transfer-clinic-professional.use-case.interface';
import {
  type IGetClinicManagementOverviewUseCase,
  IGetClinicManagementOverviewUseCase as IGetClinicManagementOverviewUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-management-overview.use-case.interface';
import {
  type IListClinicAlertsUseCase,
  IListClinicAlertsUseCase as IListClinicAlertsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-alerts.use-case.interface';
import {
  type IResolveClinicAlertUseCase,
  IResolveClinicAlertUseCase as IResolveClinicAlertUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/resolve-clinic-alert.use-case.interface';
import { ClinicAccessService } from '../../services/clinic-access.service';

@ApiTags('Clinic Management')
@ApiBearerAuth()
@Controller('management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicManagementController {
  constructor(
    @Inject(ITransferClinicProfessionalUseCaseToken)
    private readonly transferClinicProfessionalUseCase: ITransferClinicProfessionalUseCase,
    @Inject(IGetClinicManagementOverviewUseCaseToken)
    private readonly getClinicManagementOverviewUseCase: IGetClinicManagementOverviewUseCase,
    @Inject(IListClinicAlertsUseCaseToken)
    private readonly listClinicAlertsUseCase: IListClinicAlertsUseCase,
    @Inject(IResolveClinicAlertUseCaseToken)
    private readonly resolveClinicAlertUseCase: IResolveClinicAlertUseCase,
    private readonly clinicAccessService: ClinicAccessService,
  ) {}

  @Get('overview')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter visao consolidada das clinicas do tenant' })
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'IDs de clinicas (UUIDs) separados por virgula ou multiplos parametros',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por status das clinicas',
    enum: ['draft', 'pending', 'active', 'inactive', 'suspended'],
    isArray: true,
  })
  @ApiQuery({ name: 'from', required: false, description: 'Data inicial (ISO 8601)', type: String })
  @ApiQuery({ name: 'to', required: false, description: 'Data final (ISO 8601)', type: String })
  @ApiQuery({
    name: 'includeForecast',
    required: false,
    description: 'Incluir projecoes de forecast',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeComparisons',
    required: false,
    description: 'Incluir comparativos de metricas',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeAlerts',
    required: false,
    description: 'Incluir alertas consolidados',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeTeamDistribution',
    required: false,
    description: 'Incluir distribuicao da equipe por papel',
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeFinancials',
    required: false,
    description: 'Incluir resumo financeiro consolidado',
    type: Boolean,
  })
  @ApiResponse({ status: 200, type: ClinicManagementOverviewResponseDto })
  async getOverview(
    @Query(new ZodValidationPipe(getClinicManagementOverviewSchema))
    query: GetClinicManagementOverviewSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicManagementOverviewResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);
    const overviewQuery = toClinicManagementOverviewQuery(query, context);
    const requestedClinicIds = overviewQuery.filters?.clinicIds ?? query.clinicIds;
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      overviewQuery.filters = {
        ...(overviewQuery.filters ?? {}),
        clinicIds: authorizedClinicIds,
      };
    }

    const overview = await this.getClinicManagementOverviewUseCase.executeOrThrow(overviewQuery);

    return ClinicPresenter.managementOverview(overview);
  }

  @Get('alerts')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar alertas consolidados das clinicas' })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    description: 'ID da clinica a filtrar',
    type: String,
  })
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'IDs de clinicas (UUIDs) separados por virgula ou multiplos parametros',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'types',
    required: false,
    description: 'Tipos de alertas',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    description: 'Filtrar apenas alertas ativos',
    type: Boolean,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite maximo de alertas retornados',
    type: Number,
  })
  @ApiResponse({ status: 200, type: ClinicDashboardAlertDto, isArray: true })
  async listAlerts(
    @Query(new ZodValidationPipe(getClinicManagementAlertsSchema))
    query: GetClinicManagementAlertsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicDashboardAlertDto[]> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);
    const alertsQuery = toClinicManagementAlertsQuery(query, context);
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds: alertsQuery.clinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      alertsQuery.clinicIds = authorizedClinicIds;
    }

    const alerts = await this.listClinicAlertsUseCase.executeOrThrow(alertsQuery);

    return alerts.map((alert) => ClinicPresenter.alert(alert));
  }

  @Post('professionals/transfer')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Transferir profissional entre clinicas' })
  @ApiResponse({ status: 201, type: ClinicProfessionalTransferResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async transferProfessional(
    @Body(new ZodValidationPipe(transferClinicProfessionalSchema))
    body: TransferClinicProfessionalSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalTransferResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const input = toTransferClinicProfessionalInput(body, context);
    await this.clinicAccessService.assertClinicAccess({
      clinicId: input.fromClinicId,
      tenantId: input.tenantId,
      user: currentUser,
    });

    await this.clinicAccessService.assertClinicAccess({
      clinicId: input.toClinicId,
      tenantId: input.tenantId,
      user: currentUser,
    });

    const result = await this.transferClinicProfessionalUseCase.executeOrThrow(input);

    return ClinicPresenter.professionalTransfer(result);
  }

  @Patch('alerts/:alertId/resolve')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolver alerta de clinica' })
  @ApiResponse({ status: 200, type: ClinicDashboardAlertDto })
  async resolveAlert(
    @Param('alertId', new ParseUUIDPipe()) alertId: string,
    @Body(new ZodValidationPipe(resolveClinicAlertSchema)) body: ResolveClinicAlertSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicDashboardAlertDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    await this.clinicAccessService.assertAlertAccess({
      tenantId: context.tenantId,
      alertId,
      user: currentUser,
    });
    const input = toResolveClinicAlertInput(alertId, body, context);
    const alert = await this.resolveClinicAlertUseCase.executeOrThrow(input);

    return ClinicPresenter.alert(alert);
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
