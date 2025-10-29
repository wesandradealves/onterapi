import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicHoldSettingsDto {
  @ApiProperty()
  ttlMinutes!: number;

  @ApiProperty()
  minAdvanceMinutes!: number;

  @ApiPropertyOptional()
  maxAdvanceMinutes?: number;

  @ApiProperty()
  allowOverbooking!: boolean;

  @ApiPropertyOptional()
  overbookingThreshold?: number;

  @ApiProperty()
  resourceMatchingStrict!: boolean;
}

export class ClinicSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: ClinicHoldSettingsDto })
  holdSettings!: ClinicHoldSettingsDto;
}
