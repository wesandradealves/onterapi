import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

export class MarkBookingNoShowDto {
  @ApiProperty({
    description: 'Versão esperada do agendamento para controle otimista',
    example: 3,
  })
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @ApiPropertyOptional({
    description: 'Momento em que o no-show foi confirmado (UTC, ISO 8601)',
    example: '2025-10-10T10:20:00Z',
  })
  @IsOptional()
  @IsISO8601()
  markedAtUtc?: string;
}
