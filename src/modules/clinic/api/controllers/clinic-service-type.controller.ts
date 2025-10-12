import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
  Inject,
  Param,
  Post,
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
import { ClinicServiceTypeResponseDto } from '../dtos/clinic-service-type-response.dto';
import { ClinicRequestContext } from '../mappers/clinic-request.mapper';
import {
  listClinicServiceTypesSchema,
  ListClinicServiceTypesSchema,
  upsertClinicServiceTypeSchema,
  UpsertClinicServiceTypeSchema,
} from '../schemas/upsert-clinic-service-type.schema';
import type { IUpsertClinicServiceTypeUseCase } from '../../../../domain/clinic/interfaces/use-cases/upsert-clinic-service-type.use-case.interface';
import { IUpsertClinicServiceTypeUseCase as IUpsertClinicServiceTypeUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/upsert-clinic-service-type.use-case.interface';
import type { IRemoveClinicServiceTypeUseCase } from '../../../../domain/clinic/interfaces/use-cases/remove-clinic-service-type.use-case.interface';
import { IRemoveClinicServiceTypeUseCase as IRemoveClinicServiceTypeUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/remove-clinic-service-type.use-case.interface';
import type { IListClinicServiceTypesUseCase } from '../../../../domain/clinic/interfaces/use-cases/list-clinic-service-types.use-case.interface';
import { IListClinicServiceTypesUseCase as IListClinicServiceTypesUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/list-clinic-service-types.use-case.interface';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/service-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicServiceTypeController {
  constructor(
    @Inject(IUpsertClinicServiceTypeUseCaseToken)
    private readonly upsertServiceTypeUseCase: IUpsertClinicServiceTypeUseCase,
    @Inject(IRemoveClinicServiceTypeUseCaseToken)
    private readonly removeServiceTypeUseCase: IRemoveClinicServiceTypeUseCase,
    @Inject(IListClinicServiceTypesUseCaseToken)
    private readonly listServiceTypesUseCase: IListClinicServiceTypesUseCase,
  ) {}

  @Get()
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.SECRETARY,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Listar tipos de serviço da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [ClinicServiceTypeResponseDto] })
  async list(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicServiceTypesSchema)) query: ListClinicServiceTypesSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicServiceTypeResponseDto[]> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);

    const serviceTypes = await this.listServiceTypesUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
      includeInactive: query.includeInactive,
    });

    return serviceTypes.map(ClinicPresenter.serviceType);
  }

  @Post()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Criar ou atualizar tipo de serviço da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicServiceTypeResponseDto })
  async upsert(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(upsertClinicServiceTypeSchema)) body: UpsertClinicServiceTypeSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicServiceTypeResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const serviceType = await this.upsertServiceTypeUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
      requestedBy: context.userId,
      service: body.service,
    });

    return ClinicPresenter.serviceType(serviceType);
  }

  @Delete(':serviceTypeId')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Arquivar tipo de serviço da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'serviceTypeId', type: String })
  @ApiResponse({ status: 204, description: 'Tipo de serviço arquivado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('clinicId') clinicId: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader);

    await this.removeServiceTypeUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
      requestedBy: context.userId,
      serviceTypeId,
    });
  }

  private resolveContext(currentUser: ICurrentUser, tenantId?: string): ClinicRequestContext {
    const resolvedTenantId = tenantId ?? currentUser.tenantId;

    if (!resolvedTenantId) {
      throw new BadRequestException('Tenant não informado');
    }

    return {
      tenantId: resolvedTenantId,
      userId: currentUser.id,
    };
  }
}
