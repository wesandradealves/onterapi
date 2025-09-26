import { ApiPropertyOptional } from '@nestjs/swagger';

import { PatientContinuousMedicationDto } from './create-patient.dto';

export class UpdatePatientDto {
  @ApiPropertyOptional({ description: 'Nome completo', example: 'Maria Silva' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'Nome curto para exibicao', example: 'Maria' })
  shortName?: string;

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

  @ApiPropertyOptional({ description: 'Alergias', example: ['penicilina'] })
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Condicoes cronicas', example: ['diabetes tipo 2'] })
  chronicConditions?: string[];

  @ApiPropertyOptional({ description: 'Condicoes pre-existentes', example: ['hipertensao'] })
  preExistingConditions?: string[];

  @ApiPropertyOptional({ description: 'Medicacoes em uso', example: ['Metformina 850mg'] })
  medications?: string[];

  @ApiPropertyOptional({
    description: 'Medicacao continua registrada no cadastro',
    type: () => [PatientContinuousMedicationDto],
  })
  continuousMedications?: PatientContinuousMedicationDto[];

  @ApiPropertyOptional({ description: 'Altura em centimetros', example: 172 })
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Peso em quilogramas', example: 68.5 })
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Observacoes clinicas relevantes' })
  observations?: string;

  @ApiPropertyOptional({ description: 'Status do paciente', example: 'active' })
  status?: string;

  @ApiPropertyOptional({ description: 'Tags do paciente', example: ['VIP'] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Identificador do profissional responsavel' })
  professionalId?: string | null;

  @ApiPropertyOptional({ description: 'Nivel de risco', example: 'medium' })
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'Confirmacao de aceite dos termos' })
  acceptedTerms?: boolean;

  @ApiPropertyOptional({ description: 'Data/hora do aceite (ISO)' })
  acceptedTermsAt?: string;
}
