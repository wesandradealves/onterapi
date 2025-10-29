import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
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
import { ICreatePatientUseCase } from '../../../../domain/patients/interfaces/use-cases/create-patient.use-case.interface';
import { IListPatientsUseCase } from '../../../../domain/patients/interfaces/use-cases/list-patients.use-case.interface';
import { IGetPatientUseCase } from '../../../../domain/patients/interfaces/use-cases/get-patient.use-case.interface';
import { IUpdatePatientUseCase } from '../../../../domain/patients/interfaces/use-cases/update-patient.use-case.interface';
import { ITransferPatientUseCase } from '../../../../domain/patients/interfaces/use-cases/transfer-patient.use-case.interface';
import { IArchivePatientUseCase } from '../../../../domain/patients/interfaces/use-cases/archive-patient.use-case.interface';
import { IExportPatientsUseCase } from '../../../../domain/patients/interfaces/use-cases/export-patients.use-case.interface';
import { CreatePatientDto } from '../dtos/create-patient.dto';
import { UpdatePatientDto } from '../dtos/update-patient.dto';
import { TransferPatientDto } from '../dtos/transfer-patient.dto';
import { ArchivePatientDto } from '../dtos/archive-patient.dto';
import { ExportPatientsDto } from '../dtos/export-patients.dto';
import { PatientResponseDto, PatientsListResponseDto } from '../dtos/patient-response.dto';
import { PatientPresenter } from '../presenters/patient.presenter';
import { PatientDetailDto } from '../dtos/patient-detail.dto';
import { createPatientSchema, CreatePatientSchema } from '../schemas/create-patient.schema';
import { updatePatientSchema, UpdatePatientSchema } from '../schemas/update-patient.schema';
import { listPatientsSchema, ListPatientsSchema } from '../schemas/list-patients.schema';
import { transferPatientSchema, TransferPatientSchema } from '../schemas/transfer-patient.schema';
import { archivePatientSchema, ArchivePatientSchema } from '../schemas/archive-patient.schema';
import { exportPatientsSchema, ExportPatientsSchema } from '../schemas/export-patients.schema';
import {
  PatientRequestContext,
  toArchivePatientInput,
  toCreatePatientInput,
  toExportPatientRequest,
  toPatientListFilters,
  toTransferPatientInput,
  toUpdatePatientInput,
} from '../mappers/patient-request.mapper';
import {
  PatientListItem,
  PatientTimelineEntry,
} from '../../../../domain/patients/types/patient.types';
import { PatientErrorFactory } from '../../../../shared/factories/patient-error.factory';
import { resolveTenantContext } from '../../../../shared/utils/tenant-context.util';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  private readonly logger = new Logger(PatientsController.name);
  constructor(
    @Inject(ICreatePatientUseCase)
    private readonly createPatientUseCase: ICreatePatientUseCase,
    @Inject(IListPatientsUseCase)
    private readonly listPatientsUseCase: IListPatientsUseCase,
    @Inject(IGetPatientUseCase)
    private readonly getPatientUseCase: IGetPatientUseCase,
    @Inject(IUpdatePatientUseCase)
    private readonly updatePatientUseCase: IUpdatePatientUseCase,
    @Inject(ITransferPatientUseCase)
    private readonly transferPatientUseCase: ITransferPatientUseCase,
    @Inject(IArchivePatientUseCase)
    private readonly archivePatientUseCase: IArchivePatientUseCase,
    @Inject(IExportPatientsUseCase)
    private readonly exportPatientsUseCase: IExportPatientsUseCase,
  ) {}

  @Get()
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Listar pacientes',
    description: `Retorna a listagem paginada de pacientes do tenant atual.

**Roles:** CLINIC_OWNER, PROFESSIONAL, SECRETARY, MANAGER, SUPER_ADMIN`,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiResponse({ status: 200, type: PatientsListResponseDto })
  async list(
    @Query(new ZodValidationPipe(listPatientsSchema)) query: ListPatientsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientsListResponseDto> {
    const context = this.resolveContext(currentUser, {
      tenantHeader,
      tenantId: query.tenantId,
    });
    const filters = toPatientListFilters(query);
    const payload = await this.listPatientsUseCase.executeOrThrow({
      tenantId: context.tenantId,
      requesterId: context.userId,
      requesterRole: context.role,
      filters,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: payload.data.map((patient: PatientListItem) => PatientPresenter.listItem(patient)),
      total: payload.total,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.PROFESSIONAL, RolesEnum.SECRETARY, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Criar paciente',
    description: `Cria um novo paciente para o tenant atual.

**Roles:** CLINIC_OWNER, PROFESSIONAL, SECRETARY, SUPER_ADMIN`,
  })
  @ApiResponse({ status: 201, type: PatientResponseDto })
  @ApiBody({ type: CreatePatientDto })
  async create(
    @Body(new ZodValidationPipe(createPatientSchema)) body: CreatePatientSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const context = this.resolveContext(currentUser, {
      tenantHeader,
      tenantId: body?.tenantId,
    });
    const input = toCreatePatientInput(body, context);

    const patient = await this.createPatientUseCase.executeOrThrow(input);

    return PatientPresenter.summary(patient);
  }

  @Get(':slug')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Detalhes do paciente',
    description: `Retorna informacoes completas do paciente informado.

**Roles:** CLINIC_OWNER, PROFESSIONAL, SECRETARY, MANAGER, SUPER_ADMIN`,
  })
  @ApiParam({
    name: 'slug',
    description: 'Identificador do paciente',
    example: 'joao-silva',
  })
  @ApiResponse({ status: 200, type: PatientDetailDto })
  async findOne(
    @Param('slug') patientSlug: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientDetailDto> {
    const context = this.resolveContext(currentUser, { tenantHeader });

    const { patient, summary, timeline, insights, quickActions } =
      await this.getPatientUseCase.executeOrThrow({
        tenantId: context.tenantId,
        requesterId: context.userId,
        requesterRole: context.role,
        patientSlug,
      });

    return {
      patient: PatientPresenter.detail(patient),
      summary: {
        totals: {
          appointments: summary.totals.appointments,
          completedAppointments: summary.totals.completedAppointments,
          cancellations: summary.totals.cancellations,
          revenue: summary.totals.revenue,
          pendingPayments: summary.totals.pendingPayments,
        },
        alerts: summary.alerts,
        retentionScore: summary.retentionScore,
      },
      timeline: timeline.map((item: PatientTimelineEntry) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        occurredAt: item.occurredAt.toISOString(),
        metadata: item.metadata,
        createdBy: item.createdBy,
      })),
      insights,
      quickActions,
    };
  }

  @Patch(':slug')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Atualizar paciente',
    description: `Atualiza dados cadastrais do paciente.

**Roles:** CLINIC_OWNER, PROFESSIONAL, SECRETARY, MANAGER, SUPER_ADMIN`,
  })
  @ApiParam({ name: 'slug', description: 'Identificador do paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  @ApiBody({ type: UpdatePatientDto })
  async update(
    @Param('slug') patientSlug: string,
    @Body(new ZodValidationPipe(updatePatientSchema)) body: UpdatePatientSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const context = this.resolveContext(currentUser, { tenantHeader });
    const input = toUpdatePatientInput(patientSlug, body, context);

    const updated = await this.updatePatientUseCase.executeOrThrow(input);

    return PatientPresenter.summary(updated);
  }

  @Post(':slug/transfer')
  @HttpCode(HttpStatus.OK)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Transferir paciente para outro profissional',
    description: `Transfere o paciente para outro profissional dentro do tenant.

**Roles:** CLINIC_OWNER, MANAGER, SUPER_ADMIN`,
  })
  @ApiParam({ name: 'slug', description: 'Identificador do paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  @ApiBody({ type: TransferPatientDto })
  async transfer(
    @Param('slug') patientSlug: string,
    @Body(new ZodValidationPipe(transferPatientSchema)) body: TransferPatientSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const context = this.resolveContext(currentUser, { tenantHeader });
    const input = toTransferPatientInput(patientSlug, body, context);

    const transferred = await this.transferPatientUseCase.executeOrThrow(input);

    return PatientPresenter.summary(transferred);
  }

  @Post(':slug/archive')
  @HttpCode(HttpStatus.OK)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Arquivar paciente',
    description: `Arquiva um paciente e opcionalmente dados relacionados.

**Roles:** CLINIC_OWNER, MANAGER, SUPER_ADMIN`,
  })
  @ApiParam({ name: 'slug', description: 'Identificador do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente arquivado' })
  @ApiBody({ type: ArchivePatientDto })
  async archive(
    @Param('slug') patientSlug: string,
    @Body(new ZodValidationPipe(archivePatientSchema)) body: ArchivePatientSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    const context = this.resolveContext(currentUser);
    const input = toArchivePatientInput(patientSlug, body, context);

    await this.archivePatientUseCase.executeOrThrow(input);
  }

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN_FINANCEIRO,
  )
  @ApiOperation({
    summary: 'Exportar pacientes',
    description: `Gera uma solicitacao de exportacao com filtros opcionais.

**Roles:** CLINIC_OWNER, MANAGER, SUPER_ADMIN, ADMIN_FINANCEIRO`,
  })
  @ApiResponse({
    status: 202,
    description: 'Exportacao enfileirada',
    schema: { example: { fileUrl: '' } },
  })
  @ApiBody({ type: ExportPatientsDto })
  async export(
    @Body(new ZodValidationPipe(exportPatientsSchema)) body: ExportPatientsSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<{ fileUrl: string }> {
    const context = this.resolveContext(currentUser, { tenantId: body?.tenantId });
    const request = toExportPatientRequest(body, context);

    return await this.exportPatientsUseCase.executeOrThrow(request);
  }

  private resolveContext(
    currentUser: ICurrentUser,
    options?: { tenantHeader?: string | null; tenantId?: string | null },
  ): PatientRequestContext {
    const tenantHeader = options?.tenantHeader ?? null;
    const fallbackTenantId = options?.tenantId ?? null;
    const overrideCandidate =
      typeof tenantHeader === 'string' && tenantHeader.trim().length > 0
        ? tenantHeader
        : fallbackTenantId;

    const baseContext = resolveTenantContext({
      currentUser,
      tenantIdFromRequest: tenantHeader ?? undefined,
      fallbackTenantId: fallbackTenantId ?? undefined,
      allowMissingTenant: true,
    });

    const tenantId = this.getTenant(currentUser, overrideCandidate, baseContext.tenantId);

    return {
      tenantId,
      userId: currentUser.id,
      role: currentUser.role,
    };
  }

  private getTenant(
    currentUser: ICurrentUser,
    tenantOverride?: string | null,
    candidateTenantId?: string | null,
  ): string {
    const metadata = (currentUser.metadata ?? {}) as Record<string, unknown>;
    const normalizedOverride = typeof tenantOverride === 'string' ? tenantOverride.trim() : '';
    const normalizedCandidate =
      typeof candidateTenantId === 'string' ? candidateTenantId.trim() : '';
    const isSuperAdmin = currentUser.role === RolesEnum.SUPER_ADMIN;

    const metadataTenantIdRaw = metadata['tenantId'];
    const metadataTenantLegacyRaw = metadata['tenant_id'];
    const metadataTenantId =
      typeof metadataTenantIdRaw === 'string' && metadataTenantIdRaw.trim().length
        ? metadataTenantIdRaw.trim()
        : undefined;
    const metadataTenantLegacy =
      typeof metadataTenantLegacyRaw === 'string' && metadataTenantLegacyRaw.trim().length
        ? metadataTenantLegacyRaw.trim()
        : undefined;

    const knownTenantIds = [currentUser?.tenantId, metadataTenantId, metadataTenantLegacy]
      .filter((value): value is string => Boolean(value && String(value).trim().length))
      .map((value) => String(value).trim());

    if (normalizedOverride) {
      if (isSuperAdmin) {
        this.logger.log('Tenant override accepted (super admin)', {
          userId: currentUser.id,
          tenantOverride: normalizedOverride,
        });
        return normalizedOverride;
      }

      if (!knownTenantIds.includes(normalizedOverride)) {
        this.logger.warn('Tenant override recusado', {
          userId: currentUser.id,
          role: currentUser.role,
          tenantOverride: normalizedOverride,
          knownTenantIds,
        });
        throw PatientErrorFactory.unauthorized('Tenant informado nao pertence ao usuario');
      }
    }

    const tenantId = normalizedCandidate || knownTenantIds[0] || '';

    this.logger.log('Resolvendo tenant do usuario', {
      userId: currentUser.id,
      role: currentUser.role,
      tenantOverride: normalizedOverride || null,
      tokenTenantId: currentUser?.tenantId ?? null,
      metadataTenantId: metadataTenantId ?? null,
      metadataTenantLegacy: metadataTenantLegacy ?? null,
      candidateTenantId: normalizedCandidate || null,
      resolvedTenantId: tenantId || null,
    });

    if (!tenantId) {
      const debug =
        'Usuario sem tenant associado' +
        ' | tenantOverride=' +
        String(normalizedOverride || 'null') +
        ' | candidateTenantId=' +
        String(normalizedCandidate || 'null') +
        ' | tokenTenantId=' +
        String(currentUser?.tenantId ?? 'null') +
        ' | metadataTenantId=' +
        String(metadataTenantId ?? 'null') +
        ' | metadataTenantLegacy=' +
        String(metadataTenantLegacy ?? 'null');
      throw PatientErrorFactory.unauthorized(debug);
    }

    return tenantId;
  }
}
