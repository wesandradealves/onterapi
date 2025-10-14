import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
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
import { ClinicMemberResponseDto } from '../dtos/clinic-member-response.dto';
import { ClinicMemberListResponseDto } from '../dtos/clinic-member-list-response.dto';
import { ClinicProfessionalFinancialClearanceResponseDto } from '../dtos/clinic-professional-financial-clearance-response.dto';
import {
  listClinicMembersSchema,
  ListClinicMembersSchema,
  manageClinicMemberSchema,
  ManageClinicMemberSchema,
} from '../schemas/clinic-member.schema';
import {
  type IListClinicMembersUseCase,
  IListClinicMembersUseCase as IListClinicMembersUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import {
  type IManageClinicMemberUseCase,
  IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import {
  type ICheckClinicProfessionalFinancialClearanceUseCase,
  ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';
import { ClinicStaffRole } from '../../../../domain/clinic/types/clinic.types';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics/:clinicId/members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicMemberController {
  constructor(
    @Inject(IListClinicMembersUseCaseToken)
    private readonly listMembersUseCase: IListClinicMembersUseCase,
    @Inject(IManageClinicMemberUseCaseToken)
    private readonly manageMemberUseCase: IManageClinicMemberUseCase,
    @Inject(ICheckClinicProfessionalFinancialClearanceUseCaseToken)
    private readonly checkFinancialClearanceUseCase: ICheckClinicProfessionalFinancialClearanceUseCase,
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar membros da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'status', required: false, description: 'Status separados por virgula' })
  @ApiQuery({ name: 'roles', required: false, description: 'Papeis separados por virgula' })
  @ApiResponse({ status: 200, type: ClinicMemberListResponseDto })
  async list(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicMembersSchema)) query: ListClinicMembersSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicMemberListResponseDto> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const roles =
      query.roles
        ?.map((role) => this.mapRole(role, 'roles'))
        .filter((role): role is ClinicStaffRole => Boolean(role)) ?? undefined;

    const result = await this.listMembersUseCase.executeOrThrow({
      clinicId,
      tenantId,
      status: query.status,
      roles,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((member) => ClinicPresenter.member(member)),
      total: result.total,
    };
  }

  @Get('professional/:professionalId/financial-clearance')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Consultar pendencias financeiras do profissional' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'professionalId', type: String })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, type: ClinicProfessionalFinancialClearanceResponseDto })
  async getFinancialClearance(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Query('tenantId') tenantQuery?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicProfessionalFinancialClearanceResponseDto> {
    const tenantId = tenantHeader ?? tenantQuery ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const status = await this.checkFinancialClearanceUseCase.executeOrThrow({
      clinicId,
      tenantId,
      professionalId,
    });

    return {
      requiresClearance: status.requiresClearance,
      hasPendencies: status.hasPendencies,
      pendingCount: status.pendingCount,
      statusesEvaluated: status.statusesEvaluated,
    };
  }

  @Patch(':memberId')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar membro da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'memberId', type: String })
  @ApiResponse({ status: 200, type: ClinicMemberResponseDto })
  @ZodApiBody({ schema: manageClinicMemberSchema })
  async update(
    @Param('clinicId') clinicId: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(manageClinicMemberSchema)) body: ManageClinicMemberSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicMemberResponseDto> {
    const tenantId = tenantHeader ?? body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const role = this.mapRole(body.role, 'role');

    const member = await this.manageMemberUseCase.executeOrThrow({
      clinicId,
      tenantId,
      performedBy: currentUser.id,
      memberId,
      status: body.status,
      role,
      scope: body.scope,
    });

    return ClinicPresenter.member(member);
  }

  private mapRole(
    rawRole: string | undefined,
    field: 'roles' | 'role',
  ): ClinicStaffRole | undefined {
    if (!rawRole) {
      return undefined;
    }

    const mapped = RolesEnum[rawRole as keyof typeof RolesEnum];

    if (
      !mapped ||
      (mapped !== RolesEnum.CLINIC_OWNER &&
        mapped !== RolesEnum.MANAGER &&
        mapped !== RolesEnum.PROFESSIONAL &&
        mapped !== RolesEnum.SECRETARY)
    ) {
      throw new BadRequestException(`Valor invalido para ${field}`);
    }

    return mapped as ClinicStaffRole;
  }
}
