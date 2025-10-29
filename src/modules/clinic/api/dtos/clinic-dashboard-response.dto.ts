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
  tenantId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty()
  triggeredBy!: string;

  @ApiProperty({ type: String })
  triggeredAt!: Date;

  @ApiPropertyOptional({ type: String })
  resolvedAt?: Date;

  @ApiPropertyOptional()
  resolvedBy?: string;

  @ApiProperty()
  payload!: Record<string, unknown>;
}

export class ClinicDashboardComparisonEntryDto {
  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  revenueVariationPercentage!: number;

  @ApiProperty()
  appointments!: number;

  @ApiProperty()
  appointmentsVariationPercentage!: number;

  @ApiProperty()
  activePatients!: number;

  @ApiProperty()
  activePatientsVariationPercentage!: number;

  @ApiProperty()
  occupancyRate!: number;

  @ApiProperty()
  occupancyVariationPercentage!: number;

  @ApiPropertyOptional()
  satisfactionScore?: number;

  @ApiPropertyOptional()
  satisfactionVariationPercentage?: number;

  @ApiProperty()
  rankingPosition!: number;

  @ApiProperty({ enum: ['upward', 'downward', 'stable'] })
  trendDirection!: 'upward' | 'downward' | 'stable';

  @ApiProperty()
  trendPercentage!: number;

  @ApiProperty()
  benchmarkValue!: number;

  @ApiProperty()
  benchmarkGapPercentage!: number;

  @ApiProperty()
  benchmarkPercentile!: number;
}

export class ClinicDashboardComparisonMetricDto {
  @ApiProperty({ enum: ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'] })
  metric!: 'revenue' | 'appointments' | 'patients' | 'occupancy' | 'satisfaction';

  @ApiProperty({ type: [ClinicDashboardComparisonEntryDto] })
  entries!: ClinicDashboardComparisonEntryDto[];
}

export class ClinicDashboardComparisonDto {
  @ApiProperty({ type: () => Object })
  period!: { start: Date; end: Date };

  @ApiProperty({ type: () => Object })
  previousPeriod!: { start: Date; end: Date };

  @ApiProperty({ type: [ClinicDashboardComparisonMetricDto] })
  metrics!: ClinicDashboardComparisonMetricDto[];
}

export class ClinicDashboardForecastProjectionDto {
  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  month!: string;

  @ApiProperty()
  projectedRevenue!: number;

  @ApiProperty()
  projectedAppointments!: number;

  @ApiProperty()
  projectedOccupancyRate!: number;
}

export class ClinicDashboardForecastDto {
  @ApiProperty({ type: () => Object })
  period!: { start: Date; end: Date };

  @ApiProperty({ type: [ClinicDashboardForecastProjectionDto] })
  projections!: ClinicDashboardForecastProjectionDto[];
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

  @ApiPropertyOptional({ type: () => ClinicDashboardComparisonDto })
  comparisons?: ClinicDashboardComparisonDto;

  @ApiPropertyOptional({ type: () => ClinicDashboardForecastDto })
  forecast?: ClinicDashboardForecastDto;
}

export class ClinicAlertSkippedDetailDto {
  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  reason!: string;
}

export class ClinicAlertEvaluationResponseDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  evaluatedClinics!: number;

  @ApiProperty()
  triggered!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty({ type: [ClinicDashboardAlertDto] })
  alerts!: ClinicDashboardAlertDto[];

  @ApiProperty({ type: [ClinicAlertSkippedDetailDto] })
  skippedDetails!: ClinicAlertSkippedDetailDto[];
}
