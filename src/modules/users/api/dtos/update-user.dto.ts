import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuario',
    example: 'Joao Silva Santos',
    required: false
  })
  name?: string;

  @ApiProperty({
    description: 'Telefone com DDD (apenas numeros)',
    example: '11888888888',
    required: false
  })
  phone?: string;

  @ApiProperty({
    description: 'Status ativo/inativo do usuario',
    example: true,
    required: false
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadados adicionais do usuario',
    example: { preferredLanguage: 'pt-BR', theme: 'dark' },
    required: false
  })
  metadata?: Record<string, unknown>;
}
