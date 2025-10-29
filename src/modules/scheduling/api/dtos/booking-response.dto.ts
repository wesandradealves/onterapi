import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PricingSplitResponseDto {
  @ApiProperty({ description: 'Valor total em centavos' })
  totalCents!: number;

  @ApiProperty({ description: 'Parcela da plataforma em centavos' })
  platformCents!: number;

  @ApiProperty({ description: 'Parcela da clinica em centavos' })
  clinicCents!: number;

  @ApiProperty({ description: 'Parcela do profissional em centavos' })
  professionalCents!: number;

  @ApiProperty({ description: 'Taxa do gateway em centavos' })
  gatewayCents!: number;

  @ApiProperty({ description: 'Impostos em centavos' })
  taxesCents!: number;

  @ApiProperty({ description: 'Codigo ISO da moeda' })
  currency!: string;
}

export class BookingResponseDto {
  @ApiProperty({ description: 'Identificador do agendamento' })
  id!: string;

  @ApiProperty({ description: 'Identificador da clinica' })
  clinicId!: string;

  @ApiProperty({ description: 'Identificador do profissional' })
  professionalId!: string;

  @ApiPropertyOptional({
    description: 'Identificador do profissional titular quando ha cobertura temporaria',
    nullable: true,
  })
  originalProfessionalId?: string | null;

  @ApiPropertyOptional({
    description: 'Identificador da cobertura temporaria aplicada',
    nullable: true,
  })
  coverageId?: string | null;

  @ApiProperty({ description: 'Identificador do paciente' })
  patientId!: string;

  @ApiProperty({ description: 'Origem do agendamento' })
  source!: string;

  @ApiProperty({ description: 'Status do agendamento' })
  status!: string;

  @ApiProperty({ description: 'Status financeiro do agendamento' })
  paymentStatus!: string;

  @ApiPropertyOptional({ description: 'Identificador do hold associado', nullable: true })
  holdId?: string | null;

  @ApiPropertyOptional({ description: 'Data limite do hold em ISO 8601', nullable: true })
  holdExpiresAtUtc?: string | null;

  @ApiProperty({ description: 'Inicio do atendimento em ISO 8601' })
  startAtUtc!: string;

  @ApiProperty({ description: 'Fim do atendimento em ISO 8601' })
  endAtUtc!: string;

  @ApiProperty({ description: 'Fuso horario IANA' })
  timezone!: string;

  @ApiProperty({ description: 'Tolerancia de atraso em minutos' })
  lateToleranceMinutes!: number;

  @ApiPropertyOptional({
    description: 'Identificador da serie de recorrencia',
    nullable: true,
  })
  recurrenceSeriesId?: string | null;

  @ApiPropertyOptional({ description: 'Motivo do cancelamento', nullable: true })
  cancellationReason?: string | null;

  @ApiPropertyOptional({
    description: 'Divisao financeira aplicada ao atendimento',
    type: PricingSplitResponseDto,
    nullable: true,
  })
  pricingSplit?: PricingSplitResponseDto | null;

  @ApiProperty({ description: 'Indica se pre-condicoes foram cumpridas' })
  preconditionsPassed!: boolean;

  @ApiProperty({ description: 'Indica se anamnese e obrigatoria' })
  anamneseRequired!: boolean;

  @ApiPropertyOptional({
    description: 'Motivo para dispensar a anamnese obrigatoria',
    nullable: true,
  })
  anamneseOverrideReason?: string | null;

  @ApiPropertyOptional({ description: 'Momento em que o no-show foi marcado', nullable: true })
  noShowMarkedAtUtc?: string | null;

  @ApiProperty({ description: 'Data de criacao em ISO 8601' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de atualizacao em ISO 8601' })
  updatedAt!: string;

  @ApiProperty({ description: 'Versao atual do registro' })
  version!: number;
}
