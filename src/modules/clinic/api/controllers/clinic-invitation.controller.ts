import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
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
import { ClinicScopeGuard } from '../../guards/clinic-scope.guard';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicInvitationResponseDto } from '../dtos/clinic-invitation-response.dto';
import { ClinicInvitationListResponseDto } from '../dtos/clinic-invitation-list-response.dto';
import { ClinicRequestContext } from '../mappers/clinic-request.mapper';
import { type ClinicInvitationEconomicSummary } from '../../../../domain/clinic/types/clinic.types';
import {
  acceptClinicInvitationSchema,
  AcceptClinicInvitationSchema,
  createClinicInvitationAddendumSchema,
  CreateClinicInvitationAddendumSchema,
  declineClinicInvitationSchema,
  DeclineClinicInvitationSchema,
  inviteClinicProfessionalSchema,
  InviteClinicProfessionalSchema,
  listClinicInvitationsSchema,
  ListClinicInvitationsSchema,
  revokeClinicInvitationSchema,
  RevokeClinicInvitationSchema,
} from '../schemas/clinic-invitation.schema';
import {
  ReissueClinicInvitationSchema,
  reissueClinicInvitationSchema,
} from '../schemas/reissue-clinic-invitation.schema';
import {
  type IInviteClinicProfessionalUseCase,
  IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import {
  type IListClinicInvitationsUseCase,
  IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import {
  type IAcceptClinicInvitationUseCase,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import {
  type IDeclineClinicInvitationUseCase,
  IDeclineClinicInvitationUseCase as IDeclineClinicInvitationUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/decline-clinic-invitation.use-case.interface';
import {
  type IRevokeClinicInvitationUseCase,
  IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import {
  type IReissueClinicInvitationUseCase,
  IReissueClinicInvitationUseCase as IReissueClinicInvitationUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/reissue-clinic-invitation.use-case.interface';
import {
  type ICreateClinicInvitationAddendumUseCase,
  ICreateClinicInvitationAddendumUseCase as ICreateClinicInvitationAddendumUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/create-clinic-invitation-addendum.use-case.interface';
import { ZodApiBody } from '../../../../shared/decorators/zod-api-body.decorator';

@ApiTags('Clinics')
@ApiBearerAuth()
@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
export class ClinicInvitationController {
  constructor(
    @Inject(IInviteClinicProfessionalUseCaseToken)
    private readonly inviteUseCase: IInviteClinicProfessionalUseCase,
    @Inject(IListClinicInvitationsUseCaseToken)
    private readonly listInvitationsUseCase: IListClinicInvitationsUseCase,
    @Inject(IAcceptClinicInvitationUseCaseToken)
    private readonly acceptInvitationUseCase: IAcceptClinicInvitationUseCase,
    @Inject(IDeclineClinicInvitationUseCaseToken)
    private readonly declineInvitationUseCase: IDeclineClinicInvitationUseCase,
    @Inject(IRevokeClinicInvitationUseCaseToken)
    private readonly revokeInvitationUseCase: IRevokeClinicInvitationUseCase,
    @Inject(IReissueClinicInvitationUseCaseToken)
    private readonly reissueInvitationUseCase: IReissueClinicInvitationUseCase,
    @Inject(ICreateClinicInvitationAddendumUseCaseToken)
    private readonly createAddendumInvitationUseCase: ICreateClinicInvitationAddendumUseCase,
  ) {}

  @Post(':clinicId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SECRETARY, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Emitir convite para profissional' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 201, type: ClinicInvitationResponseDto })
  @ZodApiBody({ schema: inviteClinicProfessionalSchema })
  async inviteProfessional(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(inviteClinicProfessionalSchema))
    body: InviteClinicProfessionalSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicInvitationResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? body.tenantId);

    const economicSummary: ClinicInvitationEconomicSummary = {
      items: body.economicSummary.items.map((item) => ({
        serviceTypeId: item.serviceTypeId,
        price: item.price,
        currency: item.currency,
        payoutModel: item.payoutModel,
        payoutValue: item.payoutValue,
      })),
      orderOfRemainders: body.economicSummary.orderOfRemainders,
      roundingStrategy: body.economicSummary.roundingStrategy,
    };

    const invitation = await this.inviteUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
      issuedBy: context.userId,
      professionalId: body.professionalId,
      email: body.email,
      channel: body.channel,
      channelScope: body.channelScope,
      economicSummary,
      expiresAt: new Date(body.expiresAt),
      metadata: body.metadata,
    });

    const token = invitation.metadata?.issuedToken as string | undefined;

    if (invitation.metadata?.issuedToken) {
      delete invitation.metadata.issuedToken;
    }

    return ClinicPresenter.invitation(invitation, token);
  }

  @Post(':clinicId/invitations/addendums')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Emitir aditivo economico para profissional ja vinculado' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 201, type: ClinicInvitationResponseDto })
  @ZodApiBody({ schema: createClinicInvitationAddendumSchema })
  async createAddendum(
    @Param('clinicId') clinicId: string,
    @Body(new ZodValidationPipe(createClinicInvitationAddendumSchema))
    body: CreateClinicInvitationAddendumSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicInvitationResponseDto> {
    const tenantId = tenantHeader ?? body.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const invitation = await this.createAddendumInvitationUseCase.executeOrThrow({
      clinicId,
      tenantId,
      issuedBy: currentUser.id,
      professionalId: body.professionalId,
      channel: body.channel,
      channelScope: body.channelScope,
      economicSummary: body.economicSummary,
      expiresAt: new Date(body.expiresAt),
      effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : undefined,
      metadata: body.metadata,
    });

    const token = invitation.metadata?.issuedToken as string | undefined;

    if (invitation.metadata?.issuedToken) {
      delete invitation.metadata.issuedToken;
    }

    return ClinicPresenter.invitation(invitation, token);
  }

  @Get(':clinicId/invitations')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SECRETARY, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar convites da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiQuery({ name: 'status', required: false, description: 'Status separados por virgula' })
  @ApiResponse({ status: 200, type: ClinicInvitationListResponseDto })
  async listInvitations(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicInvitationsSchema)) query: ListClinicInvitationsSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicInvitationListResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader ?? query.tenantId);

    const result = await this.listInvitationsUseCase.executeOrThrow({
      clinicId,
      tenantId: context.tenantId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((invitation) => ClinicPresenter.invitation(invitation)),
      total: result.total,
    };
  }

  @Post('invitations/:invitationId/accept')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Aceitar convite de clinica' })
  @ApiParam({ name: 'invitationId', type: String })
  @ApiResponse({ status: 200, type: ClinicInvitationResponseDto })
  @ZodApiBody({ schema: acceptClinicInvitationSchema })
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(acceptClinicInvitationSchema)) body: AcceptClinicInvitationSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ClinicInvitationResponseDto> {
    const tenantId = body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const invitation = await this.acceptInvitationUseCase.executeOrThrow({
      invitationId,
      tenantId,
      acceptedBy: currentUser.id,
      token: body.token,
    });

    return ClinicPresenter.invitation(invitation);
  }

  @Post('invitations/:invitationId/decline')
  @Roles(
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
    RolesEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Recusar convite de clinica' })
  @ApiParam({ name: 'invitationId', type: String })
  @ApiResponse({ status: 200, type: ClinicInvitationResponseDto })
  @ZodApiBody({ schema: declineClinicInvitationSchema })
  async declineInvitation(
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(declineClinicInvitationSchema))
    body: DeclineClinicInvitationSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ClinicInvitationResponseDto> {
    const tenantId = body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const invitation = await this.declineInvitationUseCase.executeOrThrow({
      invitationId,
      tenantId,
      declinedBy: currentUser.id,
      reason: body.reason,
    });

    return ClinicPresenter.invitation(invitation);
  }

  @Post('invitations/:invitationId/revoke')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revogar convite de clinica' })
  @ApiParam({ name: 'invitationId', type: String })
  @ApiResponse({ status: 200, type: ClinicInvitationResponseDto })
  @ZodApiBody({ schema: revokeClinicInvitationSchema })
  async revokeInvitation(
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(revokeClinicInvitationSchema)) body: RevokeClinicInvitationSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ClinicInvitationResponseDto> {
    const tenantId = body.tenantId ?? currentUser.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const invitation = await this.revokeInvitationUseCase.executeOrThrow({
      invitationId,
      tenantId,
      revokedBy: currentUser.id,
      reason: body.reason,
    });

    return ClinicPresenter.invitation(invitation);
  }

  @Post('invitations/:invitationId/reissue')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SECRETARY, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reemitir convite de clinica com novo token' })
  @ApiParam({ name: 'invitationId', type: String })
  @ApiResponse({ status: 200, type: ClinicInvitationResponseDto })
  @ZodApiBody({ schema: reissueClinicInvitationSchema })
  async reissueInvitation(
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(reissueClinicInvitationSchema)) body: ReissueClinicInvitationSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ClinicInvitationResponseDto> {
    const tenantId = body.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const invitation = await this.reissueInvitationUseCase.executeOrThrow({
      invitationId,
      tenantId,
      reissuedBy: currentUser.id,
      expiresAt: new Date(body.expiresAt),
      channel: body.channel,
      channelScope: body.channelScope,
    });

    const token = invitation.metadata?.issuedToken as string | undefined;

    if (invitation.metadata?.issuedToken) {
      delete invitation.metadata.issuedToken;
    }

    return ClinicPresenter.invitation(invitation, token);
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
