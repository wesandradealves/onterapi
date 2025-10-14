import { ApiProperty } from '@nestjs/swagger';

import { ClinicMemberResponseDto } from './clinic-member-response.dto';

export class ClinicProfessionalTransferResponseDto {
  @ApiProperty({ type: ClinicMemberResponseDto })
  fromMembership!: ClinicMemberResponseDto;

  @ApiProperty({ type: ClinicMemberResponseDto })
  toMembership!: ClinicMemberResponseDto;

  @ApiProperty({ type: String })
  effectiveDate!: Date;

  @ApiProperty()
  transferPatients!: boolean;
}
