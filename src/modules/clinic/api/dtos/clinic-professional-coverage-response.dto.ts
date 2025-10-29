import { ApiProperty } from '@nestjs/swagger';

export class ClinicProfessionalCoverageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  professionalId!: string;

  @ApiProperty()
  coverageProfessionalId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty({ enum: ['scheduled', 'active', 'completed', 'cancelled'] })
  status!: 'scheduled' | 'active' | 'completed' | 'cancelled';

  @ApiProperty({ required: false, nullable: true })
  reason?: string;

  @ApiProperty({ required: false, nullable: true })
  notes?: string;

  @ApiProperty({ required: false, nullable: true, type: Object })
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ required: false })
  updatedBy?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  cancelledAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledBy?: string | null;
}

export class ClinicProfessionalCoverageListResponseDto {
  @ApiProperty({ type: [ClinicProfessionalCoverageResponseDto] })
  data!: ClinicProfessionalCoverageResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
