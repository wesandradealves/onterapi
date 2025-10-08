import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnamnesisMetricsFeedbackDto {
  @ApiProperty({ description: 'Total de feedbacks registrados', example: 18 })
  total!: number;

  @ApiProperty({ description: 'Feedbacks aprovando o plano', example: 10 })
  approvals!: number;

  @ApiProperty({ description: 'Feedbacks solicitando modificacoes', example: 5 })
  modifications!: number;

  @ApiProperty({ description: 'Feedbacks rejeitando o plano', example: 3 })
  rejections!: number;

  @ApiProperty({ description: 'Quantidade de curtidas registradas', example: 12 })
  likes!: number;

  @ApiProperty({ description: 'Quantidade de descurtidas registradas', example: 2 })
  dislikes!: number;
}

export class AnamnesisMetricsSnapshotDto {
  @ApiProperty({ description: 'Total de steps salvos', example: 120 })
  stepsSaved!: number;

  @ApiProperty({ description: 'Total de auto-saves executados', example: 45 })
  autoSaves!: number;

  @ApiProperty({ description: 'Quantidade de steps concluidos', example: 95 })
  completedSteps!: number;

  @ApiProperty({ description: 'Taxa media de conclusao por step', example: 82.5 })
  averageStepCompletionRate!: number;

  @ApiProperty({ description: 'Numero de anamneses submetidas', example: 27 })
  submissions!: number;

  @ApiProperty({ description: 'Taxa media de conclusao na submissao', example: 91.2 })
  averageSubmissionCompletionRate!: number;

  @ApiProperty({ description: 'Quantidade de geracoes de IA concluidas', example: 24 })
  aiCompleted!: number;

  @ApiProperty({ description: 'Quantidade de falhas da IA', example: 2 })
  aiFailed!: number;

  @ApiProperty({ description: 'Confianca media retornada pela IA', example: 0.78 })
  averageAIConfidence!: number;

  @ApiProperty({ description: 'Total de tokens de entrada consumidos', example: 14500 })
  tokensInputTotal!: number;

  @ApiProperty({ description: 'Total de tokens de saida gerados', example: 9800 })
  tokensOutputTotal!: number;

  @ApiProperty({ description: 'Latencia media das respostas da IA (ms)', example: 1340 })
  averageAILatencyMs!: number;

  @ApiProperty({ description: 'Maior latencia registrada da IA (ms)', example: 3120 })
  maxAILatencyMs!: number;

  @ApiProperty({ description: 'Custo total estimado das execucoes da IA', example: 5.483271 })
  totalAICost!: number;

  @ApiProperty({ description: 'Resumo dos feedbacks sobre planos gerados', type: () => AnamnesisMetricsFeedbackDto })
  feedback!: AnamnesisMetricsFeedbackDto;

  @ApiPropertyOptional({
    description: 'Momento da ultima atualizacao (ISO)',
    example: '2025-09-26T06:15:00Z',
    nullable: true,
  })
  lastUpdatedAt?: string | null;
}

export class AnamnesisStepDto {
  @ApiProperty({
    description: 'Identificador do step',

    example: 'd1c2b3a4-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({ description: 'Numero sequencial do step', example: 1 })
  stepNumber!: number;

  @ApiProperty({ description: 'Chave do step', example: 'identification' })
  key!: string;

  @ApiProperty({ description: 'Dados preenchidos para o step' })
  payload!: Record<string, unknown>;

  @ApiProperty({ description: 'Indica se o step esta completo', example: true })
  completed!: boolean;

  @ApiProperty({ description: 'Indica se ha erros de validacao', example: false })
  hasErrors!: boolean;

  @ApiPropertyOptional({ description: 'Score de validacao do step', example: 92 })
  validationScore?: number;

  @ApiProperty({ description: 'Data da ultima atualizacao (ISO)', example: '2025-09-26T03:15:00Z' })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'Data de cancelamento (ISO)',

    example: '2025-09-26T06:00:00Z',

    nullable: true,
  })
  deletedAt?: string | null;

  @ApiPropertyOptional({
    description: 'Responsavel pelo cancelamento',

    example: '33333333-3333-3333-3333-333333333333',
  })
  deletedBy?: string;

  @ApiPropertyOptional({ description: 'Motivo registrado no cancelamento' })
  deletedReason?: string;

  @ApiProperty({ description: 'Data de criacao (ISO)', example: '2025-09-26T03:05:00Z' })
  createdAt!: string;
}

export class AnamnesisAttachmentDto {
  @ApiProperty({
    description: 'Identificador do anexo',

    example: 'b2a4c6d8-1234-5678-9101-abcdefabcdef',
  })
  id!: string;

  @ApiPropertyOptional({ description: 'Step associado ao anexo', example: 2 })
  stepNumber?: number;

  @ApiProperty({ description: 'Nome do arquivo', example: 'exame-hemograma.pdf' })
  fileName!: string;

  @ApiProperty({ description: 'Tipo MIME do arquivo', example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ description: 'Tamanho do arquivo em bytes', example: 524288 })
  size!: number;

  @ApiProperty({
    description: 'Caminho no storage',

    example: 'anamnesis/2025/09/exame-hemograma.pdf',
  })
  storagePath!: string;

  @ApiProperty({
    description: 'Identificador de quem fez upload',

    example: '8799aa12-3456-7890-bcde-f1234567890a',
  })
  uploadedBy!: string;

  @ApiProperty({ description: 'Data de upload (ISO)', example: '2025-09-26T04:30:00Z' })
  uploadedAt!: string;
}

export class AnamnesisStepTemplateDto {
  @ApiProperty({ description: 'Identificador do template', example: 'template-identification' })
  id!: string;

  @ApiProperty({ description: 'Chave unica do template', example: 'identification' })
  key!: string;

  @ApiProperty({ description: 'Titulo do template', example: 'Identificacao' })
  title!: string;

  @ApiPropertyOptional({ description: 'Descricao resumida do template' })
  description?: string;

  @ApiProperty({ description: 'Versao do template', example: 1 })
  version!: number;

  @ApiProperty({ description: 'Estrutura do template em JSON' })
  schema!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Especialidade associada', example: 'default' })
  specialty?: string;

  @ApiProperty({ description: 'Indica se o template esta ativo', example: true })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Tenant proprietario do template',

    example: '11111111-1111-1111-1111-111111111111',
  })
  tenantId?: string | null;

  @ApiProperty({ description: 'Data de criacao (ISO)', example: '2025-09-26T00:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Ultima atualizacao (ISO)', example: '2025-09-26T02:00:00Z' })
  updatedAt!: string;
}

export class TherapeuticPlanRecommendationDto {
  @ApiProperty({ description: 'Identificador da recomendacao', example: 'rec-1' })
  id!: string;

  @ApiProperty({
    description: 'Descricao da recomendacao',

    example: 'Praticar exercicios leves 3x por semana',
  })
  description!: string;

  @ApiPropertyOptional({ description: 'Prioridade da recomendacao', example: 'medium' })
  priority?: 'low' | 'medium' | 'high';
}

export class TherapeuticPlanRiskFactorDto {
  @ApiProperty({ description: 'Identificador do fator de risco', example: 'risk-1' })
  id!: string;

  @ApiProperty({
    description: 'Descricao do fator de risco',

    example: 'Historico familiar de hipertensao',
  })
  description!: string;

  @ApiPropertyOptional({ description: 'Severidade do fator', example: 'high' })
  severity?: 'low' | 'medium' | 'high';
}

export class TherapeuticPlanDto {
  @ApiProperty({ description: 'Identificador do plano', example: 'plan-123456' })
  id!: string;

  @ApiProperty({
    description: 'Identificador da anamnese',

    example: 'd1c2b3a4-5678-90ab-cdef-1234567890ab',
  })
  anamnesisId!: string;

  @ApiPropertyOptional({
    description: 'Identificador da analise IA vinculada',

    example: 'analysis-123456',
  })
  analysisId?: string;

  @ApiPropertyOptional({ description: 'Raciocinio clinico da IA' })
  clinicalReasoning?: string;

  @ApiPropertyOptional({ description: 'Resumo textual das recomendacoes' })
  summary?: string;

  @ApiPropertyOptional({ description: 'Plano terapeutico estruturado' })
  therapeuticPlan?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Fatores de risco identificados',

    type: () => [TherapeuticPlanRiskFactorDto],
  })
  riskFactors?: TherapeuticPlanRiskFactorDto[];

  @ApiPropertyOptional({
    description: 'Recomendacoes sugeridas',

    type: () => [TherapeuticPlanRecommendationDto],
  })
  recommendations?: TherapeuticPlanRecommendationDto[];

  @ApiPropertyOptional({ description: 'Plano terapeutico em texto livre' })
  planText?: string;

  @ApiPropertyOptional({ description: 'Raciocinio clinico textual' })
  reasoningText?: string;

  @ApiPropertyOptional({
    description: 'Mapa de evidencias associado ao plano',

    type: () => [Object],
  })
  evidenceMap?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Nivel de confianca do modelo', example: 0.85 })
  confidence?: number;

  @ApiProperty({ description: 'Status atual do plano', example: 'generated' })
  status!: 'generated' | 'accepted' | 'rejected' | 'superseded';

  @ApiProperty({ description: 'Indica se revisao humana e necessaria', example: true })
  reviewRequired!: boolean;

  @ApiProperty({ description: 'Termo de responsabilidade aceito', example: true })
  termsAccepted!: boolean;

  @ApiPropertyOptional({ description: 'Data de aceite (ISO)', example: '2025-09-26T05:45:00Z' })
  acceptedAt?: string;

  @ApiPropertyOptional({
    description: 'Identificador do profissional que aceitou',
    example: '33333333-3333-3333-3333-333333333333',
  })
  acceptedBy?: string;

  @ApiPropertyOptional({ description: 'Versao dos termos aceitos', example: 'v1.3-2025-09-20' })
  termsVersion?: string;

  @ApiPropertyOptional({
    description: 'Historico de aceites',
    type: () => [TherapeuticPlanAcceptanceDto],
  })
  acceptances?: TherapeuticPlanAcceptanceDto[];

  @ApiProperty({ description: 'Status de aprovacao', example: 'pending' })
  approvalStatus!: 'pending' | 'approved' | 'modified' | 'rejected';

  @ApiPropertyOptional({ description: 'Indica se o profissional aprovou o plano', example: true })
  liked?: boolean;

  @ApiPropertyOptional({ description: 'Comentario do profissional sobre o plano' })
  feedbackComment?: string;

  @ApiPropertyOptional({
    description: 'Identificador de quem forneceu o feedback',

    example: '8799aa12-3456-7890-bcde-f1234567890a',
  })
  feedbackGivenBy?: string;

  @ApiPropertyOptional({ description: 'Data do feedback (ISO)', example: '2025-09-26T04:45:00Z' })
  feedbackGivenAt?: string;

  @ApiProperty({ description: 'Data de geracao do plano (ISO)', example: '2025-09-26T04:40:00Z' })
  generatedAt!: string;

  @ApiProperty({
    description: 'Data de criacao do registro (ISO)',

    example: '2025-09-26T04:40:00Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Data de atualizacao do registro (ISO)',

    example: '2025-09-26T04:40:00Z',
  })
  updatedAt!: string;
}

export class TherapeuticPlanAcceptanceDto {
  @ApiProperty({ description: 'Identificador do aceite', example: 'acc-1' })
  id!: string;

  @ApiProperty({
    description: 'Profissional que realizou o aceite',
    example: '33333333-3333-3333-3333-333333333333',
  })
  professionalId!: string;

  @ApiProperty({ description: 'Data do aceite (ISO)', example: '2025-09-26T05:45:00Z' })
  acceptedAt!: string;

  @ApiProperty({ description: 'Versao dos termos aceitos', example: 'v1.4' })
  termsVersion!: string;

  @ApiProperty({ description: 'Snapshot do texto dos termos aceito' })
  termsTextSnapshot!: string;

  @ApiPropertyOptional({ description: 'IP utilizado no aceite' })
  acceptedIp?: string;

  @ApiPropertyOptional({ description: 'User-Agent do aceite' })
  acceptedUserAgent?: string;
}

export class AnamnesisDetailResponseDto {
  @ApiProperty({
    description: 'Identificador da anamnese',

    example: 'd1c2b3a4-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador da consulta relacionada',

    example: 'c1d2e3f4-5678-90ab-cdef-1234567890ab',
  })
  consultationId!: string;

  @ApiProperty({
    description: 'Identificador do paciente',

    example: 'p1d2e3f4-5678-90ab-cdef-1234567890ab',
  })
  patientId!: string;

  @ApiProperty({
    description: 'Identificador do profissional responsavel',

    example: '8799aa12-3456-7890-bcde-f1234567890a',
  })
  professionalId!: string;

  @ApiProperty({ description: 'Identificador do tenant', example: 'tenant-123' })
  tenantId!: string;

  @ApiProperty({ description: 'Status atual da anamnese', example: 'draft' })
  status!: string;

  @ApiProperty({ description: 'Total de steps configurados', example: 10 })
  totalSteps!: number;

  @ApiProperty({ description: 'Step atual em foco', example: 3 })
  currentStep!: number;

  @ApiProperty({ description: 'Percentual de conclusao', example: 45 })
  completionRate!: number;

  @ApiProperty({ description: 'Indica se ainda e um rascunho', example: true })
  isDraft!: boolean;

  @ApiPropertyOptional({
    description: 'Data do ultimo auto-save (ISO)',

    example: '2025-09-26T04:20:00Z',
  })
  lastAutoSavedAt?: string;

  @ApiPropertyOptional({ description: 'Data de submissao (ISO)', example: '2025-09-26T05:00:00Z' })
  submittedAt?: string;

  @ApiPropertyOptional({ description: 'Data de conclusao (ISO)', example: '2025-09-26T05:30:00Z' })
  completedAt?: string;

  @ApiProperty({ description: 'Data de criacao (ISO)', example: '2025-09-26T03:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de atualizacao (ISO)', example: '2025-09-26T04:25:00Z' })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'Data de cancelamento (ISO)',

    example: '2025-09-26T06:00:00Z',

    nullable: true,
  })
  deletedAt?: string | null;

  @ApiPropertyOptional({
    description: 'Responsavel pelo cancelamento',

    example: '33333333-3333-3333-3333-333333333333',
  })
  deletedBy?: string;

  @ApiPropertyOptional({ description: 'Motivo registrado no cancelamento' })
  deletedReason?: string;

  @ApiPropertyOptional({ description: 'Steps da anamnese', type: () => [AnamnesisStepDto] })
  steps?: AnamnesisStepDto[];

  @ApiPropertyOptional({
    description: 'Plano terapeutico mais recente',

    type: () => TherapeuticPlanDto,
  })
  latestPlan?: TherapeuticPlanDto | null;

  @ApiPropertyOptional({ description: 'Anexos associados', type: () => [AnamnesisAttachmentDto] })
  attachments?: AnamnesisAttachmentDto[];
}

export class AnamnesisListItemDto {
  @ApiProperty({
    description: 'Identificador da anamnese',

    example: 'd1c2b3a4-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador da consulta',

    example: 'c1d2e3f4-5678-90ab-cdef-1234567890ab',
  })
  consultationId!: string;

  @ApiProperty({
    description: 'Identificador do paciente',

    example: 'p1d2e3f4-5678-90ab-cdef-1234567890ab',
  })
  patientId!: string;

  @ApiProperty({
    description: 'Identificador do profissional',

    example: '8799aa12-3456-7890-bcde-f1234567890a',
  })
  professionalId!: string;

  @ApiProperty({ description: 'Status atual', example: 'submitted' })
  status!: string;

  @ApiProperty({ description: 'Percentual de conclusao', example: 100 })
  completionRate!: number;

  @ApiPropertyOptional({ description: 'Data de submissao (ISO)', example: '2025-09-26T05:00:00Z' })
  submittedAt?: string;

  @ApiProperty({ description: 'Data da ultima atualizacao (ISO)', example: '2025-09-26T05:10:00Z' })
  updatedAt!: string;
}

export class AnamnesisHistoryStepDto {
  @ApiProperty({ description: 'Numero do step', example: 1 })
  stepNumber!: number;

  @ApiProperty({ description: 'Chave do step', example: 'identification' })
  key!: string;

  @ApiProperty({ description: 'Conteudo registrado no step' })
  payload!: Record<string, unknown>;

  @ApiProperty({ description: 'Indica se o step foi concluido', example: true })
  completed!: boolean;

  @ApiProperty({ description: 'Indica se foram detectados erros', example: false })
  hasErrors!: boolean;

  @ApiPropertyOptional({ description: 'Score de validacao', example: 80 })
  validationScore?: number;

  @ApiProperty({ description: 'Ultima atualizacao do step (ISO)', example: '2025-09-27T03:10:00Z' })
  updatedAt!: string;
}

export class AnamnesisHistoryEntryDto {
  @ApiProperty({ description: 'Identificador da anamnese', example: 'anamnesis-001' })
  id!: string;

  @ApiProperty({ description: 'Identificador da consulta', example: 'consultation-001' })
  consultationId!: string;

  @ApiProperty({
    description: 'Identificador do profissional responsavel',

    example: 'professional-001',
  })
  professionalId!: string;

  @ApiProperty({ description: 'Status da anamnese', example: 'submitted' })
  status!: string;

  @ApiProperty({ description: 'Percentual de conclusao', example: 100 })
  completionRate!: number;

  @ApiPropertyOptional({ description: 'Data de submissao (ISO)', example: '2025-09-26T10:05:00Z' })
  submittedAt?: string;

  @ApiProperty({ description: 'Ultima atualizacao (ISO)', example: '2025-09-26T10:05:00Z' })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'Data de cancelamento (ISO)',

    example: '2025-09-26T06:00:00Z',

    nullable: true,
  })
  deletedAt?: string | null;

  @ApiPropertyOptional({
    description: 'Responsavel pelo cancelamento',

    example: '33333333-3333-3333-3333-333333333333',
  })
  deletedBy?: string;

  @ApiPropertyOptional({ description: 'Motivo registrado no cancelamento' })
  deletedReason?: string;

  @ApiProperty({ description: 'Steps registrados', type: () => [AnamnesisHistoryStepDto] })
  steps!: AnamnesisHistoryStepDto[];

  @ApiProperty({ description: 'Anexos vinculados', type: () => [AnamnesisAttachmentDto] })
  attachments!: AnamnesisAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Plano terapeutico associado',

    type: () => TherapeuticPlanDto,
  })
  latestPlan?: TherapeuticPlanDto | null;
}

export class AnamnesisHistoryPrefillDto {
  @ApiProperty({ description: 'Dados mais recentes por step' })
  steps!: Record<string, Record<string, unknown>>;

  @ApiProperty({ description: 'Anexos reutilizaveis', type: () => [AnamnesisAttachmentDto] })
  attachments!: AnamnesisAttachmentDto[];

  @ApiPropertyOptional({ description: 'Anamnese que originou o prefill', example: 'anamnesis-001' })
  sourceAnamnesisId?: string;

  @ApiPropertyOptional({
    description: 'Momento da ultima atualizacao do prefill',

    example: '2025-09-26T10:05:00Z',
  })
  updatedAt?: string;
}

export class AnamnesisHistoryResponseDto {
  @ApiProperty({ description: 'Identificador do paciente', example: 'patient-001' })
  patientId!: string;

  @ApiProperty({ description: 'Historico de anamneses', type: () => [AnamnesisHistoryEntryDto] })
  entries!: AnamnesisHistoryEntryDto[];

  @ApiProperty({
    description: 'Dados consolidados para pre-preenchimento',

    type: () => AnamnesisHistoryPrefillDto,
  })
  prefill!: AnamnesisHistoryPrefillDto;
}
