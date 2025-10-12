import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicMemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  scope!: string[];

  @ApiPropertyOptional({ type: Object })
  preferences?: Record<string, unknown>;

  @ApiPropertyOptional({ type: String })
  joinedAt?: Date;

  @ApiPropertyOptional({ type: String })
  suspendedAt?: Date;

  @ApiPropertyOptional({ type: String })
  endedAt?: Date;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
