import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

const CONFIRM_PAYMENT_STATUS = ['approved'] as const;

export class ConfirmBookingDto {
  @ApiProperty({ description: 'Identificador do hold a ser confirmado', format: 'uuid' })
  @IsUUID()
  holdId!: string;

  @ApiProperty({
    description: 'Status financeiro que permite a confirmação',
    enum: CONFIRM_PAYMENT_STATUS,
    example: 'approved',
  })
  @IsIn(CONFIRM_PAYMENT_STATUS as readonly string[])
  paymentStatus!: (typeof CONFIRM_PAYMENT_STATUS)[number];

  @ApiPropertyOptional({
    description: 'Momento da confirmação em UTC (ISO 8601)',
    example: '2025-10-08T12:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  confirmationAtUtc?: string;
}
