import { ApiProperty } from '@nestjs/swagger';

export class BookingHoldResponseDto {
  @ApiProperty({ description: 'Identificador do hold' })
  id!: string;

  @ApiProperty({ description: 'Identificador da cl nica' })
  clinicId!: string;

  @ApiProperty({ description: 'Identificador do profissional' })
  professionalId!: string;

  @ApiProperty({
    description: 'Identificador do profissional titular quando ha cobertura temporaria',
    nullable: true,
  })
  originalProfessionalId!: string | null;

  @ApiProperty({
    description: 'Identificador da cobertura temporaria aplicada',
    nullable: true,
  })
  coverageId!: string | null;

  @ApiProperty({ description: 'Identificador do paciente' })
  patientId!: string;

  @ApiProperty({
    description: 'Identificador do tipo de servico associado ao hold',
    type: String,
    nullable: true,
  })
  serviceTypeId!: string | null;

  @ApiProperty({ description: 'Status atual do hold' })
  status!: string;

  @ApiProperty({ description: 'In cio reservado em UTC (ISO 8601)' })
  startAtUtc!: string;

  @ApiProperty({ description: 'Fim reservado em UTC (ISO 8601)' })
  endAtUtc!: string;

  @ApiProperty({ description: 'Momento de expira  o do hold em UTC (ISO 8601)' })
  ttlExpiresAtUtc!: string;

  @ApiProperty({ description: 'Data de cria  o em UTC (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de atualiza  o em UTC (ISO 8601)' })
  updatedAt!: string;

  @ApiProperty({ description: 'Vers o atual do registro' })
  version!: number;
}
