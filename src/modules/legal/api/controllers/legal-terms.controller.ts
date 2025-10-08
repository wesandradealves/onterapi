import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { TenantGuard } from '../../../auth/guards/tenant.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser, ICurrentUser } from '../../../auth/decorators/current-user.decorator';
import { INTERNAL_ROLES, RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { LegalTerm } from '../../../../domain/legal/types/legal-term.types';
import { LegalTermsService } from '../../legal-terms.service';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import {
  createLegalTermSchema,
  CreateLegalTermSchema,
  legalTermStatusEnum,
  ListLegalTermsSchema,
  listLegalTermsSchema,
} from '../schemas/legal-terms.schema';
import { LegalTermPresenter } from '../presenters/legal-term.presenter';
import { LegalTermResponseDto } from '../dtos/legal-term-response.dto';
import { CreateLegalTermRequestDto } from '../dtos/create-legal-term-request.dto';

@ApiTags('Legal Terms')
@ApiBearerAuth()
@Controller('legal/terms')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(RolesEnum.SUPER_ADMIN, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER)
export class LegalTermsController {
  constructor(private readonly legalTermsService: LegalTermsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar termos legais' })
  @ApiQuery({ name: 'context', required: false })
  @ApiQuery({ name: 'status', required: false, enum: legalTermStatusEnum.options })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, type: LegalTermResponseDto, isArray: true })
  async listTerms(
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query(new ZodValidationPipe(listLegalTermsSchema)) query: ListLegalTermsSchema,
  ): Promise<LegalTermResponseDto[]> {
    const resolvedTenant = this.normalizeTenantForUser(
      currentUser,
      this.resolveTenantFromInputs(query.tenantId, tenantHeader),
    );

    const terms = await this.legalTermsService.listTerms({
      ...query,
      tenantId: resolvedTenant,
    });

    return LegalTermPresenter.toDtoList(terms);
  }

  @Get(':termId')
  @ApiOperation({ summary: 'Recuperar termo legal pelo identificador' })
  @ApiParam({ name: 'termId', description: 'Identificador do termo legal' })
  @ApiResponse({ status: 200, type: LegalTermResponseDto })
  async getTerm(
    @CurrentUser() currentUser: ICurrentUser,
    @Param('termId') termId: string,
  ): Promise<LegalTermResponseDto> {
    const term = await this.legalTermsService.getById(termId);
    this.ensureUserCanManageTerm(currentUser, term);
    return LegalTermPresenter.toDto(term);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo termo legal' })
  @ApiBody({ type: CreateLegalTermRequestDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: LegalTermResponseDto })
  async createTerm(
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body(new ZodValidationPipe(createLegalTermSchema)) body: CreateLegalTermSchema,
  ): Promise<LegalTermResponseDto> {
    const resolvedTenant = this.normalizeTenantForUser(
      currentUser,
      this.resolveTenantFromInputs(body.tenantId, tenantHeader) ?? null,
    );

    const term = await this.legalTermsService.createTerm({
      context: body.context,
      version: body.version,
      content: body.content,
      tenantId: resolvedTenant ?? null,
      createdBy: currentUser.id,
      publishNow: body.publishNow,
      publishBy: body.publishNow ? currentUser.id : undefined,
    });

    return LegalTermPresenter.toDto(term);
  }

  @Post(':termId/publish')
  @ApiOperation({ summary: 'Publicar termo legal' })
  @ApiParam({ name: 'termId', description: 'Identificador do termo legal' })
  @ApiResponse({ status: HttpStatus.OK, type: LegalTermResponseDto })
  async publishTerm(
    @CurrentUser() currentUser: ICurrentUser,
    @Param('termId') termId: string,
  ): Promise<LegalTermResponseDto> {
    const term = await this.legalTermsService.getById(termId);
    this.ensureUserCanManageTerm(currentUser, term);

    const updated = await this.legalTermsService.publishTerm(termId, currentUser.id);
    return LegalTermPresenter.toDto(updated);
  }

  @Post(':termId/retire')
  @ApiOperation({ summary: 'Desativar termo legal publicado' })
  @ApiParam({ name: 'termId', description: 'Identificador do termo legal' })
  @ApiResponse({ status: HttpStatus.OK, type: LegalTermResponseDto })
  async retireTerm(
    @CurrentUser() currentUser: ICurrentUser,
    @Param('termId') termId: string,
  ): Promise<LegalTermResponseDto> {
    const term = await this.legalTermsService.getById(termId);
    this.ensureUserCanManageTerm(currentUser, term);

    const retired = await this.legalTermsService.retireTerm(termId, currentUser.id);
    return LegalTermPresenter.toDto(retired);
  }

  private resolveTenantFromInputs(
    bodyTenantId: string | undefined,
    headerTenantId: string | undefined,
  ): string | undefined {
    if (bodyTenantId) {
      return bodyTenantId;
    }
    if (headerTenantId && headerTenantId.trim().length > 0) {
      return headerTenantId.trim();
    }
    return undefined;
  }

  private normalizeTenantForUser(
    user: ICurrentUser,
    tenantId: string | null | undefined,
  ): string | null | undefined {
    if (this.isInternalRole(user.role)) {
      return tenantId;
    }

    const userTenant = user.tenantId?.toString();

    if (!userTenant) {
      throw new BadRequestException('Usuário não possui tenant associado.');
    }

    if (tenantId && tenantId !== userTenant) {
      throw new BadRequestException('tenantId informado não pertence ao usuário autenticado.');
    }

    return userTenant;
  }

  private ensureUserCanManageTerm(user: ICurrentUser, term: LegalTerm): void {
    if (this.isInternalRole(user.role)) {
      return;
    }

    const userTenant = user.tenantId?.toString();
    if (!userTenant) {
      throw new BadRequestException('Usuário não possui tenant associado.');
    }

    if (term.tenantId && term.tenantId !== userTenant) {
      throw new BadRequestException('Usuário não possui permissão para gerenciar este termo.');
    }

    if (!term.tenantId && userTenant) {
      throw new BadRequestException(
        'Somente administradores internos podem gerenciar termos globais.',
      );
    }
  }

  private isInternalRole(role: string): boolean {
    return INTERNAL_ROLES.includes(role as RolesEnum);
  }
}
