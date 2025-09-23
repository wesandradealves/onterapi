import { ApiProperty } from '@nestjs/swagger';

export class PatientResponseDto {
  @ApiProperty({ description: 'ID do paciente', example: 'dbbaf755-4bea-4212-838c-0a192e7fffa0' })
  id!: string;

  @ApiProperty({ description: 'Slug do paciente', example: 'joao-silva' })
  slug!: string;

  @ApiProperty({ description: 'Nome completo', example: 'Patient Two Updated' })
  fullName!: string;

  @ApiProperty({ description: 'Status atual', example: 'active' })
  status!: string;

  @ApiProperty({ description: 'CPF mascarado', example: '390.***.***.05' })
  cpfMasked!: string;

  @ApiProperty({ description: 'Telefone', example: '+5511999998888', required: false })
  phone?: string;

  @ApiProperty({ description: 'WhatsApp', example: '+5511988887777', required: false })
  whatsapp?: string;

  @ApiProperty({ description: 'Email', example: 'patient@example.com', required: false })
  email?: string;

  @ApiProperty({
    description: 'Próxima consulta',
    example: '2025-09-23T13:00:00Z',
    required: false,
  })
  nextAppointmentAt?: string;

  @ApiProperty({ description: 'Última consulta', example: '2025-09-20T13:00:00Z', required: false })
  lastAppointmentAt?: string;

  @ApiProperty({ description: 'Profissional responsável', required: false })
  professionalId?: string;

  @ApiProperty({ description: 'Tags', example: ['VIP'], isArray: true, required: false })
  tags?: string[];

  @ApiProperty({ description: 'Data de criação', example: '2025-09-21T03:34:49.418Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de atualização', example: '2025-09-21T03:41:19.438Z' })
  updatedAt!: string;
}

export class PatientsListResponseDto {
  @ApiProperty({ type: [PatientResponseDto] })
  data!: PatientResponseDto[];

  @ApiProperty({ description: 'Total de registros', example: 120 })
  total!: number;
}
