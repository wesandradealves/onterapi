import { ApiProperty } from '@nestjs/swagger';

import { ClinicInvitationResponseDto } from './clinic-invitation-response.dto';

export class ClinicInvitationOnboardingUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class ClinicInvitationOnboardingResponseDto {
  @ApiProperty({ type: ClinicInvitationResponseDto })
  invitation!: ClinicInvitationResponseDto;

  @ApiProperty({ type: ClinicInvitationOnboardingUserDto })
  user!: ClinicInvitationOnboardingUserDto;
}
