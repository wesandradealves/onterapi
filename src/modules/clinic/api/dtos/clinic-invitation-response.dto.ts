import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiPropertyOptional()
  professionalId?: string;

  @ApiPropertyOptional()
  targetEmail?: string;

  @ApiProperty()
  issuedBy!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty({ type: String })
  expiresAt!: Date;

  @ApiPropertyOptional({ type: String })
  acceptedAt?: Date;

  @ApiPropertyOptional()
  acceptedBy?: string;

  @ApiPropertyOptional({ type: String })
  revokedAt?: Date;

  @ApiPropertyOptional()
  revokedBy?: string;

  @ApiPropertyOptional()
  revocationReason?: string;

  @ApiPropertyOptional({ type: String })
  declinedAt?: Date;

  @ApiPropertyOptional()
  declinedBy?: string;

  @ApiProperty({ type: Object })
  economicSummary!: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Token bruto do convite (apenas na criação)' })
  token?: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
