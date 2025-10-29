import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const BOOKING_SOURCES = [
  'marketplace',
  'clinic_portal',
  'professional_portal',
  'patient_portal',
  'api',
] as const;

const PAYMENT_STATUSES = [
  'not_applied',
  'pending',
  'approved',
  'settled',
  'refunded',
  'disputed',
] as const;

export class PricingSplitDto {
  @ApiProperty({ description: 'Valor total em centavos', example: 20000 })
  @IsInt()
  totalCents!: number;

  @ApiProperty({ description: 'Parcela da plataforma em centavos', example: 4000 })
  @IsInt()
  platformCents!: number;

  @ApiProperty({ description: 'Parcela da cl nica em centavos', example: 8000 })
  @IsInt()
  clinicCents!: number;

  @ApiProperty({ description: 'Parcela do profissional em centavos', example: 7000 })
  @IsInt()
  professionalCents!: number;

  @ApiProperty({ description: 'Taxa do gateway em centavos', example: 800 })
  @IsInt()
  gatewayCents!: number;

  @ApiProperty({ description: 'Impostos em centavos', example: 1200 })
  @IsInt()
  taxesCents!: number;

  @ApiProperty({ description: 'C digo ISO da moeda', example: 'BRL' })
  @IsString()
  currency!: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Identificador do hold a ser convertido', format: 'uuid' })
  @IsUUID()
  holdId!: string;

  @ApiProperty({ description: 'Origem do agendamento', enum: BOOKING_SOURCES })
  @IsIn(BOOKING_SOURCES as readonly string[])
  source!: (typeof BOOKING_SOURCES)[number];

  @ApiProperty({
    description: 'Fuso hor rio IANA do atendimento',
    example: 'America/Sao_Paulo',
  })
  @IsString()
  timezone!: string;

  @ApiPropertyOptional({ description: 'Status financeiro inicial', enum: PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(PAYMENT_STATUSES as readonly string[])
  paymentStatus?: (typeof PAYMENT_STATUSES)[number];

  @ApiPropertyOptional({
    description: 'Minutos de toler ncia para atraso do paciente',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateToleranceMinutes?: number;

  @ApiPropertyOptional({
    description: 'Identificador da s rie de recorr ncia associada',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  recurrenceSeriesId?: string | null;

  @ApiPropertyOptional({ description: 'Divis o de valores financeiros', type: PricingSplitDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingSplitDto)
  pricingSplit?: PricingSplitDto | null;

  @ApiPropertyOptional({
    description: 'Indica se as pr -condi  es cl nicas foram cumpridas',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  preconditionsPassed?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se a anamnese   obrigat ria',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  anamneseRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Motivo para liberar anamnese obrigat ria',
    example: 'Paciente j  possui anamnese recente',
  })
  @IsOptional()
  @IsString()
  anamneseOverrideReason?: string | null;
}
