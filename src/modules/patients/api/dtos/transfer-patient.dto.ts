import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class TransferPatientDto {
  @ApiProperty({
    description: 'Profissional destino',
    example: 'b3a1f6b6-6f14-4f42-8c4a-bf508f124d55',
  })
  @IsUUID('4')
  toProfessionalId!: string;

  @ApiProperty({ description: 'Motivo da transferência', example: 'Especialista em ortomolecular' })
  @IsString()
  reason!: string;

  @ApiProperty({ description: 'Data efetiva', example: '2025-09-22T13:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
