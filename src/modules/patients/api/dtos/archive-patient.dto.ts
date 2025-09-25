import { ApiPropertyOptional } from '@nestjs/swagger';

export class ArchivePatientDto {
  @ApiPropertyOptional({
    description: 'Motivo da arquivacao',
    example: 'Paciente inativo ha mais de 2 anos',
  })
  reason?: string;

  @ApiPropertyOptional({ description: 'Se verdadeiro, arquiva dados relacionados', example: false })
  archiveRelatedData?: boolean;
}
