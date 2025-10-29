import { ApiProperty } from '@nestjs/swagger';

import { ClinicSummaryDto } from './clinic-summary.dto';

export class ClinicListResponseDto {
  @ApiProperty({ type: [ClinicSummaryDto] })
  data!: ClinicSummaryDto[];

  @ApiProperty()
  total!: number;
}
