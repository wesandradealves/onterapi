import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicHoldResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  professionalId!: string;

  @ApiProperty()
  patientId!: string;

  @ApiProperty()
  serviceTypeId!: string;

  @ApiProperty({ type: String })
  start!: Date;

  @ApiProperty({ type: String })
  end!: Date;

  @ApiProperty({ type: String })
  ttlExpiresAt!: Date;

  @ApiProperty()
  status!: 'pending' | 'confirmed' | 'expired' | 'cancelled';

  @ApiPropertyOptional()
  locationId?: string;

  @ApiPropertyOptional({ type: [String] })
  resources?: string[];

  @ApiProperty()
  idempotencyKey!: string;

  @ApiProperty()
  createdBy!: string;

  @ApiPropertyOptional({ type: String })
  confirmedAt?: Date;

  @ApiPropertyOptional()
  confirmedBy?: string;

  @ApiPropertyOptional({ type: String })
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancelledBy?: string;

  @ApiPropertyOptional()
  cancellationReason?: string | null;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
