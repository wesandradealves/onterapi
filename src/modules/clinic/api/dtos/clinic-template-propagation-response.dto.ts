import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicTemplatePropagationSectionDto {
  @ApiProperty()
  section!: string;

  @ApiProperty()
  templateVersionId!: string;

  @ApiPropertyOptional()
  templateVersionNumber?: number;

  @ApiProperty()
  propagatedVersionId!: string;

  @ApiProperty({ type: String })
  propagatedAt!: Date;

  @ApiProperty()
  triggeredBy!: string;

  @ApiPropertyOptional()
  overrideId?: string;

  @ApiPropertyOptional()
  overrideVersion?: number;

  @ApiPropertyOptional()
  overrideHash?: string;

  @ApiPropertyOptional({ type: String })
  overrideUpdatedAt?: Date;

  @ApiPropertyOptional()
  overrideUpdatedBy?: string;

  @ApiPropertyOptional()
  overrideAppliedVersionId?: string;
}

export class ClinicTemplatePropagationResponseDto {
  @ApiPropertyOptional()
  templateClinicId?: string;

  @ApiPropertyOptional({ type: String })
  lastPropagationAt?: Date;

  @ApiPropertyOptional()
  lastTriggeredBy?: string;

  @ApiProperty({ type: [ClinicTemplatePropagationSectionDto] })
  sections!: ClinicTemplatePropagationSectionDto[];
}
