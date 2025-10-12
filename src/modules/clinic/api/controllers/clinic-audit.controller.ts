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
import { ClinicAuditLogListResponseDto } from '../dtos/clinic-audit-log-response.dto';
import {
  ListClinicAuditLogsSchema,
  listClinicAuditLogsSchema,
} from '../schemas/list-clinic-audit-logs.schema';
import {
  type IListClinicAuditLogsUseCase,
  IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicAuditController {
  constructor(
    @Inject(IListClinicAuditLogsUseCaseToken)
    private readonly listAuditLogsUseCase: IListClinicAuditLogsUseCase,
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar logs de auditoria da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'events', required: false, description: 'Eventos separados por vírgula' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: ClinicAuditLogListResponseDto })
  async listAuditLogs(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicAuditLogsSchema)) query: ListClinicAuditLogsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicAuditLogListResponseDto> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant não informado');
    }

    const result = await this.listAuditLogsUseCase.executeOrThrow({
      tenantId,
      clinicId,
      events: query.events,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        clinicId: item.clinicId,
        event: item.event,
        performedBy: item.performedBy,
        detail: item.detail,
        createdAt: item.createdAt,
      })),
      total: result.total,
    };
  }
}
