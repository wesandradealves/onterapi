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
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { unwrapResult } from '../../../../shared/types/result.type';
import { IStartAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import { IGetAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import { ISaveAnamnesisStepUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
import { ISubmitAnamnesisUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '../../../../domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import {
  AnamnesisAttachmentDto,
  AnamnesisDetailResponseDto,
  AnamnesisListItemDto,
  TherapeuticPlanDto,
} from '../dtos/anamnesis-response.dto';
import {
  CreateAnamnesisAttachmentRequestDto,
  SaveAnamnesisStepRequestDto,
  SavePlanFeedbackRequestDto,
  SaveTherapeuticPlanRequestDto,
  StartAnamnesisRequestDto,
} from '../dtos/anamnesis-request.dto';
import {
  CreateAttachmentSchema,
  createAttachmentSchema,
  GetAnamnesisQuerySchema,
  getAnamnesisQuerySchema,
  ListAnamnesesQuerySchema,
  listAnamnesesQuerySchema,
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

@ApiTags('Anamnesis')
@ApiBearerAuth()
@Controller('anamneses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnamnesisController {
  private readonly logger = new Logger(AnamnesisController.name);

  constructor(
    @Inject(IStartAnamnesisUseCase)
    private readonly startAnamnesisUseCase: IStartAnamnesisUseCase,
    @Inject(IGetAnamnesisUseCase)
    private readonly getAnamnesisUseCase: IGetAnamnesisUseCase,
    @Inject(ISaveAnamnesisStepUseCase)
    private readonly saveAnamnesisStepUseCase: ISaveAnamnesisStepUseCase,
    @Inject(ISubmitAnamnesisUseCase)
    private readonly submitAnamnesisUseCase: ISubmitAnamnesisUseCase,
    @Inject(IListAnamnesesByPatientUseCase)
    private readonly listByPatientUseCase: IListAnamnesesByPatientUseCase,
    @Inject(ISaveTherapeuticPlanUseCase)
    private readonly savePlanUseCase: ISaveTherapeuticPlanUseCase,
    @Inject(ISavePlanFeedbackUseCase)
    private readonly savePlanFeedbackUseCase: ISavePlanFeedbackUseCase,
    @Inject(ICreateAnamnesisAttachmentUseCase)
    private readonly createAttachmentUseCase: ICreateAnamnesisAttachmentUseCase,
    @Inject(IRemoveAnamnesisAttachmentUseCase)
    private readonly removeAttachmentUseCase: IRemoveAnamnesisAttachmentUseCase,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Iniciar anamnese',
    description: 'Cria uma nova anamnese ou retorna a existente para a consulta informada.',
  })
  @ApiBody({ type: StartAnamnesisRequestDto })
  @ApiResponse({ status: 201, type: AnamnesisDetailResponseDto })
  async start(
    @Body(new ZodValidationPipe(startAnamnesisSchema)) body: StartAnamnesisSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.startAnamnesisUseCase.execute({
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

    const anamnesis = unwrapResult(result);

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
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.getAnamnesisUseCase.execute({
      tenantId: context.tenantId,
      anamnesisId,
      includeSteps: query.includeSteps,
      includeLatestPlan: query.includeLatestPlan,
      includeAttachments: query.includeAttachments,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    const anamnesis = unwrapResult(result);

    return AnamnesisPresenter.detail(anamnesis);
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
  @ApiQuery({ name: 'status', required: false, type: [String] })
  @ApiQuery({ name: 'professionalId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, type: [AnamnesisListItemDto] })
  async listByPatient(
    @Param('patientId') patientId: string,
    @Query(new ZodValidationPipe(listAnamnesesQuerySchema)) query: ListAnamnesesQuerySchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<AnamnesisListItemDto[]> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.listByPatientUseCase.execute({
      tenantId: context.tenantId,
      patientId,
      requesterId: context.userId,
      requesterRole: context.role,
      filters: {
        status: query.status,
        professionalId: query.professionalId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
    });

    const items = unwrapResult(result);

    return AnamnesisPresenter.list(items);
  }

  @Put(':anamnesisId/steps/:stepNumber')
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
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
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);
    const stepIndex = Number(stepNumber);

    const result = await this.saveAnamnesisStepUseCase.execute({
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

    const anamnesis = unwrapResult(result);

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
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<AnamnesisDetailResponseDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.submitAnamnesisUseCase.execute({
      tenantId: context.tenantId,
      anamnesisId,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    const anamnesis = unwrapResult(result);

    return AnamnesisPresenter.detail(anamnesis);
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
    @Headers('x-tenant-id') tenantHeader?: string,
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

    const result = await this.savePlanUseCase.execute({
      tenantId: context.tenantId,
      anamnesisId,
      clinicalReasoning: body.clinicalReasoning,
      summary: body.summary,
      therapeuticPlan: body.therapeuticPlan,
      riskFactors,
      recommendations,
      confidence: body.confidence,
      reviewRequired: body.reviewRequired,
      generatedAt: new Date(body.generatedAt),
      requesterId: context.userId,
      requesterRole: context.role,
    });

    const plan = unwrapResult(result);

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
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<TherapeuticPlanDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.savePlanFeedbackUseCase.execute({
      tenantId: context.tenantId,
      anamnesisId,
      approvalStatus: body.approvalStatus,
      liked: body.liked,
      feedbackComment: body.feedbackComment,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    const plan = unwrapResult(result);

    return AnamnesisPresenter.plan(plan);
  }

  @Post(':anamnesisId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Cadastrar anexo',
    description: 'Vincula um novo anexo a anamnese.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiBody({ type: CreateAnamnesisAttachmentRequestDto })
  @ApiResponse({ status: 201, type: AnamnesisAttachmentDto })
  async createAttachment(
    @Param('anamnesisId') anamnesisId: string,
    @Body(new ZodValidationPipe(createAttachmentSchema)) body: CreateAttachmentSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<AnamnesisAttachmentDto> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.createAttachmentUseCase.execute({
      tenantId: context.tenantId,
      anamnesisId,
      stepNumber: body.stepNumber,
      fileName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      storagePath: body.storagePath,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    const attachment = unwrapResult(result);

    return AnamnesisPresenter.attachment(attachment);
  }

  @Delete(':anamnesisId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RolesEnum.PROFESSIONAL, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Remover anexo',
    description: 'Remove um anexo associado a anamnese.',
  })
  @ApiParam({ name: 'anamnesisId', description: 'Identificador da anamnese' })
  @ApiParam({ name: 'attachmentId', description: 'Identificador do anexo' })
  async removeAttachment(
    @Param('anamnesisId') anamnesisId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<void> {
    const context = this.resolveContext(currentUser, tenantHeader);

    const result = await this.removeAttachmentUseCase.execute({
      tenantId: context.tenantId,
      anamnesisId,
      attachmentId,
      requesterId: context.userId,
      requesterRole: context.role,
    });

    unwrapResult(result);
  }

  private resolveContext(currentUser: ICurrentUser, tenantHeader?: string) {
    const tenantId = tenantHeader ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    return {
      tenantId,
      userId: currentUser.id,
      role: currentUser.role,
    };
  }
}
