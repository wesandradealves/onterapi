import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ClinicDashboardAlertDto,
  ClinicDashboardComparisonDto,
  ClinicDashboardForecastDto,
} from './clinic-dashboard-response.dto';
import { ClinicTemplatePropagationResponseDto } from './clinic-template-propagation-response.dto';
import { ClinicSecurityComplianceDocumentDto } from './clinic-security-settings-response.dto';

export class ClinicManagementTeamDistributionDto {
  @ApiProperty()
  role!: string;

  @ApiProperty()
  count!: number;
}

export class ClinicManagementClinicMetricsDto {
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

export class ClinicManagementClinicFinancialsDto {
  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;

  @ApiProperty()
  margin!: number;

  @ApiProperty()
  contributionPercentage!: number;
}

export class ClinicManagementComplianceNextExpirationDto {
  @ApiProperty()
  type!: string;

  @ApiProperty({ type: String })
  expiresAt!: Date;
}

export class ClinicManagementComplianceSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  valid!: number;

  @ApiProperty()
  expiring!: number;

  @ApiProperty()
  expired!: number;

  @ApiProperty()
  missing!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  review!: number;

  @ApiProperty()
  submitted!: number;

  @ApiProperty()
  unknown!: number;

  @ApiPropertyOptional({ type: ClinicManagementComplianceNextExpirationDto })
  nextExpiration?: ClinicManagementComplianceNextExpirationDto;

  @ApiPropertyOptional({ type: [ClinicSecurityComplianceDocumentDto] })
  documents?: ClinicSecurityComplianceDocumentDto[];
}

export class ClinicManagementCoverageSummaryDto {
  @ApiProperty()
  scheduled!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  completedLast30Days!: number;

  @ApiPropertyOptional({ type: String })
  lastUpdatedAt?: Date;
}

export class ClinicManagementClinicSummaryDto {
  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  primaryOwnerId?: string;

  @ApiPropertyOptional({ type: String })
  lastActivityAt?: Date;

  @ApiProperty({ type: ClinicManagementClinicMetricsDto })
  metrics!: ClinicManagementClinicMetricsDto;

  @ApiPropertyOptional({ type: () => ClinicManagementClinicFinancialsDto })
  financials?: ClinicManagementClinicFinancialsDto;

  @ApiProperty({ type: [ClinicDashboardAlertDto] })
  alerts!: ClinicDashboardAlertDto[];

  @ApiPropertyOptional({ type: [ClinicManagementTeamDistributionDto] })
  teamDistribution?: ClinicManagementTeamDistributionDto[];

  @ApiPropertyOptional({ type: ClinicTemplatePropagationResponseDto })
  template?: ClinicTemplatePropagationResponseDto;

  @ApiPropertyOptional({ type: ClinicManagementComplianceSummaryDto })
  compliance?: ClinicManagementComplianceSummaryDto;

  @ApiPropertyOptional({ type: ClinicManagementCoverageSummaryDto })
  coverage?: ClinicManagementCoverageSummaryDto;
}

export class ClinicManagementFinancialSummaryDto {
  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty()
  totalProfit!: number;

  @ApiProperty()
  averageMargin!: number;

  @ApiProperty({ type: [ClinicManagementClinicFinancialsDto] })
  clinics!: ClinicManagementClinicFinancialsDto[];
}

export class ClinicManagementOverviewResponseDto {
  @ApiProperty({ type: () => Object })
  period!: { start: Date; end: Date };

  @ApiProperty({ type: () => Object })
  totals!: {
    clinics: number;
    professionals: number;
    activePatients: number;
    revenue: number;
  };

  @ApiProperty({ type: [ClinicManagementClinicSummaryDto] })
  clinics!: ClinicManagementClinicSummaryDto[];

  @ApiProperty({ type: [ClinicDashboardAlertDto] })
  alerts!: ClinicDashboardAlertDto[];

  @ApiPropertyOptional({ type: ClinicDashboardComparisonDto })
  comparisons?: ClinicDashboardComparisonDto;

  @ApiPropertyOptional({ type: ClinicDashboardForecastDto })
  forecast?: ClinicDashboardForecastDto;

  @ApiPropertyOptional({ type: ClinicManagementFinancialSummaryDto })
  financials?: ClinicManagementFinancialSummaryDto;
}
