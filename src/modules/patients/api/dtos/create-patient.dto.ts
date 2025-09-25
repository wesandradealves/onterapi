import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiPropertyOptional({
    description: 'Tenant destino (opcional)',
    example: 'd8c3ab8a-1234-4a5b-8c5e-0123456789ab',
  })
  tenantId?: string;

  @ApiProperty({ description: 'Nome completo do paciente', example: 'Maria Silva' })
  fullName!: string;

  @ApiProperty({ description: 'CPF do paciente', example: '52998224725' })
  cpf!: string;

  @ApiPropertyOptional({ description: 'Data de nascimento (ISO)', example: '1990-05-10' })
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Genero', example: 'Feminino' })
  gender?: string;

  @ApiPropertyOptional({ description: 'Estado civil', example: 'Casada' })
  maritalStatus?: string;

  @ApiPropertyOptional({ description: 'Email do paciente', example: 'maria@example.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone principal', example: '+5511999998888' })
  phone?: string;

  @ApiPropertyOptional({ description: 'WhatsApp', example: '+5511988887777' })
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'CEP (somente numeros)', example: '01310930' })
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Rua/Avenida', example: 'Avenida Paulista' })
  street?: string;

  @ApiPropertyOptional({ description: 'Numero', example: '1000' })
  number?: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Conjunto 101' })
  complement?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Bela Vista' })
  district?: string;

  @ApiPropertyOptional({ description: 'Cidade', example: 'Sao Paulo' })
  city?: string;

  @ApiPropertyOptional({ description: 'Estado', example: 'SP' })
  state?: string;

  @ApiPropertyOptional({ description: 'Pais', example: 'Brasil' })
  country?: string;

  @ApiPropertyOptional({ description: 'Alergias principais', example: ['penicilina'] })
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Condicoes cronicas', example: ['diabetes tipo 2'] })
  chronicConditions?: string[];

  @ApiPropertyOptional({ description: 'Medicacoes em uso', example: ['Metformina 850mg'] })
  medications?: string[];

  @ApiPropertyOptional({ description: 'Observacoes clinicas relevantes' })
  observations?: string;

  @ApiPropertyOptional({ description: 'Tags do paciente', example: ['VIP', 'Plano Ouro'] })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Identificador do profissional responsavel',
    example: 'b3a1f6b6-6f14-4f42-8c4a-bf508f124d55',
  })
  professionalId?: string;

  @ApiPropertyOptional({ description: 'Status inicial do paciente', example: 'active' })
  status?: string;
}
