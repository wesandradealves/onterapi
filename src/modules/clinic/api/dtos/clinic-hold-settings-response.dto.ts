import { ApiProperty } from '@nestjs/swagger';

import { ClinicHoldSettingsDto } from './clinic-summary.dto';

export class ClinicHoldSettingsResponseDto {
  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ type: ClinicHoldSettingsDto })
  holdSettings!: ClinicHoldSettingsDto;
}
