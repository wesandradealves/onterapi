import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Nivel de confianca do modelo', example: 0.85 })
  confidence?: number;

  @ApiProperty({ description: 'Indica se revisao humana e necessaria', example: true })
  reviewRequired!: boolean;

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
