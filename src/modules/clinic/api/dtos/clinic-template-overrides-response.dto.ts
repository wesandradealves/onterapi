import { ApiProperty } from '@nestjs/swagger';

export class ClinicTemplateOverrideDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  templateClinicId!: string;

  @ApiProperty()
  section!: string;

  @ApiProperty()
  overrideVersion!: number;

  @ApiProperty({ type: Object })
  overridePayload!: Record<string, unknown>;

  @ApiProperty()
  overrideHash!: string;

  @ApiProperty()
  baseTemplateVersionId!: string;

  @ApiProperty({ required: false })
  baseTemplateVersionNumber?: number;

  @ApiProperty({ required: false })
  appliedConfigurationVersionId?: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ required: false })
  supersededAt?: Date;

  @ApiProperty({ required: false })
  supersededBy?: string;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}

export class ClinicTemplateOverrideListResponseDto {
  @ApiProperty({ type: [ClinicTemplateOverrideDto] })
  data!: ClinicTemplateOverrideDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  hasNextPage!: boolean;
}
