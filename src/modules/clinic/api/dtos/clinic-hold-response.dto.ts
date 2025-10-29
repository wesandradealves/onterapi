import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClinicInvitationEconomicSummaryDto } from './clinic-invitation-response.dto';

export class ClinicHoldProfessionalPolicySnapshotDto {
  @ApiProperty()
  policyId!: string;

  @ApiProperty({ enum: ['direct', 'marketplace', 'both'] })
  channelScope!: 'direct' | 'marketplace' | 'both';

  @ApiProperty()
  acceptedBy!: string;

  @ApiProperty()
  sourceInvitationId!: string;

  @ApiProperty({ type: String })
  effectiveAt!: Date;

  @ApiProperty({ type: ClinicInvitationEconomicSummaryDto })
  economicSummary!: ClinicInvitationEconomicSummaryDto;
}

export class ClinicHoldResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  professionalId!: string;

  @ApiProperty()
  patientId!: string;

  @ApiProperty()
  serviceTypeId!: string;

  @ApiProperty({ type: String })
  start!: Date;

  @ApiProperty({ type: String })
  end!: Date;

  @ApiProperty({ type: String })
  ttlExpiresAt!: Date;

  @ApiProperty()
  status!: 'pending' | 'confirmed' | 'expired' | 'cancelled';

  @ApiPropertyOptional()
  locationId?: string;

  @ApiPropertyOptional({ type: [String] })
  resources?: string[];

  @ApiProperty()
  idempotencyKey!: string;

  @ApiProperty()
  createdBy!: string;

  @ApiPropertyOptional({ enum: ['direct', 'marketplace'] })
  channel?: 'direct' | 'marketplace';

  @ApiPropertyOptional({ type: ClinicHoldProfessionalPolicySnapshotDto })
  professionalPolicySnapshot?: ClinicHoldProfessionalPolicySnapshotDto;

  @ApiPropertyOptional({ type: String })
  confirmedAt?: Date;

  @ApiPropertyOptional()
  confirmedBy?: string;

  @ApiPropertyOptional({ type: String })
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancelledBy?: string;

  @ApiPropertyOptional()
  cancellationReason?: string | null;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
