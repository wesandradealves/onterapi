import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreatePatientDto {
  @ApiPropertyOptional({
    description: 'Tenant destino (opcional)',
    example: 'd8c3ab8a-1234-4a5b-8c5e-0123456789ab',
  })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;

  @ApiProperty({ description: 'Nome completo do paciente', example: 'Maria Silva' })
  @IsString()
  fullName!: string;

  @ApiProperty({ description: 'CPF do paciente', example: '52998224725' })
  @Matches(/^\d{11}$/, { message: 'cpf must contain 11 digits' })
  cpf!: string;

  @ApiPropertyOptional({ description: 'Data de nascimento (ISO)', example: '1990-05-10' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Genero', example: 'Feminino' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Estado civil', example: 'Casada' })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional({ description: 'Email do paciente', example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone principal', example: '+5511999998888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'WhatsApp', example: '+5511988887777' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'CEP (somente números)', example: '01310930' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Rua/Avenida', example: 'Avenida Paulista' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ description: 'Número', example: '1000' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Conjunto 101' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Bela Vista' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Cidade', example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Estado', example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'País', example: 'Brasil' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Alergias principais', example: ['penicilina'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Condicoes crônicas', example: ['diabetes tipo 2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @ApiPropertyOptional({ description: 'Medicacoes em uso', example: ['Metformina 850mg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiPropertyOptional({ description: 'Observacoes clinicas relevantes' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: 'Tags do paciente', example: ['VIP', 'Plano Ouro'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Identificador do profissional responsavel',
    example: 'b3a1f6b6-6f14-4f42-8c4a-bf508f124d55',
  })
  @IsOptional()
  @IsUUID('4')
  professionalId?: string;

  @ApiPropertyOptional({ description: 'Status inicial do paciente', example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
