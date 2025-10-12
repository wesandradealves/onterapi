import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicAuditLogItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiPropertyOptional()
  clinicId?: string;

  @ApiProperty()
  event!: string;

  @ApiPropertyOptional()
  performedBy?: string;

  @ApiProperty({ type: Object })
  detail!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;
}

export class ClinicAuditLogListResponseDto {
  @ApiProperty({ type: [ClinicAuditLogItemDto] })
  data!: ClinicAuditLogItemDto[];

  @ApiProperty()
  total!: number;
}
