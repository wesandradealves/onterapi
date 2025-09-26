import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePatientDto {
  @ApiPropertyOptional({ description: 'Nome completo', example: 'Maria S. Andrade' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'Nome curto', example: 'Maria Andrade' })
  shortName?: string;

  @ApiPropertyOptional({ description: 'Status do paciente', example: 'active' })
  status?: string;

  @ApiPropertyOptional({ description: 'Telefone principal', example: '+5511999998888' })
  phone?: string;

  @ApiPropertyOptional({ description: 'WhatsApp', example: '+5511988887777' })
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'maria@example.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'CEP', example: '01310930' })
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

  @ApiPropertyOptional({ description: 'Alergias', example: ['penicilina'] })
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Condicoes cronicas', example: ['hipertensao'] })
  chronicConditions?: string[];

  @ApiPropertyOptional({ description: 'Medicacoes em uso', example: ['Losartana 50mg'] })
  medications?: string[];

  @ApiPropertyOptional({ description: 'Observacoes clinicas' })
  observations?: string;

  @ApiPropertyOptional({ description: 'Tags do paciente', example: ['VIP'] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Nivel de risco', example: 'medium' })
  riskLevel?: string;

  @ApiPropertyOptional({
    description: 'Profissional responsavel',
    example: 'b3a1f6b6-6f14-4f42-8c4a-bf508f124d55',
  })
  professionalId?: string | null;
}
