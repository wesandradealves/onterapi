import { ApiProperty } from '@nestjs/swagger';

export class ClinicConfigurationVersionResponseDto {
  @ApiProperty({ description: 'Identificador da versão' })
  id!: string;

  @ApiProperty({ description: 'Identificador da clínica' })
  clinicId!: string;

  @ApiProperty({ description: 'Seção configurada', example: 'general' })
  section!: string;

  @ApiProperty({ description: 'Número da versão' })
  version!: number;

  @ApiProperty({ description: 'Payload salvo da configuração' })
  payload!: Record<string, unknown>;

  @ApiProperty({ description: 'Usuário responsável pela alteração' })
  createdBy!: string;

  @ApiProperty({ description: 'Data de criação da versão', type: String })
  createdAt!: Date;

  @ApiProperty({ description: 'Data de aplicação da versão', type: String, required: false })
  appliedAt?: Date;

  @ApiProperty({ description: 'Notas associadas', required: false })
  notes?: string;
}
