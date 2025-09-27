import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartAnamnesisRequestDto {
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
    description: 'Identificador do profissional responsavel',
    example: '8799aa12-3456-7890-bcde-f1234567890a',
  })
  professionalId!: string;

  @ApiPropertyOptional({ description: 'Quantidade total de steps', example: 10 })
  totalSteps?: number;

  @ApiPropertyOptional({ description: 'Step inicial', example: 1 })
  initialStep?: number;

  @ApiPropertyOptional({ description: 'Dados iniciais do formulario' })
  formData?: Record<string, unknown>;
}

export class SaveAnamnesisStepRequestDto {
  @ApiProperty({ description: 'Chave do step', example: 'lifestyle' })
  key!: string;

  @ApiProperty({ description: 'Dados preenchidos para o step' })
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Indica se o step foi concluido', example: true })
  completed?: boolean;

  @ApiPropertyOptional({ description: 'Indica se ha erros de validacao', example: false })
  hasErrors?: boolean;

  @ApiPropertyOptional({ description: 'Score de validacao', example: 92 })
  validationScore?: number;
}

export class TherapeuticPlanRiskFactorInputDto {
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

export class TherapeuticPlanRecommendationInputDto {
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

export class SaveTherapeuticPlanRequestDto {
  @ApiPropertyOptional({ description: 'Raciocinio clinico gerado pelo modelo' })
  clinicalReasoning?: string;

  @ApiPropertyOptional({ description: 'Resumo textual do plano' })
  summary?: string;

  @ApiPropertyOptional({ description: 'Representacao estruturada do plano' })
  therapeuticPlan?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Fatores de risco identificados',
    type: () => [TherapeuticPlanRiskFactorInputDto],
  })
  riskFactors?: TherapeuticPlanRiskFactorInputDto[];

  @ApiPropertyOptional({
    description: 'Recomendacoes sugeridas',
    type: () => [TherapeuticPlanRecommendationInputDto],
  })
  recommendations?: TherapeuticPlanRecommendationInputDto[];

  @ApiPropertyOptional({ description: 'Grau de confianca do modelo', example: 0.85 })
  confidence?: number;

  @ApiPropertyOptional({ description: 'Indica se revisao humana e necessaria', example: false })
  reviewRequired?: boolean;

  @ApiProperty({ description: 'Data de geracao do plano (ISO)', example: '2025-09-26T04:40:00Z' })
  generatedAt!: string;
}

export class SavePlanFeedbackRequestDto {
  @ApiProperty({
    description: 'Status de aprovacao atribuido pelo profissional',
    example: 'approved',
  })
  approvalStatus!: 'approved' | 'modified' | 'rejected';

  @ApiPropertyOptional({
    description: 'Indica se o profissional aprovou as sugestoes',
    example: true,
  })
  liked?: boolean;

  @ApiPropertyOptional({ description: 'Comentario textual do profissional' })
  feedbackComment?: string;
}

export class CreateAnamnesisAttachmentRequestDto {
  @ApiPropertyOptional({ description: 'Step relacionado ao anexo', example: 2 })
  stepNumber?: number;

  @ApiProperty({ description: 'Nome do arquivo', example: 'exame-hemograma.pdf' })
  fileName!: string;

  @ApiProperty({ description: 'Tipo MIME', example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ description: 'Tamanho em bytes', example: 524288 })
  size!: number;

  @ApiProperty({
    description: 'Endereco do arquivo no storage',
    example: 'anamnesis/2025/09/exame-hemograma.pdf',
  })
  storagePath!: string;
}

export class GetAnamnesisQueryDto {
  @ApiPropertyOptional({ description: 'Carrega os steps associados', example: true })
  includeSteps?: boolean;

  @ApiPropertyOptional({ description: 'Carrega o ultimo plano gerado', example: true })
  includeLatestPlan?: boolean;

  @ApiPropertyOptional({ description: 'Carrega anexos cadastrados', example: true })
  includeAttachments?: boolean;
}

export class ListAnamnesesQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por status',
    example: ['submitted', 'draft'],
    type: [String],
  })
  status?: string[];

  @ApiPropertyOptional({
    description: 'Filtra por profissional responsavel',
    example: '8799aa12-3456-7890-bcde-f1234567890a',
  })
  professionalId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por data inicial (ISO)',
    example: '2025-09-20T00:00:00Z',
  })
  from?: string;

  @ApiPropertyOptional({
    description: 'Filtra por data final (ISO)',
    example: '2025-09-27T23:59:59Z',
  })
  to?: string;
}
