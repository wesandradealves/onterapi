import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicServiceSettingsItemDto {
  @ApiProperty()
  serviceTypeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty({ enum: ['BRL', 'USD', 'EUR'] })
  currency!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  requiresAnamnesis!: boolean;

  @ApiProperty()
  enableOnlineScheduling!: boolean;

  @ApiProperty()
  minAdvanceMinutes!: number;

  @ApiPropertyOptional()
  maxAdvanceMinutes?: number;

  @ApiPropertyOptional({ enum: ['free', 'percentage', 'no_refund'] })
  cancellationPolicyType?: string;

  @ApiPropertyOptional()
  cancellationPolicyWindowMinutes?: number;

  @ApiPropertyOptional()
  cancellationPolicyPercentage?: number;

  @ApiProperty()
  allowNewPatients!: boolean;

  @ApiProperty()
  allowExistingPatients!: boolean;

  @ApiPropertyOptional()
  minimumAge?: number;

  @ApiPropertyOptional()
  maximumAge?: number;

  @ApiPropertyOptional({ type: [String] })
  allowedTags?: string[];

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  instructions?: string;

  @ApiPropertyOptional({ type: [String] })
  requiredDocuments?: string[];
}

export class ClinicServiceSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  section!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String })
  appliedAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [ClinicServiceSettingsItemDto] })
  services!: ClinicServiceSettingsItemDto[];
}
