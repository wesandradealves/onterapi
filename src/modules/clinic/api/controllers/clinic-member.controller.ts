import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
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
import { ClinicScopeGuard } from '../../guards/clinic-scope.guard';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicMemberResponseDto } from '../dtos/clinic-member-response.dto';
import { ClinicMemberListResponseDto } from '../dtos/clinic-member-list-response.dto';
import { ClinicProfessionalFinancialClearanceResponseDto } from '../dtos/clinic-professional-financial-clearance-response.dto';
import { ClinicProfessionalPolicyResponseDto } from '../dtos/clinic-professional-policy-response.dto';
import {
  ClinicProfessionalCoverageListResponseDto,
  ClinicProfessionalCoverageResponseDto,
} from '../dtos/clinic-professional-coverage-response.dto';
import {
  listClinicMembersSchema,
  ListClinicMembersSchema,
  manageClinicMemberSchema,
  ManageClinicMemberSchema,
} from '../schemas/clinic-member.schema';
import {
  type IListClinicMembersUseCase,
  IListClinicMembersUseCase as IListClinicMembersUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import {
  type IManageClinicMemberUseCase,
  IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import {
  type ICheckClinicProfessionalFinancialClearanceUseCase,
  ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';
import {
  type IGetClinicProfessionalPolicyUseCase,
  IGetClinicProfessionalPolicyUseCase as IGetClinicProfessionalPolicyUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-professional-policy.use-case.interface';
import {
  type ICreateClinicProfessionalCoverageUseCase,
  ICreateClinicProfessionalCoverageUseCase as ICreateClinicProfessionalCoverageUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/create-clinic-professional-coverage.use-case.interface';
import {
  type IListClinicProfessionalCoveragesUseCase,
  IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import {
  type ICancelClinicProfessionalCoverageUseCase,
  ICancelClinicProfessionalCoverageUseCase as ICancelClinicProfessionalCoverageUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/cancel-clinic-professional-coverage.use-case.interface';
import {
  ClinicProfessionalCoverage,
  ClinicStaffRole,
} from '../../../../domain/clinic/types/clinic.types';
import {
  cancelClinicProfessionalCoverageSchema,
  CancelClinicProfessionalCoverageSchema,
  createClinicProfessionalCoverageSchema,
  CreateClinicProfessionalCoverageSchema,
  listClinicProfessionalCoveragesSchema,
  ListClinicProfessionalCoveragesSchema,
} from '../schemas/clinic-professional-coverage.schema';
import { ClinicManagementExportService } from '../../services/clinic-management-export.service';
import { Response } from 'express';
import { resolveTenantContext } from '../../../../shared/utils/tenant-context.util';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/members')
@UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
export class ClinicMemberController {
  constructor(
    @Inject(IListClinicMembersUseCaseToken)
    private readonly listMembersUseCase: IListClinicMembersUseCase,
    @Inject(IManageClinicMemberUseCaseToken)
    private readonly manageMemberUseCase: IManageClinicMemberUseCase,
    @Inject(ICheckClinicProfessionalFinancialClearanceUseCaseToken)
    private readonly checkFinancialClearanceUseCase: ICheckClinicProfessionalFinancialClearanceUseCase,
    @Inject(IGetClinicProfessionalPolicyUseCaseToken)
    private readonly getProfessionalPolicyUseCase: IGetClinicProfessionalPolicyUseCase,
    @Inject(ICreateClinicProfessionalCoverageUseCaseToken)
    private readonly createCoverageUseCase: ICreateClinicProfessionalCoverageUseCase,
    @Inject(IListClinicProfessionalCoveragesUseCaseToken)
    private readonly listCoveragesUseCase: IListClinicProfessionalCoveragesUseCase,
    @Inject(ICancelClinicProfessionalCoverageUseCaseToken)
    private readonly cancelCoverageUseCase: ICancelClinicProfessionalCoverageUseCase,
    private readonly exportService: ClinicManagementExportService,
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar membros da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'status', required: false, description: 'Status separados por virgula' })
  @ApiQuery({ name: 'roles', required: false, description: 'Papeis separados por virgula' })
  @ApiResponse({ status: 200, type: ClinicMemberListResponseDto })
  async list(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicMembersSchema)) query: ListClinicMembersSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicMemberListResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: query.tenantId,
    });

    const roles =
      query.roles
        ?.map((role) => this.mapRole(role, 'roles'))
        .filter((role): role is ClinicStaffRole => Boolean(role)) ?? undefined;

    const result = await this.listMembersUseCase.executeOrThrow({
      clinicId,
      tenantId,
      status: query.status,
      roles,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((member) => ClinicPresenter.member(member)),
      total: result.total,
    };
  }

  @Get('professional/:professionalId/financial-clearance')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Consultar pendencias financeiras do profissional' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'professionalId', type: String })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, type: ClinicProfessionalFinancialClearanceResponseDto })
  async getFinancialClearance(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Query('tenantId') tenantQuery?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalFinancialClearanceResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: tenantQuery,
    });

    const status = await this.checkFinancialClearanceUseCase.executeOrThrow({
      clinicId,
      tenantId,
      professionalId,
    });

    return {
      requiresClearance: status.requiresClearance,
      hasPendencies: status.hasPendencies,
      pendingCount: status.pendingCount,
      statusesEvaluated: status.statusesEvaluated,
    };
  }

  @Get('professional/:professionalId/policy')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Consultar politica clinica-profissional ativa' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'professionalId', type: String })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, type: ClinicProfessionalPolicyResponseDto })
  async getProfessionalPolicy(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Query('tenantId') tenantQuery?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalPolicyResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: tenantQuery,
    });

    const policy = await this.getProfessionalPolicyUseCase.executeOrThrow({
      clinicId,
      tenantId,
      professionalId,
    });

    return ClinicPresenter.professionalPolicy(policy);
  }

  @Post('professional-coverages')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Criar cobertura temporaria para um profissional' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 201, type: ClinicProfessionalCoverageResponseDto })
  @ZodApiBody({ schema: createClinicProfessionalCoverageSchema })
  async createCoverage(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(createClinicProfessionalCoverageSchema))
    body: CreateClinicProfessionalCoverageSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalCoverageResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: body.tenantId,
    });

    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);

    const coverage = await this.createCoverageUseCase.executeOrThrow({
      tenantId,
      clinicId,
      professionalId: body.professionalId,
      coverageProfessionalId: body.coverageProfessionalId,
      startAt,
      endAt,
      reason: body.reason,
      notes: body.notes,
      metadata: body.metadata,
      performedBy: currentUser.id,
    });

    return ClinicPresenter.professionalCoverage(coverage);
  }

  @Get('professional-coverages')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar coberturas temporarias de profissionais' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicProfessionalCoverageListResponseDto })
  async listCoverages(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicProfessionalCoveragesSchema))
    query: ListClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalCoverageListResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: query.tenantId,
    });

    const result = await this.listCoveragesUseCase.executeOrThrow({
      tenantId,
      clinicId,
      professionalId: query.professionalId,
      coverageProfessionalId: query.coverageProfessionalId,
      statuses: query.statuses,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      includeCancelled: query.includeCancelled,
      page: query.page,
      limit: query.limit,
    });

    return ClinicPresenter.professionalCoverageList(result);
  }

  @Get('professional-coverages/export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar coberturas temporarias de profissionais (CSV)' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiProduces('text/csv')
  async exportProfessionalCoverages(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicProfessionalCoveragesSchema))
    query: ListClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const coverages = await this.collectProfessionalCoverages({
      clinicId,
      currentUser,
      tenantHeader,
      query,
    });

    const csvLines = this.exportService.buildProfessionalCoveragesCsv(coverages);
    const payload = csvLines.join('\n');
    const filename = `clinic-${clinicId}-professional-coverages-${Date.now()}.csv`;

    res
      .status(200)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(payload);
  }

  @Get('professional-coverages/export.xls')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar coberturas temporarias de profissionais (Excel)' })
  @ApiProduces('application/vnd.ms-excel')
  async exportProfessionalCoveragesExcel(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicProfessionalCoveragesSchema))
    query: ListClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const coverages = await this.collectProfessionalCoverages({
      clinicId,
      currentUser,
      tenantHeader,
      query,
    });

    const buffer = await this.exportService.buildProfessionalCoveragesExcel(coverages);
    const filename = `clinic-${clinicId}-professional-coverages-${Date.now()}.xls`;

    res
      .status(200)
      .setHeader('Content-Type', 'application/vnd.ms-excel')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Get('professional-coverages/export.pdf')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar coberturas temporarias de profissionais (PDF)' })
  @ApiProduces('application/pdf')
  async exportProfessionalCoveragesPdf(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicProfessionalCoveragesSchema))
    query: ListClinicProfessionalCoveragesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const coverages = await this.collectProfessionalCoverages({
      clinicId,
      currentUser,
      tenantHeader,
      query,
    });

    const buffer = await this.exportService.buildProfessionalCoveragesPdf(coverages);
    const filename = `clinic-${clinicId}-professional-coverages-${Date.now()}.pdf`;

    res
      .status(200)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Patch('professional-coverages/:coverageId/cancel')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancelar cobertura temporaria' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'coverageId', type: String })
  @ApiResponse({ status: 200, type: ClinicProfessionalCoverageResponseDto })
  @ZodApiBody({ schema: cancelClinicProfessionalCoverageSchema })
  async cancelCoverage(
    @Param('clinicId') clinicId: string,
    @Param('coverageId') coverageId: string,
    @Body(new ZodValidationPipe(cancelClinicProfessionalCoverageSchema))
    body: CancelClinicProfessionalCoverageSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalCoverageResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: body.tenantId,
    });

    const coverage = await this.cancelCoverageUseCase.executeOrThrow({
      tenantId,
      clinicId,
      coverageId,
      cancelledBy: currentUser.id,
      cancellationReason: body.cancellationReason,
    });

    return ClinicPresenter.professionalCoverage(coverage);
  }

  @Patch(':memberId')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar membro da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'memberId', type: String })
  @ApiResponse({ status: 200, type: ClinicMemberResponseDto })
  @ZodApiBody({ schema: manageClinicMemberSchema })
  async update(
    @Param('clinicId') clinicId: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(manageClinicMemberSchema)) body: ManageClinicMemberSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicMemberResponseDto> {
    const { tenantId } = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader,
      fallbackTenantId: body.tenantId,
    });

    const role = this.mapRole(body.role, 'role');

    const member = await this.manageMemberUseCase.executeOrThrow({
      clinicId,
      tenantId,
      performedBy: currentUser.id,
      memberId,
      status: body.status,
      role,
      scope: body.scope,
    });

    return ClinicPresenter.member(member);
  }

  private async collectProfessionalCoverages(params: {
    clinicId: string;
    currentUser: ICurrentUser;
    tenantHeader?: string;
    query: ListClinicProfessionalCoveragesSchema;
  }): Promise<ClinicProfessionalCoverage[]> {
    const { tenantId } = resolveTenantContext({
      currentUser: params.currentUser,
      tenantIdFromRequest: params.tenantHeader,
      fallbackTenantId: params.query.tenantId,
    });

    const limitCandidate =
      params.query.limit && params.query.limit > 0
        ? Math.min(Math.floor(params.query.limit), 200)
        : 200;
    let page = params.query.page && params.query.page > 0 ? Math.floor(params.query.page) : 1;

    const baseQuery = {
      tenantId,
      clinicId: params.clinicId,
      professionalId: params.query.professionalId,
      coverageProfessionalId: params.query.coverageProfessionalId,
      statuses: params.query.statuses,
      from: params.query.from ? new Date(params.query.from) : undefined,
      to: params.query.to ? new Date(params.query.to) : undefined,
      includeCancelled: params.query.includeCancelled ?? false,
    };

    const coverages: ClinicProfessionalCoverage[] = [];

    while (true) {
      const result = await this.listCoveragesUseCase.executeOrThrow({
        ...baseQuery,
        page,
        limit: limitCandidate,
      });

      coverages.push(...result.data);

      if (result.data.length === 0 || result.page * result.limit >= result.total) {
        break;
      }

      page += 1;
    }

    return coverages;
  }

  private mapRole(
    rawRole: string | undefined,
    field: 'roles' | 'role',
  ): ClinicStaffRole | undefined {
    if (!rawRole) {
      return undefined;
    }

    const mapped = RolesEnum[rawRole as keyof typeof RolesEnum];

    if (
      !mapped ||
      (mapped !== RolesEnum.CLINIC_OWNER &&
        mapped !== RolesEnum.MANAGER &&
        mapped !== RolesEnum.PROFESSIONAL &&
        mapped !== RolesEnum.SECRETARY)
    ) {
      throw new BadRequestException(`Valor invalido para ${field}`);
    }

    return mapped as ClinicStaffRole;
  }
}
