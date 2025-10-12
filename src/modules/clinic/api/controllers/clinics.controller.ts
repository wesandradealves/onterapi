import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import { listClinicsSchema, ListClinicsSchema } from '../schemas/list-clinics.schema';
import type { IListClinicsUseCase } from '../../../../domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import { IListClinicsUseCase as IListClinicsUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import type { IGetClinicUseCase } from '../../../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import { IGetClinicUseCase as IGetClinicUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';

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
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar clínicas do tenant' })
  @ApiQuery({ name: 'status', required: false, description: 'Status separados por vírgula' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false })
  @ApiResponse({ status: 200, type: [ClinicSummaryDto] })
  async listClinics(
    @Query(new ZodValidationPipe(listClinicsSchema)) query: ListClinicsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<{ data: ClinicSummaryDto[]; total: number }> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant não informado');
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
  @ApiOperation({ summary: 'Obter detalhes de uma clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicSummaryDto })
  async getClinic(
    @Param('clinicId') clinicId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicSummaryDto> {
    const tenantId = tenantHeader ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant não informado');
    }

    const clinic = await this.getClinicUseCase.executeOrThrow({ clinicId, tenantId });
    return ClinicPresenter.summary(clinic);
  }
}
