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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { ZodApiBody } from '../../../../shared/decorators/zod-api-body.decorator';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import { ClinicDetailsDto } from '../dtos/clinic-details.dto';
import { listClinicsSchema, ListClinicsSchema } from '../schemas/list-clinics.schema';
import { createClinicSchema, CreateClinicSchema } from '../schemas/create-clinic.schema';
import {
  updateClinicStatusSchema,
  UpdateClinicStatusSchema,
} from '../schemas/update-clinic-status.schema';
import { ClinicListResponseDto } from '../dtos/clinic-list-response.dto';
import {
  type IListClinicsUseCase,
  IListClinicsUseCase as IListClinicsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import {
  type IGetClinicUseCase,
  IGetClinicUseCase as IGetClinicUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import {
  type ICreateClinicUseCase,
  ICreateClinicUseCase as ICreateClinicUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/create-clinic.use-case.interface';
import {
  type IUpdateClinicStatusUseCase,
  IUpdateClinicStatusUseCase as IUpdateClinicStatusUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/update-clinic-status.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsController {
  constructor(
    @Inject(IListClinicsUseCaseToken)
    private readonly listClinicsUseCase: IListClinicsUseCase,
    @Inject(IGetClinicUseCaseToken)
    private readonly getClinicUseCase: IGetClinicUseCase,
    @Inject(ICreateClinicUseCaseToken)
    private readonly createClinicUseCase: ICreateClinicUseCase,
    @Inject(IUpdateClinicStatusUseCaseToken)
    private readonly updateClinicStatusUseCase: IUpdateClinicStatusUseCase,
  ) {}

  @Post()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cadastrar nova clinica' })
  @ApiResponse({ status: 201, type: ClinicSummaryDto })
  @ZodApiBody({ schema: createClinicSchema })
  async createClinic(
    @Body(new ZodValidationPipe(createClinicSchema)) body: CreateClinicSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ClinicSummaryDto> {
    const tenantId = body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const clinic = await this.createClinicUseCase.executeOrThrow({
      tenantId,
      name: body.name,
      slug: body.slug,
      primaryOwnerId: body.primaryOwnerId,
      document: body.document,
      holdSettings: body.holdSettings,
      metadata: body.metadata,
    });

    return ClinicPresenter.summary(clinic);
  }

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar clinicas do tenant' })
  @ApiQuery({ name: 'status', required: false, description: 'Status separados por virgula' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false })
  @ApiResponse({ status: 200, type: ClinicListResponseDto })
  async listClinics(
    @Query(new ZodValidationPipe(listClinicsSchema)) query: ListClinicsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicListResponseDto> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const result = await this.listClinicsUseCase.executeOrThrow({
      tenantId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
      includeDeleted: query.includeDeleted,
    });

    return {
      data: result.data.map((clinic) => ClinicPresenter.summary(clinic)),
      total: result.total,
    };
  }

  @Get(':clinicId')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Obter detalhes de uma clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicDetailsDto })
  async getClinic(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicDetailsDto> {
    const tenantId = tenantHeader ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const clinic = await this.getClinicUseCase.executeOrThrow({ clinicId, tenantId });
    return ClinicPresenter.details(clinic);
  }

  @Patch(':clinicId/status')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar status da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicSummaryDto })
  @ZodApiBody({ schema: updateClinicStatusSchema })
  async updateStatus(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(updateClinicStatusSchema)) body: UpdateClinicStatusSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicSummaryDto> {
    const tenantId = tenantHeader ?? body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const clinic = await this.updateClinicStatusUseCase.executeOrThrow({
      clinicId,
      tenantId,
      status: body.status,
      updatedBy: currentUser.id,
    });

    return ClinicPresenter.summary(clinic);
  }
}
