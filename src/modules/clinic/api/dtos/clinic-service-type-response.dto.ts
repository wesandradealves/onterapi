import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ type: Object })
  cancellationPolicy!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  eligibility!: Record<string, unknown>;

  @ApiPropertyOptional()
  instructions?: string;

  @ApiProperty({ type: [String] })
  requiredDocuments!: string[];

  @ApiProperty({ type: [Object] })
  customFields!: Record<string, unknown>[];

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
