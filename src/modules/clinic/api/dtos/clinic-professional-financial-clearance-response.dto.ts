import { ApiProperty } from '@nestjs/swagger';

import { ClinicPaymentStatus } from '../../../../domain/clinic/types/clinic.types';

export class ClinicProfessionalFinancialClearanceResponseDto {
  @ApiProperty()
  requiresClearance!: boolean;

  @ApiProperty()
  hasPendencies!: boolean;

  @ApiProperty({ description: 'Quantidade de agendamentos com pendência financeira' })
  pendingCount!: number;

  @ApiProperty({
    enum: ['approved', 'settled', 'refunded', 'chargeback', 'failed'],
    isArray: true,
  })
  statusesEvaluated!: ClinicPaymentStatus[];
}
