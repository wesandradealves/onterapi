import { ApiProperty } from '@nestjs/swagger';

export class BookingHoldResponseDto {
  @ApiProperty({ description: 'Identificador do hold' })
  id!: string;

  @ApiProperty({ description: 'Identificador da clínica' })
  clinicId!: string;

  @ApiProperty({ description: 'Identificador do profissional' })
  professionalId!: string;

  @ApiProperty({ description: 'Identificador do paciente' })
  patientId!: string;

  @ApiProperty({ description: 'Status atual do hold' })
  status!: string;

  @ApiProperty({ description: 'Início reservado em UTC (ISO 8601)' })
  startAtUtc!: string;

  @ApiProperty({ description: 'Fim reservado em UTC (ISO 8601)' })
  endAtUtc!: string;

  @ApiProperty({ description: 'Momento de expiração do hold em UTC (ISO 8601)' })
  ttlExpiresAtUtc!: string;

  @ApiProperty({ description: 'Data de criação em UTC (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de atualização em UTC (ISO 8601)' })
  updatedAt!: string;

  @ApiProperty({ description: 'Versão atual do registro' })
  version!: number;
}
