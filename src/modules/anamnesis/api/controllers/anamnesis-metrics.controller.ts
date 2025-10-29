import { BadRequestException, Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { TenantGuard } from '../../../auth/guards/tenant.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser, ICurrentUser } from '../../../auth/decorators/current-user.decorator';
import { INTERNAL_ROLES, RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { AnamnesisMetricsService } from '../../services/anamnesis-metrics.service';
import { AnamnesisMetricsSnapshotDto } from '../dtos/anamnesis-response.dto';
import {
  anamnesisMetricsQuerySchema,
  AnamnesisMetricsQuerySchema,
} from '../schemas/anamnesis.schema';
import { AnamnesisPresenter } from '../presenters/anamnesis.presenter';

@ApiTags('Anamnesis Metrics')
@ApiBearerAuth()
@Controller('anamneses/metrics')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AnamnesisMetricsController {
  constructor(private readonly metricsService: AnamnesisMetricsService) {}

  @Get()
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter snapshot de metricas das anamneses' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Data inicial (ISO) para filtrar metricas',
    example: '2025-10-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Data final (ISO) para filtrar metricas',
    example: '2025-10-07T23:59:59Z',
  })
  @ApiResponse({ status: 200, type: AnamnesisMetricsSnapshotDto })
  async getSnapshot(
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query(new ZodValidationPipe(anamnesisMetricsQuerySchema)) query: AnamnesisMetricsQuerySchema,
  ): Promise<AnamnesisMetricsSnapshotDto> {
    const tenantId = this.resolveTenant(currentUser, tenantHeader, query.tenantId);
    const { from, to } = query;

    let snapshot;

    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('from e to devem ser informados juntos.');
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      this.ensureValidRange(fromDate, toDate);

      snapshot = await this.metricsService.getSnapshotForRange(tenantId, fromDate, toDate);
    } else {
      snapshot = await this.metricsService.getSnapshot(tenantId);
    }

    return AnamnesisPresenter.metrics(snapshot);
  }

  private resolveTenant(
    user: ICurrentUser,
    tenantHeader: string | undefined,
    queryTenantId?: string,
  ): string | null | undefined {
    const resolved = this.normalizeTenant(queryTenantId ?? tenantHeader);

    if (this.isInternalRole(user.role)) {
      return resolved;
    }

    const userTenant = this.normalizeTenant(user.tenantId?.toString());
    if (!userTenant) {
      throw new BadRequestException('Usuario nao possui tenant associado.');
    }

    if (resolved === null) {
      throw new BadRequestException('tenant informado nao pertence ao usuario autenticado.');
    }

    if (resolved && resolved !== userTenant) {
      throw new BadRequestException('tenant informado nao pertence ao usuario autenticado.');
    }

    return userTenant;
  }

  private normalizeTenant(value?: string | null): string | null | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'undefined') {
      return undefined;
    }
    if (lower === 'null') {
      return null;
    }

    return trimmed;
  }

  private ensureValidRange(from: Date, to: Date): void {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Periodo informado possui datas invalidas.');
    }

    if (from > to) {
      throw new BadRequestException('Data inicial deve ser anterior ou igual a data final.');
    }
  }

  private isInternalRole(role: string): boolean {
    return INTERNAL_ROLES.includes(role as RolesEnum);
  }
}
