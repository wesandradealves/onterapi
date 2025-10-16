import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional } from 'class-validator';

const CANCELLATION_REASONS = [
  'patient_request',
  'clinic_request',
  'professional_request',
  'medical_exception',
  'system',
  'payment_failure',
  'chargeback',
] as const;

export class CancelBookingDto {
  @ApiProperty({
    description: 'Vers o esperada do agendamento para controle otimista',
    example: 1,
  })
  @IsInt()
  expectedVersion!: number;

  @ApiPropertyOptional({
    description: 'Motivo do cancelamento',
    enum: CANCELLATION_REASONS,
  })
  @IsOptional()
  @IsIn(CANCELLATION_REASONS as readonly string[])
  reason?: (typeof CANCELLATION_REASONS)[number];

  @ApiPropertyOptional({
    description: 'Momento do cancelamento em UTC (ISO 8601)',
    example: '2025-10-08T12:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  cancelledAtUtc?: string;
}
