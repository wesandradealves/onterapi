import { ApiProperty } from '@nestjs/swagger';

export class ClinicAppointmentConfirmationResponseDto {
  @ApiProperty({ description: 'Identificador do agendamento confirmado', format: 'uuid' })
  appointmentId!: string;

  @ApiProperty({ description: 'Identificador da clinica', format: 'uuid' })
  clinicId!: string;

  @ApiProperty({ description: 'Identificador do hold convertido', format: 'uuid' })
  holdId!: string;

  @ApiProperty({ description: 'Identificador da transacao de pagamento', maxLength: 120 })
  paymentTransactionId!: string;

  @ApiProperty({ description: 'Data/hora da confirmacao', type: Date })
  confirmedAt!: Date;

  @ApiProperty({
    description: 'Status financeiro apos a confirmacao',
    enum: ['approved', 'settled', 'refunded', 'chargeback', 'failed'],
  })
  paymentStatus!: 'approved' | 'settled' | 'refunded' | 'chargeback' | 'failed';
}
