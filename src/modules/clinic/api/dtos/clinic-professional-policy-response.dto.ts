import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicInvitationEconomicSummaryDto } from './clinic-invitation-response.dto';

export class ClinicProfessionalPolicyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  professionalId!: string;

  @ApiProperty({ enum: ['direct', 'marketplace', 'both'] })
  channelScope!: 'direct' | 'marketplace' | 'both';

  @ApiProperty({ type: ClinicInvitationEconomicSummaryDto })
  economicSummary!: ClinicInvitationEconomicSummaryDto;

  @ApiProperty({ type: String })
  effectiveAt!: Date;

  @ApiPropertyOptional({ type: String })
  endedAt?: Date;

  @ApiProperty()
  sourceInvitationId!: string;

  @ApiProperty()
  acceptedBy!: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
