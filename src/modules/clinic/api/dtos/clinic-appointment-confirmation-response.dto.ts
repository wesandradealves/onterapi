import { ApiProperty } from '@nestjs/swagger';

export class ClinicAppointmentConfirmationResponseDto {
  @ApiProperty({ description: 'Identificador do agendamento confirmado', format: 'uuid' })
  appointmentId!: string;

  @ApiProperty({ description: 'Identificador da clínica', format: 'uuid' })
  clinicId!: string;

  @ApiProperty({ description: 'Identificador do hold convertido', format: 'uuid' })
  holdId!: string;

  @ApiProperty({ description: 'Identificador da transação de pagamento', maxLength: 120 })
  paymentTransactionId!: string;

  @ApiProperty({ description: 'Data/hora da confirmação', type: Date })
  confirmedAt!: Date;

  @ApiProperty({
    description: 'Status financeiro após a confirmação',
    enum: ['approved', 'settled', 'refunded', 'chargeback', 'failed'],
  })
  paymentStatus!: 'approved' | 'settled' | 'refunded' | 'chargeback' | 'failed';
}
