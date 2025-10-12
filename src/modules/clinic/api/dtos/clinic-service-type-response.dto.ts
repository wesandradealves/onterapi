import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicServiceCancellationPolicyDto {
  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  windowMinutes?: number;

  @ApiPropertyOptional()
  percentage?: number;

  @ApiPropertyOptional()
  message?: string;
}

export class ClinicServiceEligibilityDto {
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
}

export class ClinicServiceCustomFieldDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  fieldType!: string;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional({ type: [String] })
  options?: string[];
}

export class ClinicServiceTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty()
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

  @ApiProperty({ type: ClinicServiceCancellationPolicyDto })
  cancellationPolicy!: ClinicServiceCancellationPolicyDto;

  @ApiProperty({ type: ClinicServiceEligibilityDto })
  eligibility!: ClinicServiceEligibilityDto;

  @ApiPropertyOptional()
  instructions?: string;

  @ApiProperty({ type: [String] })
  requiredDocuments!: string[];

  @ApiProperty({ type: [ClinicServiceCustomFieldDto] })
  customFields!: ClinicServiceCustomFieldDto[];

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
