import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva Santos',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Telefone com DDD (apenas números)',
    example: '11888888888',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Status ativo/inativo do usuário',
    example: true,
    required: false,
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadados adicionais do usuário',
    example: { preferredLanguage: 'pt-BR', theme: 'dark' },
    required: false,
  })
  metadata?: Record<string, any>;
}