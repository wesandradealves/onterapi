import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientContinuousMedicationResponseDto {
  @ApiProperty({ description: 'Nome da medicacao', example: 'Losartana' })
  name!: string;

  @ApiPropertyOptional({ description: 'Dosagem prescrita', example: '50mg' })
  dosage?: string;

  @ApiPropertyOptional({ description: 'Frequencia de uso', example: '1x ao dia' })
  frequency?: string;

  @ApiPropertyOptional({ description: 'Condicao associada', example: 'Hipertensao' })
  condition?: string;
}

export class PatientMedicalInfoResponseDto {
  @ApiPropertyOptional({ description: 'Alergias registradas', type: [String], example: ['poeira'] })
  allergies?: string[];

  @ApiPropertyOptional({
    description: 'Condicoes cronicas',
    type: [String],
    example: ['diabetes tipo 2'],
  })
  chronicConditions?: string[];

  @ApiPropertyOptional({
    description: 'Condicoes pre-existentes',
    type: [String],
    example: ['hipertensao'],
  })
  preExistingConditions?: string[];

  @ApiPropertyOptional({
    description: 'Medicacoes em uso',
    type: [String],
    example: ['Metformina 850mg'],
  })
  medications?: string[];

  @ApiPropertyOptional({
    description: 'Medicacoes continuas informadas no cadastro',
    type: [PatientContinuousMedicationResponseDto],
  })
  continuousMedications?: PatientContinuousMedicationResponseDto[];

  @ApiPropertyOptional({ description: 'Observacoes clinicas adicionais' })
  observations?: string;

  @ApiPropertyOptional({ description: 'Tipo sanguineo', example: 'O+' })
  bloodType?: string;

  @ApiPropertyOptional({ description: 'Estilo de vida resumido', example: 'Ativo' })
  lifestyle?: string;

  @ApiPropertyOptional({ description: 'Altura em centimetros', example: 170 })
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Peso em quilogramas', example: 72.5 })
  weightKg?: number;
}

export class PatientContactResponseDto {
  @ApiPropertyOptional({ description: 'Email principal', example: 'paciente@example.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone principal', example: '+5511999998888' })
  phone?: string;

  @ApiPropertyOptional({ description: 'WhatsApp', example: '+5511988887777' })
  whatsapp?: string;
}

export class PatientAddressResponseDto {
  @ApiPropertyOptional({ description: 'CEP', example: '01310930' })
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Logradouro', example: 'Rua Curl' })
  street?: string;

  @ApiPropertyOptional({ description: 'Numero', example: '123' })
  number?: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Conjunto 101' })
  complement?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Centro' })
  district?: string;

  @ApiPropertyOptional({ description: 'Cidade', example: 'Sao Paulo' })
  city?: string;

  @ApiPropertyOptional({ description: 'Estado', example: 'SP' })
  state?: string;

  @ApiPropertyOptional({ description: 'Pais', example: 'Brasil' })
  country?: string;
}

export class PatientTagDetailDto {
  @ApiProperty({ description: 'Identificador da tag', example: 'curl-test' })
  id!: string;

  @ApiProperty({ description: 'Rotulo da tag', example: 'curl-test' })
  label!: string;

  @ApiPropertyOptional({ description: 'Cor associada', example: '#FF8800' })
  color?: string;
}

export class PatientResponseDto {
  @ApiProperty({ description: 'ID do paciente', example: 'dbbaf755-4bea-4212-838c-0a192e7fffa0' })
  id!: string;

  @ApiProperty({ description: 'Slug do paciente', example: 'joao-silva' })
  slug!: string;

  @ApiProperty({ description: 'Nome completo', example: 'Joao Silva' })
  fullName!: string;

  @ApiProperty({ description: 'Status atual', example: 'active' })
  status!: string;

  @ApiPropertyOptional({
    description: 'Nivel de risco',
    enum: ['low', 'medium', 'high'],
    example: 'low',
  })
  riskLevel?: string;

  @ApiProperty({ description: 'CPF mascarado', example: '390.***.***.05' })
  cpfMasked!: string;

  @ApiPropertyOptional({ description: 'Telefone', example: '+5511999998888' })
  phone?: string;

  @ApiPropertyOptional({ description: 'WhatsApp', example: '+5511988887777' })
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'patient@example.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'Proxima consulta', example: '2025-09-23T13:00:00Z' })
  nextAppointmentAt?: string;

  @ApiPropertyOptional({ description: 'Ultima consulta', example: '2025-09-20T13:00:00Z' })
  lastAppointmentAt?: string;

  @ApiPropertyOptional({
    description: 'Profissional responsavel',
    example: '38f5f077-2042-4283-9308-b6bb73e18183',
  })
  professionalId?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String], example: ['VIP'] })
  tags?: string[];

  @ApiProperty({ description: 'Data de criacao', example: '2025-09-21T03:34:49.418Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de atualizacao', example: '2025-09-21T03:41:19.438Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ description: 'Aceite dos termos de uso', example: true })
  acceptedTerms?: boolean;

  @ApiPropertyOptional({ description: 'Data/hora do aceite', example: '2025-09-21T03:34:49.418Z' })
  acceptedTermsAt?: string;

  @ApiPropertyOptional({
    description: 'Informacoes medicas registradas no cadastro',
    type: PatientMedicalInfoResponseDto,
    example: {
      allergies: ['poeira'],
      preExistingConditions: ['hipertensao'],
      chronicConditions: ['diabetes tipo 2'],
      medications: ['Metformina 850mg'],
      continuousMedications: [
        { name: 'Losartana', dosage: '50mg', frequency: '1x ao dia', condition: 'Hipertensao' },
      ],
      heightCm: 170,
      weightKg: 72.5,
    },
  })
  medical?: PatientMedicalInfoResponseDto;
}

export class PatientDetailPatientDto extends PatientResponseDto {
  @ApiPropertyOptional({ description: 'Informacoes de contato', type: PatientContactResponseDto })
  contact?: PatientContactResponseDto;

  @ApiPropertyOptional({ description: 'Endereco completo', type: PatientAddressResponseDto })
  address?: PatientAddressResponseDto;

  @ApiPropertyOptional({
    description: 'Tags com metadados',
    type: [PatientTagDetailDto],
  })
  tagDetails?: PatientTagDetailDto[];
}

export class PatientsListResponseDto {
  @ApiProperty({
    type: [PatientResponseDto],
    example: [
      {
        id: 'dbbaf755-4bea-4212-838c-0a192e7fffa0',
        slug: 'joao-silva',
        fullName: 'Joao Silva',
        status: 'active',
        riskLevel: 'low',
        cpfMasked: '390.***.***.05',
        phone: '+5511999998888',
        whatsapp: '+5511988887777',
        email: 'patient@example.com',
        nextAppointmentAt: '2025-09-23T13:00:00Z',
        lastAppointmentAt: '2025-09-20T13:00:00Z',
        professionalId: '38f5f077-2042-4283-9308-b6bb73e18183',
        tags: ['VIP'],
        createdAt: '2025-09-21T03:34:49.418Z',
        updatedAt: '2025-09-21T03:41:19.438Z',
        acceptedTerms: true,
        acceptedTermsAt: '2025-09-21T03:34:49.418Z',
        medical: {
          preExistingConditions: ['hipertensao'],
          chronicConditions: ['diabetes tipo 2'],
          continuousMedications: [
            { name: 'Losartana', dosage: '50mg', frequency: '1x ao dia', condition: 'Hipertensao' },
          ],
          heightCm: 170,
          weightKg: 72.5,
        },
      },
    ],
  })
  data!: PatientResponseDto[];

  @ApiProperty({ description: 'Total de registros', example: 120 })
  total!: number;
}
