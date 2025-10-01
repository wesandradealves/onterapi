import type { Express, Request } from 'express';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { Public } from '../../../auth/decorators/public.decorator';

import { FileInterceptor } from '@nestjs/platform-express';

import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';

import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';

import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';

import {
  type AnamnesisStatus,
  AnamnesisStepKey,
  GetStepTemplatesFilters,
} from '../../../../domain/anamnesis/types/anamnesis.types';

import { IStartAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';

import { IGetAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';

import { ISaveAnamnesisStepUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';

import { IAutoSaveAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/auto-save-anamnesis.use-case.interface';

import { ISubmitAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';

import { IListAnamnesesByPatientUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';

import { IGetAnamnesisHistoryUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/get-anamnesis-history.use-case.interface';

import { ISaveTherapeuticPlanUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';

import { ISavePlanFeedbackUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';

import { ICreateAnamnesisAttachmentUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';

import { IRemoveAnamnesisAttachmentUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';

import { IReceiveAnamnesisAIResultUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/receive-anamnesis-ai-result.use-case.interface';

import { ICancelAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/cancel-anamnesis.use-case.interface';

import { IListAnamnesisStepTemplatesUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/list-anamnesis-step-templates.use-case.interface';

import {
  AnamnesisAttachmentDto,
  AnamnesisDetailResponseDto,
  AnamnesisHistoryResponseDto,
  AnamnesisListItemDto,
  AnamnesisStepTemplateDto,
  TherapeuticPlanDto,
} from '../dtos/anamnesis-response.dto';

import {
  AutoSaveAnamnesisStepRequestDto,
  CancelAnamnesisRequestDto,
  CreateAnamnesisAttachmentRequestDto,
  ReceiveAIResultRequestDto,
  SaveAnamnesisStepRequestDto,
  SavePlanFeedbackRequestDto,
  SaveTherapeuticPlanRequestDto,
  StartAnamnesisRequestDto,
} from '../dtos/anamnesis-request.dto';

import {
  AnamnesisHistoryQuerySchema,
  anamnesisHistoryQuerySchema,
  AutoSaveAnamnesisStepSchema,
  autoSaveAnamnesisStepSchema,
  CancelAnamnesisSchema,
  cancelAnamnesisSchema,
  CreateAttachmentSchema,
  createAttachmentSchema,
  GetAnamnesisQuerySchema,
  getAnamnesisQuerySchema,
  ListAnamnesesQuerySchema,
  listAnamnesesQuerySchema,
  ListStepTemplatesQuerySchema,
  listStepTemplatesQuerySchema,
  ReceiveAIResultSchema,
  receiveAIResultSchema,
  SaveAnamnesisStepSchema,
  saveAnamnesisStepSchema,
  SavePlanFeedbackSchema,
  savePlanFeedbackSchema,
  SaveTherapeuticPlanSchema,
  saveTherapeuticPlanSchema,
  StartAnamnesisSchema,
  startAnamnesisSchema,
} from '../schemas/anamnesis.schema';

import { AnamnesisPresenter } from '../presenters/anamnesis.presenter';

import { memoryStorage } from 'multer';

import { AnamnesisAIWebhookGuard } from '../../guards/anamnesis-ai-webhook.guard';

const ANAMNESIS_STATUS_VALUES: readonly AnamnesisStatus[] = [
  'draft',

  'submitted',

  'completed',

  'cancelled',
];

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

@ApiTags('Anamnesis')
@ApiBearerAuth()
@Controller('anamneses')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AnamnesisController {
  private readonly logger = new Logger(AnamnesisController.name);

  constructor(
    @Inject(IStartAnamnesisUseCase) private readonly startAnamnesisUseCase: IStartAnamnesisUseCase,

    @Inject(IGetAnamnesisUseCase) private readonly getAnamnesisUseCase: IGetAnamnesisUseCase,

    @Inject(ISaveAnamnesisStepUseCase)
    private readonly saveAnamnesisStepUseCase: ISaveAnamnesisStepUseCase,

    @Inject(IAutoSaveAnamnesisUseCase)
    private readonly autoSaveAnamnesisUseCase: IAutoSaveAnamnesisUseCase,

    @Inject(ISubmitAnamnesisUseCase)
    private readonly submitAnamnesisUseCase: ISubmitAnamnesisUseCase,

    @Inject(IListAnamnesesByPatientUseCase)
    private readonly listByPatientUseCase: IListAnamnesesByPatientUseCase,

    @Inject(IGetAnamnesisHistoryUseCase)
    private readonly getAnamnesisHistoryUseCase: IGetAnamnesisHistoryUseCase,

    @Inject(ISaveTherapeuticPlanUseCase)
    private readonly savePlanUseCase: ISaveTherapeuticPlanUseCase,

    @Inject(ISavePlanFeedbackUseCase)
    private readonly savePlanFeedbackUseCase: ISavePlanFeedbackUseCase,

    @Inject(ICreateAnamnesisAttachmentUseCase)
    private readonly createAttachmentUseCase: ICreateAnamnesisAttachmentUseCase,

    @Inject(IRemoveAnamnesisAttachmentUseCase)
    private readonly removeAttachmentUseCase: IRemoveAnamnesisAttachmentUseCase,

    @Inject(IReceiveAnamnesisAIResultUseCase)
    private readonly receiveAIResultUseCase: IReceiveAnamnesisAIResultUseCase,

    @Inject(ICancelAnamnesisUseCase)
    private readonly cancelAnamnesisUseCase: ICancelAnamnesisUseCase,

    @Inject(IListAnamnesisStepTemplatesUseCase)
    private readonly listStepTemplatesUseCase: IListAnamnesisStepTemplatesUseCase,
  ) {}

  @Get('templates')
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Listar templates de steps',

    description: 'Retorna os templates de steps disponiveis para o tenant atual.',
  })
  @ApiQuery({
    name: 'specialty',

    required: false,

    type: String,

    description: 'Prioriza templates cadastrados para a especialidade.',
  })
  @ApiQuery({
    name: 'includeInactive',

    required: false,

    type: Boolean,

    description: 'Quando true, retorna templates inativos para auditoria.',
  })
  @ApiResponse({ status: 200, type: AnamnesisStepTemplateDto, isArray: true })
  async listTemplates(
    @Query(new ZodValidationPipe(listStepTemplatesQuerySchema)) query: ListStepTemplatesQuerySchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisStepTemplateDto[]> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const filters: GetStepTemplatesFilters = {
      specialty: query.specialty,

      includeInactive: query.includeInactive ?? false,
    };

    const templates = await this.listStepTemplatesUseCase.executeOrThrow({
      tenantId: context.tenantId,

      requesterId: context.userId,

      requesterRole: context.role,

      filters,
    });

    return AnamnesisPresenter.templates(templates);
  }
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Iniciar anamnese',

    description: 'Cria uma nova anamnese ou retorna a existente para a consulta informada.',
  })
  @ApiBody({ type: StartAnamnesisRequestDto })
  @ApiResponse({ status: 201, type: AnamnesisDetailResponseDto })
  async start(
    @Body(new ZodValidationPipe(startAnamnesisSchema)) body: StartAnamnesisSchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const anamnesis = await this.startAnamnesisUseCase.executeOrThrow({
      tenantId: context.tenantId,

      consultationId: body.consultationId,

      patientId: body.patientId,

      professionalId: body.professionalId,

      totalSteps: body.totalSteps ?? 0,

      initialStep: body.initialStep,

      formData: body.formData,

      requesterId: context.userId,

      requesterRole: context.role,
    });

    return AnamnesisPresenter.detail(anamnesis);
  }

  @Get(':anamnesisId')
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Detalhar anamnese',

    description: 'Retorna informacoes detalhadas da anamnese informada.',
  })
  @ApiParam({
    name: 'anamnesisId',

    description: 'Identificador da anamnese',

    example: 'd1c2b3a4-5678-90ab-cdef-1234567890ab',
  })
  @ApiResponse({ status: 200, type: AnamnesisDetailResponseDto })
  async detail(
    @Param('anamnesisId') anamnesisId: string,

    @Query(new ZodValidationPipe(getAnamnesisQuerySchema)) query: GetAnamnesisQuerySchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Req() req: Request,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const requesterIp = this.getClientIp(req);
    const requesterUserAgent = req?.headers['user-agent'] ?? undefined;

    const anamnesis = await this.getAnamnesisUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      includeSteps: query.includeSteps,

      includeLatestPlan: query.includeLatestPlan,

      includeAttachments: query.includeAttachments,

      requesterId: context.userId,

      requesterRole: context.role,
      requesterIp: requesterIp ?? undefined,
      requesterUserAgent: requesterUserAgent,
    });

    return AnamnesisPresenter.detail(anamnesis);
  }

  @Get('patient/:patientId/history')
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Historico de anamnese',

    description: 'Retorna dados completos de anamneses anteriores para pre-preenchimento.',
  })
  @ApiParam({ name: 'patientId', description: 'Identificador do paciente' })
  @ApiQuery({
    name: 'limit',

    required: false,

    type: Number,

    description: 'Quantidade maxima de registros (1-50).',
  })
  @ApiQuery({
    name: 'status',

    required: false,

    enum: ANAMNESIS_STATUS_VALUES,

    isArray: true,

    description: 'Filtra pelos status desejados.',
  })
  @ApiQuery({
    name: 'includeDrafts',

    required: false,

    type: Boolean,

    description: 'Quando true, inclui rascunhos no historico.',
  })
  @ApiResponse({ status: 200, type: AnamnesisHistoryResponseDto })
  async getHistory(
    @Param('patientId') patientId: string,

    @Query(new ZodValidationPipe(anamnesisHistoryQuerySchema)) query: AnamnesisHistoryQuerySchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisHistoryResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const statuses = query.status?.filter((status): status is AnamnesisStatus =>
      ANAMNESIS_STATUS_VALUES.includes(status as AnamnesisStatus),
    );

    const history = await this.getAnamnesisHistoryUseCase.executeOrThrow({
      tenantId: context.tenantId,

      patientId,

      requesterId: context.userId,

      requesterRole: context.role,

      filters: {
        limit: query.limit,

        statuses,

        includeDrafts: query.includeDrafts,
      },
    });

    return AnamnesisPresenter.history(history);
  }

  @Get('/patient/:patientId')
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Listar anamneses do paciente',

    description: 'Retorna as anamneses associadas ao paciente informado.',
  })
  @ApiParam({
    name: 'patientId',

    description: 'Identificador do paciente',

    example: 'p1d2e3f4-5678-90ab-cdef-1234567890ab',
  })
  @ApiQuery({
    name: 'status',

    required: false,

    enum: ANAMNESIS_STATUS_VALUES,

    isArray: true,

    description: 'Filtra por status (draft, submitted, completed, cancelled).',
  })
  @ApiQuery({
    name: 'professionalId',

    required: false,

    type: String,

    description: 'Filtra pelo profissional responsavel.',
  })
  @ApiQuery({
    name: 'from',

    required: false,

    type: String,

    description: 'Data/hora inicial (ISO 8601).',
  })
  @ApiQuery({
    name: 'to',

    required: false,

    type: String,

    description: 'Data/hora final (ISO 8601).',
  })
  @ApiResponse({ status: 200, type: AnamnesisListItemDto, isArray: true })
  async listByPatient(
    @Param('patientId') patientId: string,

    @Query(new ZodValidationPipe(listAnamnesesQuerySchema)) query: ListAnamnesesQuerySchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisListItemDto[]> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const items = await this.listByPatientUseCase.executeOrThrow({
      tenantId: context.tenantId,

      patientId,

      requesterId: context.userId,

      requesterRole: context.role,

      filters: {
        status: query.status?.map((status) => status as AnamnesisStatus),

        professionalId: query.professionalId,

        from: query.from ? new Date(query.from) : undefined,

        to: query.to ? new Date(query.to) : undefined,
      },
    });

    return AnamnesisPresenter.list(items);
  }

  @Put(':anamnesisId/steps/:stepNumber')
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Salvar step da anamnese',

    description: 'Atualiza os dados de um step especifico da anamnese.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiParam({ name: 'stepNumber', description: 'Numero do step', example: 3 })
  @ApiBody({ type: SaveAnamnesisStepRequestDto })
  @ApiResponse({ status: 200, type: AnamnesisDetailResponseDto })
  async saveStep(
    @Param('anamnesisId') anamnesisId: string,

    @Param('stepNumber') stepNumber: string,

    @Body(new ZodValidationPipe(saveAnamnesisStepSchema)) body: SaveAnamnesisStepSchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const stepIndex = Number(stepNumber);

    const anamnesis = await this.saveAnamnesisStepUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      stepNumber: stepIndex,

      key: body.key as AnamnesisStepKey,

      payload: body.payload,

      completed: body.completed,

      hasErrors: body.hasErrors,

      validationScore: body.validationScore,

      requesterId: context.userId,

      requesterRole: context.role,
    });

    return AnamnesisPresenter.detail(anamnesis);
  }

  @Post(':anamnesisId/auto-save')
  @HttpCode(HttpStatus.OK)
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({
    summary: 'Auto salvar step da anamnese',

    description: 'Persiste um rascunho parcial do step informado.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: AutoSaveAnamnesisStepRequestDto })
  @ApiResponse({ status: 200, type: AnamnesisDetailResponseDto })
  async autoSaveStep(
    @Param('anamnesisId') anamnesisId: string,

    @Body(new ZodValidationPipe(autoSaveAnamnesisStepSchema)) body: AutoSaveAnamnesisStepSchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const anamnesis = await this.autoSaveAnamnesisUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      stepNumber: body.stepNumber,

      key: body.key as AnamnesisStepKey,

      payload: body.payload,

      hasErrors: body.hasErrors,

      validationScore: body.validationScore,

      autoSavedAt: body.autoSavedAt ? new Date(body.autoSavedAt) : undefined,

      requesterId: context.userId,

      requesterRole: context.role,
    });

    return AnamnesisPresenter.detail(anamnesis);
  }

  @Post(':anamnesisId/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Submeter anamnese',

    description: 'Finaliza a anamnese e dispara a analise pela IA.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiResponse({ status: 200, type: AnamnesisDetailResponseDto })
  async submit(
    @Param('anamnesisId') anamnesisId: string,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const anamnesis = await this.submitAnamnesisUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      requesterId: context.userId,

      requesterRole: context.role,
    });

    return AnamnesisPresenter.detail(anamnesis);
  }

  @Post(':anamnesisId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Cancelar anamnese',

    description: 'Cancela a anamnese preservando o registro para auditoria.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: CancelAnamnesisRequestDto })
  @ApiResponse({ status: 204, description: 'Anamnese cancelada' })
  async cancel(
    @Param('anamnesisId') anamnesisId: string,

    @Body(new ZodValidationPipe(cancelAnamnesisSchema)) body: CancelAnamnesisSchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader);

    await this.cancelAnamnesisUseCase.executeOrThrow({
      anamnesisId,

      tenantId: context.tenantId,

      requestedBy: context.userId,

      requesterRole: context.role,

      reason: body.reason,
    });
  }

  @Post(':anamnesisId/plan')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Salvar plano terapeutico gerado',

    description: 'Persiste o plano terapeutico gerado para a anamnese.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: SaveTherapeuticPlanRequestDto })
  @ApiResponse({ status: 201, type: TherapeuticPlanDto })
  async savePlan(
    @Param('anamnesisId') anamnesisId: string,

    @Body(new ZodValidationPipe(saveTherapeuticPlanSchema)) body: SaveTherapeuticPlanSchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Req() req?: Request,
  ): Promise<TherapeuticPlanDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const riskFactors = body.riskFactors?.map((item) => ({
      id: item.id,

      description: item.description,

      severity: item.severity,
    }));

    const recommendations = body.recommendations?.map((item) => ({
      id: item.id,

      description: item.description,

      priority: item.priority,
    }));

    const acceptanceIp = this.getClientIp(req);

    const acceptanceUserAgent = req?.headers['user-agent'] ?? undefined;

    const plan = await this.savePlanUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      clinicalReasoning: body.clinicalReasoning,

      summary: body.summary,

      therapeuticPlan: body.therapeuticPlan,

      riskFactors,

      recommendations,

      analysisId: body.analysisId,

      planText: body.planText,

      reasoningText: body.reasoningText,

      evidenceMap: body.evidenceMap,

      confidence: body.confidence,

      reviewRequired: body.reviewRequired,

      termsVersion: body.termsVersion,

      termsTextSnapshot: body.termsTextSnapshot,

      termsAccepted: body.termsAccepted,

      generatedAt: new Date(body.generatedAt),

      requesterId: context.userId,

      requesterRole: context.role,

      acceptanceIp,

      acceptanceUserAgent,
    });

    return AnamnesisPresenter.plan(plan);
  }

  @Post(':anamnesisId/plan/feedback')
  @HttpCode(HttpStatus.OK)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Salvar feedback do plano',

    description: 'Armazena o feedback do profissional sobre o plano gerado.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: SavePlanFeedbackRequestDto })
  @ApiResponse({ status: 200, type: TherapeuticPlanDto })
  async saveFeedback(
    @Param('anamnesisId') anamnesisId: string,

    @Body(new ZodValidationPipe(savePlanFeedbackSchema)) body: SavePlanFeedbackSchema,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<TherapeuticPlanDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const plan = await this.savePlanFeedbackUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      approvalStatus: body.approvalStatus,

      liked: body.liked,

      feedbackComment: body.feedbackComment,

      requesterId: context.userId,

      requesterRole: context.role,
    });

    return AnamnesisPresenter.plan(plan);
  }

  @Public()
  @Post(':anamnesisId/ai-result')
  @UseGuards(AnamnesisAIWebhookGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Receber resultado da IA',

    description: 'Webhook de retorno das analises automatizadas.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: ReceiveAIResultRequestDto })
  @ApiResponse({ status: 202, description: 'Resultado recebido com sucesso' })
  async receiveAIResult(
    @Param('anamnesisId') anamnesisId: string,

    @Body(new ZodValidationPipe(receiveAIResultSchema)) body: ReceiveAIResultSchema,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<void> {
    const tenantId = this.resolveTenantId(tenantHeader);

    await this.receiveAIResultUseCase.executeOrThrow({
      tenantId,

      anamnesisId,

      analysisId: body.analysisId,

      status: body.status,

      clinicalReasoning: body.clinicalReasoning,

      summary: body.summary,

      therapeuticPlan: body.therapeuticPlan,

      riskFactors: body.riskFactors,

      recommendations: body.recommendations,

      planText: body.planText,

      reasoningText: body.reasoningText,

      evidenceMap: body.evidenceMap,

      model: body.model,

      promptVersion: body.promptVersion,

      tokensInput: body.tokensInput,

      tokensOutput: body.tokensOutput,

      latencyMs: body.latencyMs,

      rawResponse: body.rawResponse,

      confidence: body.confidence,

      payload: body.payload,

      respondedAt: new Date(body.respondedAt),

      errorMessage: body.errorMessage,
    });
  }

  @Post(':anamnesisId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cadastrar anexo', description: 'Vincula um novo anexo a anamnese.' })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: CreateAnamnesisAttachmentRequestDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    }),
  )
  @ApiResponse({ status: 201, type: AnamnesisAttachmentDto })
  async createAttachment(
    @Param('anamnesisId') anamnesisId: string,

    @Body(new ZodValidationPipe(createAttachmentSchema)) body: CreateAttachmentSchema,

    @UploadedFile() file: Express.Multer.File,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<AnamnesisAttachmentDto> {
    if (!file) {
      throw new BadRequestException('Arquivo do anexo obrigatorio');
    }

    if (!file.buffer || file.size <= 0) {
      throw new BadRequestException('Arquivo enviado esta vazio');
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('Arquivo excede o limite permitido');
    }

    const context = this.resolveContext(currentUser, tenantHeader);

    const effectiveFileName =
      body.fileName && body.fileName.length > 0
        ? body.fileName
        : (file.originalname ?? 'anexo').trim();

    const attachment = await this.createAttachmentUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      stepNumber: body.stepNumber,

      fileName: effectiveFileName,

      mimeType: file.mimetype,

      size: file.size,

      fileBuffer: file.buffer,

      requesterId: context.userId,

      requesterRole: context.role,
    });

    return AnamnesisPresenter.attachment(attachment);
  }

  @Delete(':anamnesisId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    RolesEnum.PROFESSIONAL,

    RolesEnum.CLINIC_OWNER,

    RolesEnum.MANAGER,

    RolesEnum.SUPER_ADMIN,

    RolesEnum.PATIENT,
  )
  @ApiOperation({ summary: 'Remover anexo', description: 'Remove um anexo associado a anamnese.' })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiParam({ name: 'attachmentId', description: 'Identificador do anexo' })
  async removeAttachment(
    @Param('anamnesisId') anamnesisId: string,

    @Param('attachmentId') attachmentId: string,

    @CurrentUser() currentUser: ICurrentUser,

    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader);

    await this.removeAttachmentUseCase.executeOrThrow({
      tenantId: context.tenantId,

      anamnesisId,

      attachmentId,

      requesterId: context.userId,

      requesterRole: context.role,
    });
  }

  private resolveContext(currentUser: ICurrentUser, tenantHeader?: string) {
    const tenantId = this.resolveTenantId(tenantHeader, currentUser.tenantId);

    return { tenantId, userId: currentUser.id, role: currentUser.role };
  }

  private resolveTenantId(tenantHeader?: string, fallbackTenantId?: string | null): string {
    const headerValue = tenantHeader?.trim();

    const fallbackValue =
      typeof fallbackTenantId === 'string' ? fallbackTenantId.trim() : undefined;

    const tenantId = headerValue || fallbackValue;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    return tenantId;
  }

  private getClientIp(req?: Request): string | undefined {
    if (!req) {
      return undefined;
    }

    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }

    return req.ip;
  }
}
