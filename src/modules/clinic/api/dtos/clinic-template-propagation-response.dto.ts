import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicTemplatePropagationSectionDto {
  @ApiProperty()
  section!: string;

  @ApiProperty()
  templateVersionId!: string;

  @ApiProperty()
  propagatedVersionId!: string;

  @ApiProperty({ type: String })
  propagatedAt!: Date;

  @ApiProperty()
  triggeredBy!: string;
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
