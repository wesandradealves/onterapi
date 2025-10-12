import { ApiProperty } from '@nestjs/swagger';

import { ClinicInvitationResponseDto } from './clinic-invitation-response.dto';

export class ClinicInvitationListResponseDto {
  @ApiProperty({ type: [ClinicInvitationResponseDto] })
  data!: ClinicInvitationResponseDto[];

  @ApiProperty()
  total!: number;
}
