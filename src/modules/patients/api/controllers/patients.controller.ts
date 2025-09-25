import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
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
import { ListPatientsQueryDto } from '../dtos/list-patients.dto';
import { TransferPatientDto } from '../dtos/transfer-patient.dto';
import { ArchivePatientDto } from '../dtos/archive-patient.dto';
import { ExportPatientsDto } from '../dtos/export-patients.dto';
import { PatientResponseDto, PatientsListResponseDto } from '../dtos/patient-response.dto';
import { PatientPresenter } from '../presenters/patient.presenter';
import { unwrapResult } from '../../../../shared/types/result.type';
import { PatientDetailDto } from '../dtos/patient-detail.dto';
import { createPatientSchema } from '../schemas/create-patient.schema';
import { updatePatientSchema, UpdatePatientSchema } from '../schemas/update-patient.schema';
import { listPatientsSchema } from '../schemas/list-patients.schema';
import { transferPatientSchema, TransferPatientSchema } from '../schemas/transfer-patient.schema';
import { archivePatientSchema, ArchivePatientSchema } from '../schemas/archive-patient.schema';
import { exportPatientsSchema, ExportPatientsSchema } from '../schemas/export-patients.schema';
import {
  ArchivePatientInput,
  CreatePatientInput,
  PatientExportRequest,
  PatientListFilters,
  PatientListItem,
  PatientRiskLevel,
  PatientStatus,
  PatientTimelineEntry,
  TransferPatientInput,
  UpdatePatientInput,
} from '../../../../domain/patients/types/patient.types';
import { PatientErrorFactory } from '../../../../shared/factories/patient-error.factory';

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
  @UsePipes(new ZodValidationPipe(listPatientsSchema))
  @ApiResponse({ status: 200, type: PatientsListResponseDto })
  async list(
    @Query() query: ListPatientsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientsListResponseDto> {
    const tenantId = this.getTenant(currentUser, tenantHeader ?? query.tenantId);

    const filters: PatientListFilters = {
      query: query.query,
      status: query.status?.map((value) => value as PatientStatus),
      riskLevel: query.riskLevel?.map((value) => value as PatientRiskLevel),
      assignedProfessionalIds: query.professionalIds,
      tags: query.tags,
      quickFilter: query.quickFilter,
    };

    const payload = unwrapResult(
      await this.listPatientsUseCase.execute({
        tenantId,
        requesterId: currentUser.id,
        requesterRole: currentUser.role,
        filters,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
    );

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
    @Body(new ZodValidationPipe(createPatientSchema)) body: CreatePatientDto,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const tenantId = this.getTenant(currentUser, tenantHeader ?? body?.tenantId);

    const input: CreatePatientInput = {
      tenantId,
      createdBy: currentUser.id,
      requesterRole: currentUser.role,
      professionalId: body.professionalId,
      fullName: body.fullName,
      cpf: body.cpf,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      gender: body.gender,
      maritalStatus: body.maritalStatus,
      contact: {
        email: body.email,
        phone: body.phone,
        whatsapp: body.whatsapp,
      },
      address: body.zipCode
        ? {
            zipCode: body.zipCode,
            street: body.street ?? '',
            number: body.number,
            complement: body.complement,
            district: body.district,
            city: body.city ?? '',
            state: body.state ?? '',
            country: body.country,
          }
        : undefined,
      medical:
        body.allergies || body.chronicConditions || body.medications || body.observations
          ? {
              allergies: body.allergies,
              chronicConditions: body.chronicConditions,
              medications: body.medications,
              observations: body.observations,
            }
          : undefined,
      tags: body.tags,
      status: body.status as any,
    };

    const patient = unwrapResult(await this.createPatientUseCase.execute(input));

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
    const tenantId = this.getTenant(currentUser, tenantHeader);

    const { patient, summary, timeline, insights, quickActions } = unwrapResult(
      await this.getPatientUseCase.execute({
        tenantId,
        requesterId: currentUser.id,
        requesterRole: currentUser.role,
        patientSlug,
      }),
    );

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
    const tenantId = this.getTenant(currentUser, tenantHeader);
    const input: UpdatePatientInput = {
      patientSlug,
      tenantId,
      updatedBy: currentUser.id,
      requesterRole: currentUser.role,
      fullName: body.fullName,
      shortName: body.shortName,
      status: body.status as any,
      contact: {
        phone: body.phone,
        whatsapp: body.whatsapp,
        email: body.email,
      },
      address: body.zipCode
        ? {
            zipCode: body.zipCode,
            street: body.street ?? '',
            number: body.number,
            complement: body.complement,
            district: body.district,
            city: body.city ?? '',
            state: body.state ?? '',
            country: body.country,
          }
        : undefined,
      medical:
        body.allergies || body.chronicConditions || body.medications || body.observations
          ? {
              allergies: body.allergies,
              chronicConditions: body.chronicConditions,
              medications: body.medications,
              observations: body.observations,
            }
          : undefined,
      tags: body.tags,
      riskLevel: body.riskLevel as any,
      professionalId: body.professionalId ?? undefined,
    };

    const updated = unwrapResult(await this.updatePatientUseCase.execute(input));

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
    const tenantId = this.getTenant(currentUser, tenantHeader);
    const input: TransferPatientInput = {
      patientSlug,
      tenantId,
      requestedBy: currentUser.id,
      requesterRole: currentUser.role,
      fromProfessionalId: undefined,
      toProfessionalId: body.toProfessionalId,
      reason: body.reason,
      effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : undefined,
    };

    const transferred = unwrapResult(await this.transferPatientUseCase.execute(input));

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
    const tenantId = this.getTenant(currentUser);
    const input: ArchivePatientInput = {
      patientSlug,
      tenantId,
      requestedBy: currentUser.id,
      requesterRole: currentUser.role,
      reason: body.reason,
      archiveRelatedData: body.archiveRelatedData,
    };

    unwrapResult(await this.archivePatientUseCase.execute(input));
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
    const tenantId = this.getTenant(currentUser);
    const request: PatientExportRequest = {
      tenantId,
      requestedBy: currentUser.id,
      requesterRole: currentUser.role,
      format: body.format,
      filters: {
        assignedProfessionalIds: body.professionalIds,
        status: body.status?.map((value) => value as PatientStatus),
        quickFilter: body.quickFilter as any,
      },
      includeMedicalData: body.includeMedicalData,
    };

    return unwrapResult(await this.exportPatientsUseCase.execute(request));
  }

  private getTenant(currentUser: ICurrentUser, tenantOverride?: string | null): string {
    const metadata = (currentUser?.metadata ?? {}) as Record<string, unknown>;
    const normalizedOverride = typeof tenantOverride === 'string' ? tenantOverride.trim() : '';
    const isSuperAdmin = currentUser.role === RolesEnum.SUPER_ADMIN;

    const knownTenantIds = [
      currentUser?.tenantId,
      (metadata as any)?.tenantId as string | undefined,
      (metadata as any)?.tenant_id as string | undefined,
    ]
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

    const tenantId = knownTenantIds[0] ?? '';

    this.logger.log('Resolvendo tenant do usuario', {
      userId: currentUser.id,
      role: currentUser.role,
      tenantOverride: normalizedOverride || null,
      tokenTenantId: currentUser?.tenantId ?? null,
      metadataTenantId: (metadata as any)?.tenantId ?? null,
      metadataTenantLegacy: (metadata as any)?.tenant_id ?? null,
    });

    if (!tenantId) {
      const debug =
        'Usuario sem tenant associado' +
        ' | tenantOverride=' + String(normalizedOverride || 'null') +
        ' | tokenTenantId=' + String(currentUser?.tenantId ?? 'null') +
        ' | metadataTenantId=' + String((metadata as any)?.tenantId ?? 'null') +
        ' | metadataTenantLegacy=' + String((metadata as any)?.tenant_id ?? 'null');
      throw PatientErrorFactory.unauthorized(debug);
    }

    return tenantId;
  }
}
