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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicMemberResponseDto } from '../dtos/clinic-member-response.dto';
import {
  listClinicMembersSchema,
  ListClinicMembersSchema,
  manageClinicMemberSchema,
  ManageClinicMemberSchema,
} from '../schemas/clinic-member.schema';
import type { IListClinicMembersUseCase } from '../../../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import type { IManageClinicMemberUseCase } from '../../../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '../../../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';

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
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar membros da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'status', required: false, description: 'Status separados por vírgula' })
  @ApiQuery({ name: 'roles', required: false, description: 'Papéis separados por vírgula' })
  @ApiResponse({ status: 200, type: [ClinicMemberResponseDto] })
  async list(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicMembersSchema)) query: ListClinicMembersSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<{ data: ClinicMemberResponseDto[]; total: number }> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant não informado');
    }

    const result = await this.listMembersUseCase.executeOrThrow({
      clinicId,
      tenantId,
      status: query.status,
      roles: query.roles,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((member) => ClinicPresenter.member(member)),
      total: result.total,
    };
  }

  @Patch(':memberId')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar membro da clínica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'memberId', type: String })
  @ApiResponse({ status: 200, type: ClinicMemberResponseDto })
  async update(
    @Param('clinicId') clinicId: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(manageClinicMemberSchema)) body: ManageClinicMemberSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicMemberResponseDto> {
    const tenantId = tenantHeader ?? body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant não informado');
    }

    const member = await this.manageMemberUseCase.executeOrThrow({
      clinicId,
      tenantId,
      performedBy: currentUser.id,
      memberId,
      status: body.status,
      role: body.role,
      scope: body.scope,
    });

    return ClinicPresenter.member(member);
  }
}
