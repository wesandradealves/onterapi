import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ArchivePatientDto {
  @ApiPropertyOptional({
    description: 'Motivo da arquivação',
    example: 'Paciente inativo há mais de 2 anos',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Se verdadeiro, arquiva dados relacionados', example: false })
  @IsOptional()
  @IsBoolean()
  archiveRelatedData?: boolean;
}

