import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
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
import { ClinicDashboardResponseDto } from '../dtos/clinic-dashboard-response.dto';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import {
  getClinicDashboardSchema,
  GetClinicDashboardSchema,
} from '../schemas/get-clinic-dashboard.schema';
import { ClinicRequestContext, toClinicDashboardQuery } from '../mappers/clinic-request.mapper';
import {
  type IGetClinicDashboardUseCase,
  IGetClinicDashboardUseCase as IGetClinicDashboardUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-dashboard.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicDashboardController {
  constructor(
    @Inject(IGetClinicDashboardUseCaseToken)
    private readonly getClinicDashboardUseCase: IGetClinicDashboardUseCase,
  ) {}

  @Get()
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.SECRETARY,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Obter metricas consolidadas das clinicas' })
  @ApiQuery({
    name: 'clinicIds',
    required: false,
    description: 'Lista de IDs separados por virgula',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Data inicial (ISO)' })
  @ApiQuery({ name: 'to', required: false, description: 'Data final (ISO)' })
  @ApiQuery({ name: 'includeForecast', required: false, type: Boolean })
  @ApiQuery({ name: 'includeComparisons', required: false, type: Boolean })
  @ApiQuery({
    name: 'comparisonMetrics',
    required: false,
    description:
      'Metricas para o comparativo (valores aceitos: revenue, appointments, patients, occupancy, satisfaction)',
    enum: ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'],
    isArray: true,
  })
  @ApiResponse({ status: 200, type: ClinicDashboardResponseDto })
  async getDashboard(
    @Query(new ZodValidationPipe(getClinicDashboardSchema)) query: GetClinicDashboardSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicDashboardResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);
    const dashboardQuery = toClinicDashboardQuery(query, context);

    const snapshot = await this.getClinicDashboardUseCase.executeOrThrow(dashboardQuery);
    return ClinicPresenter.dashboard(snapshot);
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
