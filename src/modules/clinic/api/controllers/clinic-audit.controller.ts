import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Inject,
  Param,
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
import { ClinicScopeGuard } from '../../guards/clinic-scope.guard';
import { ClinicAuditLogListResponseDto } from '../dtos/clinic-audit-log-response.dto';
import {
  ListClinicAuditLogsSchema,
  listClinicAuditLogsSchema,
} from '../schemas/list-clinic-audit-logs.schema';
import {
  type IListClinicAuditLogsUseCase,
  IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';
import { Response } from 'express';
import { ClinicAuditExportService } from '../../services/clinic-audit-export.service';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
export class ClinicAuditController {
  constructor(
    @Inject(IListClinicAuditLogsUseCaseToken)
    private readonly listAuditLogsUseCase: IListClinicAuditLogsUseCase,
    private readonly auditExportService: ClinicAuditExportService,
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar logs de auditoria da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'events', required: false, description: 'Eventos separados por virgula' })
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
      throw new BadRequestException('Tenant nao informado');
    }

    const result = await this.fetchAuditLogs(clinicId, tenantId, query, query.page, query.limit);

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

  @Get('export')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar logs de auditoria da clinica (CSV)' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'events', required: false, description: 'Eventos separados por virgula' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Quantidade maxima a exportar' })
  @ApiProduces('text/csv')
  async exportAuditLogs(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicAuditLogsSchema)) query: ListClinicAuditLogsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const limit = Math.min(query.limit ?? 1000, 5000);
    const page = query.page ?? 1;
    const result = await this.fetchAuditLogs(clinicId, tenantId, query, page, limit);
    const csvContent = this.auditExportService.buildAuditLogsCsv(result.data).join('\n');
    const filename = `clinic-audit-${clinicId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }

  @Get('export.xls')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar logs de auditoria da clinica (Excel)' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'events', required: false, description: 'Eventos separados por virgula' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Quantidade maxima a exportar' })
  @ApiProduces('application/vnd.ms-excel')
  async exportAuditLogsExcel(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicAuditLogsSchema)) query: ListClinicAuditLogsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const limit = Math.min(query.limit ?? 1000, 5000);
    const page = query.page ?? 1;
    const result = await this.fetchAuditLogs(clinicId, tenantId, query, page, limit);
    const buffer = await this.auditExportService.buildAuditLogsExcel(result.data);
    const filename = `clinic-audit-${clinicId}-${Date.now()}.xls`;

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/vnd.ms-excel')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  @Get('export.pdf')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar logs de auditoria da clinica (PDF)' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'events', required: false, description: 'Eventos separados por virgula' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Quantidade maxima a exportar' })
  @ApiProduces('application/pdf')
  async exportAuditLogsPdf(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicAuditLogsSchema)) query: ListClinicAuditLogsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const limit = Math.min(query.limit ?? 1000, 5000);
    const page = query.page ?? 1;
    const result = await this.fetchAuditLogs(clinicId, tenantId, query, page, limit);
    const buffer = await this.auditExportService.buildAuditLogsPdf(result.data);
    const filename = `clinic-audit-${clinicId}-${Date.now()}.pdf`;

    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  private async fetchAuditLogs(
    clinicId: string,
    tenantId: string,
    query: ListClinicAuditLogsSchema,
    page?: number,
    limit?: number,
  ) {
    return this.listAuditLogsUseCase.executeOrThrow({
      tenantId,
      clinicId,
      events: query.events,
      page,
      limit,
    });
  }
}
