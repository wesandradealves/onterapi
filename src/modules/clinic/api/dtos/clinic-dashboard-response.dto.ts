import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicDashboardMetricDto {
  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  month!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  appointments!: number;

  @ApiProperty()
  activePatients!: number;

  @ApiProperty()
  occupancyRate!: number;

  @ApiPropertyOptional()
  satisfactionScore?: number;

  @ApiPropertyOptional()
  contributionMargin?: number;
}

export class ClinicDashboardAlertDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty({ type: String })
  triggeredAt!: Date;

  @ApiPropertyOptional({ type: String })
  resolvedAt?: Date;

  @ApiProperty()
  payload!: Record<string, unknown>;
}

export class ClinicDashboardResponseDto {
  @ApiProperty({ type: () => Object })
  period!: { start: Date; end: Date };

  @ApiProperty({ type: () => Object })
  totals!: {
    clinics: number;
    professionals: number;
    activePatients: number;
    revenue: number;
  };

  @ApiProperty({ type: [ClinicDashboardMetricDto] })
  metrics!: ClinicDashboardMetricDto[];

  @ApiProperty({ type: [ClinicDashboardAlertDto] })
  alerts!: ClinicDashboardAlertDto[];
}
