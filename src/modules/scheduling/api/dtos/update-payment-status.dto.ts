import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';

const PAYMENT_STATUSES = [
  'not_applied',
  'pending',
  'approved',
  'settled',
  'refunded',
  'disputed',
] as const;

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'Versao esperada do agendamento para controle otimista',
    example: 2,
  })
  @IsInt()
  expectedVersion!: number;

  @ApiProperty({
    description: 'Novo status financeiro do agendamento',
    enum: PAYMENT_STATUSES,
    example: 'approved',
  })
  @IsIn(PAYMENT_STATUSES as readonly string[])
  paymentStatus!: (typeof PAYMENT_STATUSES)[number];
}
