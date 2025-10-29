import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicScheduleIntervalDto {
  @ApiProperty()
  start!: string;

  @ApiProperty()
  end!: string;
}

export class ClinicScheduleWorkingDayDto {
  @ApiProperty()
  dayOfWeek!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ type: [ClinicScheduleIntervalDto] })
  intervals!: ClinicScheduleIntervalDto[];
}

export class ClinicScheduleExceptionPeriodDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String })
  start!: Date;

  @ApiProperty({ type: String })
  end!: Date;

  @ApiProperty({ enum: ['clinic', 'professional', 'resource'] })
  appliesTo!: string;

  @ApiPropertyOptional({ type: [String] })
  resourceIds?: string[];
}

export class ClinicScheduleHolidayDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String })
  date!: Date;

  @ApiProperty({ enum: ['national', 'state', 'city', 'local'] })
  scope!: string;
}

export class ClinicScheduleSettingsPayloadDto {
  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: [ClinicScheduleWorkingDayDto] })
  workingDays!: ClinicScheduleWorkingDayDto[];

  @ApiProperty({ type: [ClinicScheduleExceptionPeriodDto] })
  exceptionPeriods!: ClinicScheduleExceptionPeriodDto[];

  @ApiProperty({ type: [ClinicScheduleHolidayDto] })
  holidays!: ClinicScheduleHolidayDto[];

  @ApiProperty()
  autosaveIntervalSeconds!: number;

  @ApiProperty({ enum: ['server_wins', 'client_wins', 'merge', 'ask_user'] })
  conflictResolution!: string;
}

export class ClinicScheduleSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  section!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String })
  appliedAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ enum: ['idle', 'saving', 'saved', 'error'] })
  state!: 'idle' | 'saving' | 'saved' | 'error';

  @ApiProperty({ description: 'Indica se a configuracao e aplicada automaticamente' })
  autoApply!: boolean;

  @ApiProperty({
    description: 'Telemetria da configuracao',
    type: ClinicConfigurationTelemetryResponseDto,
    required: false,
  })
  telemetry?: ClinicConfigurationTelemetryResponseDto;

  @ApiProperty({ type: ClinicScheduleSettingsPayloadDto })
  payload!: ClinicScheduleSettingsPayloadDto;
}
