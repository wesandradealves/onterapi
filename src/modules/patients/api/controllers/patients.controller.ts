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
import { PatientDetailDto } from '../dtos/patient-detail.dto';
import { createPatientSchema } from '../schemas/create-patient.schema';
import { updatePatientSchema } from '../schemas/update-patient.schema';
import { listPatientsSchema } from '../schemas/list-patients.schema';
import { transferPatientSchema } from '../schemas/transfer-patient.schema';
import { archivePatientSchema } from '../schemas/archive-patient.schema';
import { exportPatientsSchema } from '../schemas/export-patients.schema';
import {
  ArchivePatientInput,
  CreatePatientInput,
  Patient,
  PatientExportRequest,
  PatientListFilters,
  PatientListItem,
  PatientRiskLevel,
  PatientStatus,
  PatientTag,
  PatientTimelineEntry,
  TransferPatientInput,
  UpdatePatientInput,
} from '../../../../domain/patients/types/patient.types';
import { CPFUtils } from '../../../../shared/utils/cpf.utils';
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
    description: 'Retorna a listagem paginada de pacientes do tenant atual.',
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
    const parsed = listPatientsSchema.parse(query);
    const tenantId = this.getTenant(currentUser, tenantHeader ?? parsed.tenantId);

    const filters: PatientListFilters = {
      query: parsed.query,
      status: parsed.status?.map((value) => value as PatientStatus),
      riskLevel: parsed.riskLevel?.map((value) => value as PatientRiskLevel),
      assignedProfessionalIds: parsed.professionalIds,
      tags: parsed.tags,
      quickFilter: parsed.quickFilter as any,
    };

    const result = await this.listPatientsUseCase.execute({
      tenantId,
      requesterId: currentUser.id,
      requesterRole: currentUser.role,
      filters,
      page: parsed.page,
      limit: parsed.limit,
      sortBy: parsed.sortBy,
      sortOrder: parsed.sortOrder,
    });

    if (result.error) {
      throw result.error;
    }

    return {
      data: result.data.data.map((patient: PatientListItem) => this.mapListItem(patient)),
      total: result.data.total,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.PROFESSIONAL, RolesEnum.SECRETARY, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Criar paciente' })
  @ApiResponse({ status: 201, type: PatientResponseDto })
  @ApiBody({ type: CreatePatientDto })
  
  async create(
    @Body(new ZodValidationPipe(createPatientSchema)) body: CreatePatientDto,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const tenantId = this.getTenant(currentUser, tenantHeader ?? body?.tenantId);
    const parsed = createPatientSchema.parse(body);

    const input: CreatePatientInput = {
      tenantId,
      createdBy: currentUser.id,
      requesterRole: currentUser.role,
      professionalId: parsed.professionalId,
      fullName: parsed.fullName,
      cpf: parsed.cpf,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : undefined,
      gender: parsed.gender,
      maritalStatus: parsed.maritalStatus,
      contact: {
        email: parsed.email,
        phone: parsed.phone,
        whatsapp: parsed.whatsapp,
      },
      address: parsed.zipCode
        ? {
            zipCode: parsed.zipCode,
            street: parsed.street ?? '',
            number: parsed.number,
            complement: parsed.complement,
            district: parsed.district,
            city: parsed.city ?? '',
            state: parsed.state ?? '',
            country: parsed.country,
          }
        : undefined,
      medical:
        parsed.allergies || parsed.chronicConditions || parsed.medications || parsed.observations
          ? {
              allergies: parsed.allergies,
              chronicConditions: parsed.chronicConditions,
              medications: parsed.medications,
              observations: parsed.observations,
            }
          : undefined,
      tags: parsed.tags,
      status: parsed.status as any,
    };

    const result = await this.createPatientUseCase.execute(input);

    if (result.error) {
      throw result.error;
    }

    return this.mapPatientSummary(result.data);
  }

  @Get(':id')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Detalhes do paciente' })
  @ApiParam({
    name: 'id',
    description: 'Identificador do paciente',
    example: 'dbbaf755-4bea-4212-838c-0a192e7fffa0',
  })
  @ApiResponse({ status: 200, type: PatientDetailDto })
  async findOne(
    @Param('id') patientId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientDetailDto> {
    const tenantId = this.getTenant(currentUser, tenantHeader);

    const result = await this.getPatientUseCase.execute({
      tenantId,
      requesterId: currentUser.id,
      requesterRole: currentUser.role,
      patientId,
    });

    if (result.error) {
      throw result.error;
    }

    const { patient, summary, timeline, insights, quickActions } = result.data;

    return {
      patient: this.mapPatientDetail(patient),
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

  @Patch(':id')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Atualizar paciente' })
  @ApiParam({ name: 'id', description: 'Identificador do paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  
  async update(
    @Param('id') patientId: string,
    @Body() body: UpdatePatientDto,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const tenantId = this.getTenant(currentUser, tenantHeader);
    const parsed = updatePatientSchema.parse(body);

    const input: UpdatePatientInput = {
      patientId,
      tenantId,
      updatedBy: currentUser.id,
      requesterRole: currentUser.role,
      fullName: parsed.fullName,
      shortName: parsed.shortName,
      status: parsed.status as any,
      contact: {
        phone: parsed.phone,
        whatsapp: parsed.whatsapp,
        email: parsed.email,
      },
      address: parsed.zipCode
        ? {
            zipCode: parsed.zipCode,
            street: parsed.street ?? '',
            number: parsed.number,
            complement: parsed.complement,
            district: parsed.district,
            city: parsed.city ?? '',
            state: parsed.state ?? '',
            country: parsed.country,
          }
        : undefined,
      medical:
        parsed.allergies || parsed.chronicConditions || parsed.medications || parsed.observations
          ? {
              allergies: parsed.allergies,
              chronicConditions: parsed.chronicConditions,
              medications: parsed.medications,
              observations: parsed.observations,
            }
          : undefined,
      tags: parsed.tags,
      riskLevel: parsed.riskLevel as any,
      professionalId: parsed.professionalId ?? undefined,
    };

    const result = await this.updatePatientUseCase.execute(input);
    if (result.error) {
      throw result.error;
    }

    return this.mapPatientSummary(result.data);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Transferir paciente para outro profissional' })
  @ApiParam({ name: 'id', description: 'Identificador do paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  
  async transfer(
    @Param('id') patientId: string,
    @Body() body: TransferPatientDto,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<PatientResponseDto> {
    const tenantId = this.getTenant(currentUser, tenantHeader);
    const parsed = transferPatientSchema.parse(body);

    const input: TransferPatientInput = {
      patientId,
      tenantId,
      requestedBy: currentUser.id,
      requesterRole: currentUser.role,
      fromProfessionalId: undefined,
      toProfessionalId: parsed.toProfessionalId,
      reason: parsed.reason,
      effectiveAt: parsed.effectiveAt ? new Date(parsed.effectiveAt) : undefined,
    };

    const result = await this.transferPatientUseCase.execute(input);
    if (result.error) {
      throw result.error;
    }

    return this.mapPatientSummary(result.data);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Arquivar paciente' })
  @ApiParam({ name: 'id', description: 'Identificador do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente arquivado' })
  
  async archive(
    @Param('id') patientId: string,
    @Body() body: ArchivePatientDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    const tenantId = this.getTenant(currentUser);
    const parsed = archivePatientSchema.parse(body);

    const input: ArchivePatientInput = {
      patientId,
      tenantId,
      requestedBy: currentUser.id,
      requesterRole: currentUser.role,
      reason: parsed.reason,
      archiveRelatedData: parsed.archiveRelatedData,
    };

    const result = await this.archivePatientUseCase.execute(input);
    if (result.error) {
      throw result.error;
    }
  }

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN_FINANCEIRO,
  )
  @ApiOperation({ summary: 'Exportar pacientes' })
  @ApiResponse({
    status: 202,
    description: 'Exportacao enfileirada',
    schema: { example: { fileUrl: '' } },
  })
  
  async export(
    @Body() body: ExportPatientsDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<{ fileUrl: string }> {
    const tenantId = this.getTenant(currentUser);
    const parsed = exportPatientsSchema.parse(body);

    const request: PatientExportRequest = {
      tenantId,
      requestedBy: currentUser.id,
      requesterRole: currentUser.role,
      format: parsed.format,
      filters: {
        assignedProfessionalIds: parsed.professionalIds,
        status: parsed.status?.map((value) => value as PatientStatus),
        quickFilter: parsed.quickFilter as any,
      },
      includeMedicalData: parsed.includeMedicalData,
    };

    const result = await this.exportPatientsUseCase.execute(request);
    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  private mapPatientSummary(patient: Patient): PatientResponseDto {
    return {
      id: patient.id,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: CPFUtils.mask(patient.cpf),
      phone: patient.contact.phone,
      whatsapp: patient.contact.whatsapp,
      email: patient.contact.email,
      nextAppointmentAt: patient.nextAppointmentAt?.toISOString(),
      lastAppointmentAt: patient.lastAppointmentAt?.toISOString(),
      professionalId: patient.professionalId,
      tags: patient.tags?.map((tag: PatientTag) => tag.label),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };
  }

  private mapPatientDetail(patient: Patient) {
    return {
      id: patient.id,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: CPFUtils.mask(patient.cpf),
      contact: patient.contact,
      address: patient.address,
      medical: patient.medical,
      professionalId: patient.professionalId,
      tags: patient.tags?.map((tag: PatientTag) => ({
        id: tag.id,
        label: tag.label,
        color: tag.color,
      })),
      nextAppointmentAt: patient.nextAppointmentAt?.toISOString(),
      lastAppointmentAt: patient.lastAppointmentAt?.toISOString(),
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
      riskLevel: patient.riskLevel,
    };
  }

  private mapListItem(patient: PatientListItem): PatientResponseDto {
    const createdAt =
      patient.createdAt instanceof Date
        ? patient.createdAt.toISOString()
        : String(patient.createdAt);
    const updatedAt =
      patient.updatedAt instanceof Date
        ? patient.updatedAt.toISOString()
        : String(patient.updatedAt);
    const nextAppointmentAt =
      patient.nextAppointmentAt instanceof Date
        ? patient.nextAppointmentAt.toISOString()
        : (patient.nextAppointmentAt ?? undefined);
    const lastAppointmentAt =
      patient.lastAppointmentAt instanceof Date
        ? patient.lastAppointmentAt.toISOString()
        : (patient.lastAppointmentAt ?? undefined);

    return {
      id: patient.id,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: patient.cpfMasked,
      phone: patient.contact.phone,
      whatsapp: patient.contact.whatsapp,
      email: patient.contact.email,
      nextAppointmentAt,
      lastAppointmentAt,
      professionalId: patient.professionalId,
      tags: patient.tags?.map((tag: PatientTag) => tag.label),
      createdAt,
      updatedAt,
    };
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
