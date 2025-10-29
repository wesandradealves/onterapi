import {
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
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import {
  ClinicAlertEvaluationResponseDto,
  ClinicDashboardAlertDto,
  ClinicDashboardComparisonDto,
} from '../dtos/clinic-dashboard-response.dto';
import { ClinicProfessionalTransferResponseDto } from '../dtos/clinic-professional-transfer-response.dto';
import { ClinicManagementOverviewResponseDto } from '../dtos/clinic-management-overview-response.dto';
import { ClinicProfessionalCoverageListResponseDto } from '../dtos/clinic-professional-coverage-response.dto';
import {
  transferClinicProfessionalSchema,
  TransferClinicProfessionalSchema,
} from '../schemas/clinic-professional-transfer.schema';
import {
  ClinicRequestContext,
  toClinicRequestContext,
  toClinicManagementAlertsQuery,
  toClinicManagementOverviewQuery,
  toCompareClinicsQuery,
  toEvaluateClinicAlertsInput,
  toResolveClinicAlertInput,
  toTransferClinicProfessionalInput,
} from '../mappers/clinic-request.mapper';
import {
  getClinicManagementOverviewSchema,
  GetClinicManagementOverviewSchema,
} from '../schemas/get-clinic-management-overview.schema';
import {
  exportClinicProfessionalCoveragesSchema,
  ExportClinicProfessionalCoveragesSchema,
} from '../schemas/export-clinic-professional-coverages.schema';
import {
  getClinicManagementAlertsSchema,
  GetClinicManagementAlertsSchema,
} from '../schemas/get-clinic-management-alerts.schema';
import { compareClinicsSchema, CompareClinicsSchema } from '../schemas/compare-clinics.schema';
import {
  evaluateClinicAlertsSchema,
  EvaluateClinicAlertsSchema,
} from '../schemas/evaluate-clinic-alerts.schema';
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
  type ICompareClinicsUseCase,
  ICompareClinicsUseCase as ICompareClinicsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';
import {
  type IListClinicProfessionalCoveragesUseCase,
  IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import {
  type IListClinicAlertsUseCase,
  IListClinicAlertsUseCase as IListClinicAlertsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-alerts.use-case.interface';
import {
  type IResolveClinicAlertUseCase,
  IResolveClinicAlertUseCase as IResolveClinicAlertUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/resolve-clinic-alert.use-case.interface';
import {
  type IEvaluateClinicAlertsUseCase,
  IEvaluateClinicAlertsUseCase as IEvaluateClinicAlertsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/evaluate-clinic-alerts.use-case.interface';
import { ClinicAccessService } from '../../services/clinic-access.service';
import { ClinicManagementExportService } from '../../services/clinic-management-export.service';
import {
  ClinicComparisonEntry,
  ClinicProfessionalCoverage,
} from '../../../../domain/clinic/types/clinic.types';

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
    @Inject(ICompareClinicsUseCaseToken)
    private readonly compareClinicsUseCase: ICompareClinicsUseCase,
    @Inject(IListClinicAlertsUseCaseToken)
    private readonly listClinicAlertsUseCase: IListClinicAlertsUseCase,
    @Inject(IResolveClinicAlertUseCaseToken)
    private readonly resolveClinicAlertUseCase: IResolveClinicAlertUseCase,
    @Inject(IEvaluateClinicAlertsUseCaseToken)
    private readonly evaluateClinicAlertsUseCase: IEvaluateClinicAlertsUseCase,
    @Inject(IListClinicProfessionalCoveragesUseCaseToken)
    private readonly listClinicProfessionalCoveragesUseCase: IListClinicProfessionalCoveragesUseCase,
    private readonly clinicAccessService: ClinicAccessService,
    private readonly exportService: ClinicManagementExportService,
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
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
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

  @Get('comparisons')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Comparar desempenho de clinicas por periodo' })
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'IDs de clinicas (UUIDs) separados por virgula ou multiplos parametros',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'metric',
    required: false,
    description: 'Metrica para comparacao',
    enum: ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'],
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Data inicial (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Data final (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Quantidade maxima de clinicas no ranking (1-200)',
    type: Number,
  })
  @ApiResponse({ status: 200, type: ClinicDashboardComparisonDto })
  async compareClinics(
    @Query(new ZodValidationPipe(compareClinicsSchema)) query: CompareClinicsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicDashboardComparisonDto> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const comparisonQuery = toCompareClinicsQuery(query, context);

    const requestedClinicIds = comparisonQuery.clinicIds ?? query.clinicIds;
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      comparisonQuery.clinicIds = authorizedClinicIds;
    }

    const entries = await this.compareClinicsUseCase.executeOrThrow(comparisonQuery);

    return this.buildComparisonDto(comparisonQuery, entries);
  }
  @Get('overview/export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar visao consolidada das clinicas (CSV)' })
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
  @ApiProduces('text/csv')
  async exportOverview(
    @Query(new ZodValidationPipe(getClinicManagementOverviewSchema))
    query: GetClinicManagementOverviewSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
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
    const overviewDto = ClinicPresenter.managementOverview(overview);
    const csvLines = this.exportService.buildOverviewCsv(overviewDto);
    const filename = `clinic-management-overview-${context.tenantId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  }

  @Get('comparisons/export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar comparativo de desempenho das clinicas (CSV)' })
  @ApiProduces('text/csv')
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'IDs de clinicas (UUIDs) separados por virgula ou multiplos parametros',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'metric',
    required: false,
    description: 'Metrica para comparacao',
    enum: ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'],
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Data inicial (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Data final (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Quantidade maxima de clinicas no ranking (1-200)',
    type: Number,
  })
  async exportComparisons(
    @Query(new ZodValidationPipe(compareClinicsSchema)) query: CompareClinicsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const comparisonQuery = toCompareClinicsQuery(query, context);

    const requestedClinicIds = comparisonQuery.clinicIds ?? query.clinicIds;
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      comparisonQuery.clinicIds = authorizedClinicIds;
    }

    const entries = await this.compareClinicsUseCase.executeOrThrow(comparisonQuery);
    const comparisonDto = this.buildComparisonDto(comparisonQuery, entries);
    const csvLines = this.exportService.buildComparisonsCsv(comparisonDto);
    const filename = `clinic-comparisons-${context.tenantId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  }

  @Get('comparisons/export.xls')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar comparativo de desempenho das clinicas (Excel)' })
  @ApiProduces('application/vnd.ms-excel')
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'IDs de clinicas (UUIDs) separados por virgula ou multiplos parametros',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'metric',
    required: false,
    description: 'Metrica para comparacao',
    enum: ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'],
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Data inicial (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Data final (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Quantidade maxima de clinicas no ranking (1-200)',
    type: Number,
  })
  async exportComparisonsExcel(
    @Query(new ZodValidationPipe(compareClinicsSchema)) query: CompareClinicsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const comparisonQuery = toCompareClinicsQuery(query, context);

    const requestedClinicIds = comparisonQuery.clinicIds ?? query.clinicIds;
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      comparisonQuery.clinicIds = authorizedClinicIds;
    }

    const entries = await this.compareClinicsUseCase.executeOrThrow(comparisonQuery);
    const comparisonDto = this.buildComparisonDto(comparisonQuery, entries);
    const workbook = await this.exportService.buildComparisonsExcel(comparisonDto);
    const filename = `clinic-comparisons-${context.tenantId}-${Date.now()}.xls`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(workbook);
  }

  @Get('comparisons/export.pdf')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar comparativo de desempenho das clinicas (PDF)' })
  @ApiProduces('application/pdf')
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'IDs de clinicas (UUIDs) separados por virgula ou multiplos parametros',
    isArray: true,
    type: String,
  })
  @ApiQuery({
    name: 'metric',
    required: false,
    description: 'Metrica para comparacao',
    enum: ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'],
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Data inicial (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Data final (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Quantidade maxima de clinicas no ranking (1-200)',
    type: Number,
  })
  async exportComparisonsPdf(
    @Query(new ZodValidationPipe(compareClinicsSchema)) query: CompareClinicsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const comparisonQuery = toCompareClinicsQuery(query, context);

    const requestedClinicIds = comparisonQuery.clinicIds ?? query.clinicIds;
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      comparisonQuery.clinicIds = authorizedClinicIds;
    }

    const entries = await this.compareClinicsUseCase.executeOrThrow(comparisonQuery);
    const comparisonDto = this.buildComparisonDto(comparisonQuery, entries);
    const pdfBuffer = await this.exportService.buildComparisonsPdf(comparisonDto);
    const filename = `clinic-comparisons-${context.tenantId}-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  }

  @Get('overview/export.xls')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar visao consolidada das clinicas (Excel)' })
  @ApiProduces('application/vnd.ms-excel')
  async exportOverviewExcel(
    @Query(new ZodValidationPipe(getClinicManagementOverviewSchema))
    query: GetClinicManagementOverviewSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
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
    const overviewDto = ClinicPresenter.managementOverview(overview);
    const buffer = await this.exportService.buildOverviewExcel(overviewDto);
    const filename = `clinic-management-overview-${context.tenantId}-${Date.now()}.xls`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('professional-coverages')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar coberturas temporarias de profissionais (multi-clinica)' })
  @ApiProduces('application/json')
  async listProfessionalCoverages(
    @Query(new ZodValidationPipe(exportClinicProfessionalCoveragesSchema))
    query: ExportClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<ClinicProfessionalCoverageListResponseDto> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);

    const requestedClinicIds = new Set<string>();
    if (query.clinicIds && query.clinicIds.length > 0) {
      query.clinicIds
        .filter(
          (clinicId): clinicId is string => typeof clinicId === 'string' && clinicId.length > 0,
        )
        .forEach((clinicId) => requestedClinicIds.add(clinicId));
    }
    if (query.clinicId) {
      requestedClinicIds.add(query.clinicId);
    }

    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds: requestedClinicIds.size > 0 ? Array.from(requestedClinicIds) : undefined,
    });

    const clinicIdsFilter = authorizedClinicIds.length > 0 ? authorizedClinicIds : query.clinicIds;

    const result = await this.listClinicProfessionalCoveragesUseCase.executeOrThrow({
      tenantId: context.tenantId,
      clinicId: query.clinicId,
      clinicIds: clinicIdsFilter,
      professionalId: query.professionalId,
      coverageProfessionalId: query.coverageProfessionalId,
      statuses: query.statuses,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      includeCancelled: query.includeCancelled ?? false,
      page: query.page,
      limit: query.limit,
    });

    return ClinicPresenter.professionalCoverageList(result);
  }

  @Get('professional-coverages/export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar coberturas temporarias de profissionais (multi-clinica)' })
  @ApiProduces('text/csv')
  async exportProfessionalCoverages(
    @Query(new ZodValidationPipe(exportClinicProfessionalCoveragesSchema))
    query: ExportClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const coverages = await this.collectProfessionalCoveragesForExport(query, context, currentUser);
    const csvLines = this.exportService.buildProfessionalCoveragesCsv(coverages);
    const filename = `clinic-professional-coverages-${context.tenantId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  }

  @Get('professional-coverages/export.xls')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar coberturas temporarias de profissionais (Excel)' })
  @ApiProduces('application/vnd.ms-excel')
  async exportProfessionalCoveragesExcel(
    @Query(new ZodValidationPipe(exportClinicProfessionalCoveragesSchema))
    query: ExportClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const coverages = await this.collectProfessionalCoveragesForExport(query, context, currentUser);
    const buffer = await this.exportService.buildProfessionalCoveragesExcel(coverages);
    const filename = `clinic-professional-coverages-${context.tenantId}-${Date.now()}.xls`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('professional-coverages/export.pdf')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar coberturas temporarias de profissionais (PDF)' })
  @ApiProduces('application/pdf')
  async exportProfessionalCoveragesPdf(
    @Query(new ZodValidationPipe(exportClinicProfessionalCoveragesSchema))
    query: ExportClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const coverages = await this.collectProfessionalCoveragesForExport(query, context, currentUser);
    const buffer = await this.exportService.buildProfessionalCoveragesPdf(coverages);
    const filename = `clinic-professional-coverages-${context.tenantId}-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('overview/export.pdf')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar visao consolidada das clinicas (PDF)' })
  @ApiProduces('application/pdf')
  async exportOverviewPdf(
    @Query(new ZodValidationPipe(getClinicManagementOverviewSchema))
    query: GetClinicManagementOverviewSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
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
    const overviewDto = ClinicPresenter.managementOverview(overview);
    const buffer = await this.exportService.buildOverviewPdf(overviewDto);
    const filename = `clinic-management-overview-${context.tenantId}-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
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
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
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

  @Get('alerts/export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar alertas das clinicas (CSV)' })
  @ApiProduces('text/csv')
  async exportAlerts(
    @Query(new ZodValidationPipe(getClinicManagementAlertsSchema))
    query: GetClinicManagementAlertsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const context = toClinicRequestContext(currentUser, tenantHeader, query.tenantId);
    const alertsQuery = toClinicManagementAlertsQuery(query, context);
    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds: alertsQuery.clinicIds,
    });

    if (authorizedClinicIds.length > 0) {
      alertsQuery.clinicIds = authorizedClinicIds;
    }

    alertsQuery.limit = Math.min(alertsQuery.limit ?? 1000, 5000);

    const alerts = await this.listClinicAlertsUseCase.executeOrThrow(alertsQuery);
    const dtoAlerts = alerts.map((alert) => ClinicPresenter.alert(alert));
    const csvLines = this.exportService.buildAlertsCsv(dtoAlerts);
    const filename = `clinic-alerts-${context.tenantId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
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
    const context = toClinicRequestContext(currentUser, tenantHeader, body.tenantId);

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
    const context = toClinicRequestContext(currentUser, tenantHeader);
    await this.clinicAccessService.assertAlertAccess({
      tenantId: context.tenantId,
      alertId,
      user: currentUser,
    });
    const input = toResolveClinicAlertInput(alertId, body, context);
    const alert = await this.resolveClinicAlertUseCase.executeOrThrow(input);

    return ClinicPresenter.alert(alert);
  }

  @Post('alerts/evaluate')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Forcar avaliacao dos alertas automaticos das clinicas' })
  @ApiResponse({ status: 201, type: ClinicAlertEvaluationResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async evaluateAlerts(
    @Body(new ZodValidationPipe(evaluateClinicAlertsSchema))
    body: EvaluateClinicAlertsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicAlertEvaluationResponseDto> {
    const context = toClinicRequestContext(currentUser, tenantHeader, currentUser.tenantId);

    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds: body.clinicIds,
    });

    const input = toEvaluateClinicAlertsInput(
      {
        clinicIds: authorizedClinicIds.length > 0 ? authorizedClinicIds : body.clinicIds,
      },
      context,
    );

    const result = await this.evaluateClinicAlertsUseCase.executeOrThrow(input);

    return {
      tenantId: result.tenantId,
      evaluatedClinics: result.evaluatedClinics,
      triggered: result.triggered,
      skipped: result.skipped,
      alerts: result.alerts.map((alert) => ClinicPresenter.alert(alert)),
      skippedDetails: result.skippedDetails,
    };
  }

  private resolvePreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
    const normalizedStart = new Date(start);
    const normalizedEnd = new Date(end);
    const duration = Math.max(normalizedEnd.getTime() - normalizedStart.getTime(), 0);
    const previousPeriodEnd = new Date(normalizedStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - duration);

    if (previousPeriodStart > previousPeriodEnd) {
      return {
        start: previousPeriodEnd,
        end: previousPeriodStart,
      };
    }

    return {
      start: previousPeriodStart,
      end: previousPeriodEnd,
    };
  }

  private async collectProfessionalCoveragesForExport(
    query: ExportClinicProfessionalCoveragesSchema,
    context: ClinicRequestContext,
    currentUser: ICurrentUser,
  ): Promise<ClinicProfessionalCoverage[]> {
    const requestedClinicIdsSet = new Set<string>();
    if (query.clinicIds && query.clinicIds.length > 0) {
      query.clinicIds.forEach((clinicId) => requestedClinicIdsSet.add(clinicId));
    }
    if (query.clinicId) {
      requestedClinicIdsSet.add(query.clinicId);
    }

    const requestedClinicIds =
      requestedClinicIdsSet.size > 0 ? Array.from(requestedClinicIdsSet) : undefined;

    const authorizedClinicIds = await this.clinicAccessService.resolveAuthorizedClinicIds({
      tenantId: context.tenantId,
      user: currentUser,
      requestedClinicIds,
    });

    const clinicIdFilter =
      query.clinicId && authorizedClinicIds.includes(query.clinicId) ? query.clinicId : undefined;

    const baseQuery = {
      tenantId: context.tenantId,
      clinicIds: authorizedClinicIds.length > 0 ? authorizedClinicIds : undefined,
      clinicId: clinicIdFilter,
      professionalId: query.professionalId,
      coverageProfessionalId: query.coverageProfessionalId,
      statuses: query.statuses,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      includeCancelled: query.includeCancelled ?? false,
    };

    const limit = query.limit && query.limit > 0 ? Math.min(Math.floor(query.limit), 200) : 200;
    let page = query.page && query.page > 0 ? Math.floor(query.page) : 1;

    const coverages: ClinicProfessionalCoverage[] = [];
    let total = 0;

    do {
      const result = await this.listClinicProfessionalCoveragesUseCase.executeOrThrow({
        ...baseQuery,
        page,
        limit,
      });

      total = result.total;
      coverages.push(...result.data);

      if (coverages.length >= total || result.data.length === 0) {
        break;
      }

      page += 1;
    } while (coverages.length < total);

    return coverages;
  }

  private buildComparisonDto(
    query: ReturnType<typeof toCompareClinicsQuery>,
    entries: ClinicComparisonEntry[],
  ): ClinicDashboardComparisonDto {
    return {
      period: {
        start: new Date(query.period.start),
        end: new Date(query.period.end),
      },
      previousPeriod: this.resolvePreviousPeriod(query.period.start, query.period.end),
      metrics: [
        {
          metric: query.metric,
          entries: entries.map((entry) => ({ ...entry })),
        },
      ],
    };
  }
}
