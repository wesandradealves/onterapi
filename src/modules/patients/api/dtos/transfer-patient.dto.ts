import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferPatientDto {
  @ApiProperty({
    description: 'Profissional destino',
    example: 'b3a1f6b6-6f14-4f42-8c4a-bf508f124d55',
  })
  toProfessionalId!: string;

  @ApiProperty({ description: 'Motivo da transferencia', example: 'Especialista em ortomolecular' })
  reason!: string;

  @ApiPropertyOptional({ description: 'Data efetiva', example: '2025-09-22T13:00:00Z' })
  effectiveAt?: string;
}
