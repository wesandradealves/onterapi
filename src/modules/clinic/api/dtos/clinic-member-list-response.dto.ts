import { ApiProperty } from '@nestjs/swagger';

import { ClinicMemberResponseDto } from './clinic-member-response.dto';

export class ClinicMemberListResponseDto {
  @ApiProperty({ type: [ClinicMemberResponseDto] })
  data!: ClinicMemberResponseDto[];

  @ApiProperty()
  total!: number;
}
