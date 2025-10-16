import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsUUID } from 'class-validator';

export class CreateHoldDto {
  @ApiProperty({ description: 'Identificador da cl nica', format: 'uuid' })
  @IsUUID()
  clinicId!: string;

  @ApiProperty({ description: 'Identificador do profissional', format: 'uuid' })
  @IsUUID()
  professionalId!: string;

  @ApiProperty({ description: 'Identificador do paciente', format: 'uuid' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({
    description: 'In cio do atendimento em UTC (ISO 8601)',
    example: '2025-10-10T10:00:00Z',
  })
  @IsISO8601()
  startAtUtc!: string;

  @ApiProperty({
    description: 'Fim do atendimento em UTC (ISO 8601)',
    example: '2025-10-10T11:00:00Z',
  })
  @IsISO8601()
  endAtUtc!: string;
}
