import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, Min, MinLength } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({
    description: 'Vers o esperada do agendamento para controle otimista',
    example: 2,
  })
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @ApiProperty({
    description: 'Novo in cio do atendimento em UTC (ISO 8601)',
    example: '2025-10-12T09:00:00Z',
  })
  @IsISO8601()
  newStartAtUtc!: string;

  @ApiProperty({
    description: 'Novo t rmino do atendimento em UTC (ISO 8601)',
    example: '2025-10-12T10:00:00Z',
  })
  @IsISO8601()
  newEndAtUtc!: string;

  @ApiProperty({
    description: 'Motivo do reagendamento',
    example: 'Paciente solicitou ajuste de hor rio',
  })
  @MinLength(3)
  reason!: string;
}
