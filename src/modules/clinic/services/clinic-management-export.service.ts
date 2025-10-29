import { Injectable } from '@nestjs/common';

import {
  ClinicDashboardAlertDto,
  ClinicDashboardComparisonDto,
  ClinicDashboardComparisonEntryDto,
} from '../api/dtos/clinic-dashboard-response.dto';
import { ClinicManagementOverviewResponseDto } from '../api/dtos/clinic-management-overview-response.dto';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { ClinicProfessionalCoverage } from '../../../domain/clinic/types/clinic.types';
import { ClinicExportBaseService } from './clinic-export-base.service';

@Injectable()
export class ClinicManagementExportService extends ClinicExportBaseService {
  buildOverviewCsv(overview: ClinicManagementOverviewResponseDto): string[] {
    const headers = [
      'clinicId',
      'nome',
      'status',
      'ultimoAtivoEm',
      'receita',
      'consultas',
      'pacientesAtivos',
      'ocupacao',
      'satisfacao',
      'margemContribuicao',
      'alertasAtivos',
      'tiposAlertasAtivos',
      'owners',
      'gestores',
      'profissionais',
      'secretarias',
      'coverageScheduled',
      'coverageActive',
      'coverageCompleted30Dias',
      'coverageUltimaAtualizacao',
      'complianceTotal',
      'complianceValid',
      'complianceExpiring',
      'complianceExpired',
      'complianceMissing',
      'compliancePending',
      'complianceReview',
      'complianceSubmitted',
      'complianceUnknown',
      'complianceNextExpirationTipo',
      'complianceNextExpirationEm',
      'complianceDocumentos',
    ];

    const rows = this.mapOverviewRows(overview).map((row) =>
      [
        this.escapeCsvValue(row.clinicId),
        this.escapeCsvValue(row.name),
        this.escapeCsvValue(row.status),
        this.escapeCsvValue(row.lastActivityAt ?? ''),
        this.escapeCsvValue(row.revenue),
        this.escapeCsvValue(row.appointments),
        this.escapeCsvValue(row.activePatients),
        this.escapeCsvValue(row.occupancyRate),
        this.escapeCsvValue(row.satisfactionScore ?? ''),
        this.escapeCsvValue(row.contributionMargin ?? ''),
        this.escapeCsvValue(row.activeAlerts),
        this.escapeCsvValue(row.alertTypes),
        this.escapeCsvValue(row.owners),
        this.escapeCsvValue(row.managers),
        this.escapeCsvValue(row.professionals),
        this.escapeCsvValue(row.secretaries),
        this.escapeCsvValue(row.coverageScheduled),
        this.escapeCsvValue(row.coverageActive),
        this.escapeCsvValue(row.coverageCompletedLast30Days),
        this.escapeCsvValue(row.coverageLastUpdatedAt ?? ''),
        this.escapeCsvValue(row.complianceTotal),
        this.escapeCsvValue(row.complianceValid),
        this.escapeCsvValue(row.complianceExpiring),
        this.escapeCsvValue(row.complianceExpired),
        this.escapeCsvValue(row.complianceMissing),
        this.escapeCsvValue(row.compliancePending),
        this.escapeCsvValue(row.complianceReview),
        this.escapeCsvValue(row.complianceSubmitted),
        this.escapeCsvValue(row.complianceUnknown),
        this.escapeCsvValue(row.complianceNextExpirationType),
        this.escapeCsvValue(row.complianceNextExpirationAt ?? ''),
        this.escapeCsvValue(row.complianceDocuments),
      ].join(','),
    );

    return [headers.join(','), ...rows];
  }

  buildAlertsCsv(alerts: ClinicDashboardAlertDto[]): string[] {
    const headers = [
      'alertId',
      'clinicId',
      'tipo',
      'canal',
      'disparadoPor',
      'disparadoEm',
      'resolvidoPor',
      'resolvidoEm',
      'dados',
    ];

    const rows = alerts.map((alert) =>
      [
        this.escapeCsvValue(alert.id),
        this.escapeCsvValue(alert.clinicId),
        this.escapeCsvValue(alert.type),
        this.escapeCsvValue(alert.channel),
        this.escapeCsvValue(alert.triggeredBy),
        this.escapeCsvValue(alert.triggeredAt),
        this.escapeCsvValue(alert.resolvedBy ?? ''),
        this.escapeCsvValue(alert.resolvedAt ?? ''),
        this.escapeCsvValue(alert.payload ?? {}),
      ].join(','),
    );

    return [headers.join(','), ...rows];
  }

  buildComparisonsCsv(comparison: ClinicDashboardComparisonDto): string[] {
    const headers = [
      'metrica',
      'clinicId',
      'nome',
      'ranking',
      'valorMetrica',
      'variacaoPercentual',
      'tendenciaDirecao',
      'tendenciaPercentual',
      'benchmarkValor',
      'benchmarkGapPercentual',
      'benchmarkPercentil',
      'revenue',
      'revenueVariacao',
      'consultas',
      'consultasVariacao',
      'pacientesAtivos',
      'pacientesVariacao',
      'ocupacao',
      'ocupacaoVariacao',
      'satisfacao',
      'satisfacaoVariacao',
    ];

    const rows = comparison.metrics.flatMap((metric) =>
      metric.entries.map((entry) =>
        [
          this.escapeCsvValue(metric.metric),
          this.escapeCsvValue(entry.clinicId),
          this.escapeCsvValue(entry.name),
          this.escapeCsvValue(entry.rankingPosition),
          this.escapeCsvValue(this.resolveMetricValue(metric.metric, entry)),
          this.escapeCsvValue(this.resolveMetricVariation(metric.metric, entry)),
          this.escapeCsvValue(entry.trendDirection),
          this.escapeCsvValue(entry.trendPercentage),
          this.escapeCsvValue(entry.benchmarkValue),
          this.escapeCsvValue(entry.benchmarkGapPercentage),
          this.escapeCsvValue(entry.benchmarkPercentile),
          this.escapeCsvValue(entry.revenue),
          this.escapeCsvValue(entry.revenueVariationPercentage),
          this.escapeCsvValue(entry.appointments),
          this.escapeCsvValue(entry.appointmentsVariationPercentage),
          this.escapeCsvValue(entry.activePatients),
          this.escapeCsvValue(entry.activePatientsVariationPercentage),
          this.escapeCsvValue(entry.occupancyRate),
          this.escapeCsvValue(entry.occupancyVariationPercentage),
          this.escapeCsvValue(entry.satisfactionScore ?? ''),
          this.escapeCsvValue(entry.satisfactionVariationPercentage ?? ''),
        ].join(','),
      ),
    );

    return [headers.join(','), ...rows];
  }

  buildProfessionalCoveragesCsv(coverages: ClinicProfessionalCoverage[]): string[] {
    const headers = [
      'coverageId',
      'tenantId',
      'clinicId',
      'professionalTitularId',
      'profissionalCoberturaId',
      'inicioCoverage',
      'fimCoverage',
      'status',
      'motivo',
      'notas',
      'criadoPor',
      'criadoEm',
      'atualizadoPor',
      'atualizadoEm',
      'canceladoEm',
      'canceladoPor',
      'metadata',
    ];

    const rows = coverages.map((coverage) =>
      [
        this.escapeCsvValue(coverage.id),
        this.escapeCsvValue(coverage.tenantId),
        this.escapeCsvValue(coverage.clinicId),
        this.escapeCsvValue(coverage.professionalId),
        this.escapeCsvValue(coverage.coverageProfessionalId),
        this.escapeCsvValue(coverage.startAt),
        this.escapeCsvValue(coverage.endAt),
        this.escapeCsvValue(coverage.status),
        this.escapeCsvValue(coverage.reason ?? ''),
        this.escapeCsvValue(coverage.notes ?? ''),
        this.escapeCsvValue(coverage.createdBy),
        this.escapeCsvValue(coverage.createdAt),
        this.escapeCsvValue(coverage.updatedBy ?? ''),
        this.escapeCsvValue(coverage.updatedAt),
        this.escapeCsvValue(coverage.cancelledAt ?? ''),
        this.escapeCsvValue(coverage.cancelledBy ?? ''),
        this.escapeCsvValue(coverage.metadata ?? {}),
      ].join(','),
    );

    return [headers.join(','), ...rows];
  }

  async buildProfessionalCoveragesExcel(coverages: ClinicProfessionalCoverage[]): Promise<Buffer> {
    const columns = [
      'coverageId',
      'tenantId',
      'clinicId',
      'professionalTitularId',
      'profissionalCoberturaId',
      'inicioCoverage',
      'fimCoverage',
      'status',
      'motivo',
      'notas',
      'criadoPor',
      'criadoEm',
      'atualizadoPor',
      'atualizadoEm',
      'canceladoEm',
      'canceladoPor',
      'metadata',
    ];

    const rows = coverages.map((coverage) => [
      coverage.id,
      coverage.tenantId,
      coverage.clinicId,
      coverage.professionalId,
      coverage.coverageProfessionalId,
      this.serializeDate(coverage.startAt),
      this.serializeDate(coverage.endAt),
      coverage.status,
      coverage.reason ?? '',
      coverage.notes ?? '',
      coverage.createdBy,
      this.serializeDate(coverage.createdAt),
      coverage.updatedBy ?? '',
      this.serializeDate(coverage.updatedAt),
      this.serializeDate(coverage.cancelledAt),
      coverage.cancelledBy ?? '',
      coverage.metadata ?? {},
    ]);

    return this.buildExcelBuffer('ProfessionalCoverages', columns, rows);
  }

  async buildProfessionalCoveragesPdf(coverages: ClinicProfessionalCoverage[]): Promise<Buffer> {
    const lines: string[] = ['Coberturas temporarias de profissionais', ''];

    if (coverages.length === 0) {
      lines.push('Nenhuma cobertura encontrada para os filtros aplicados.');
    } else {
      coverages.forEach((coverage, index) => {
        lines.push(
          `${index + 1}. Cobertura ${coverage.id}`,
          `   Clinica: ${coverage.clinicId} | Tenant: ${coverage.tenantId}`,
          `   Profissional titular: ${coverage.professionalId} | Cobertura: ${coverage.coverageProfessionalId}`,
          `   Periodo: ${this.serializeDate(coverage.startAt)} -> ${this.serializeDate(coverage.endAt)}`,
          `   Status: ${coverage.status}`,
          `   Motivo: ${coverage.reason ?? 'N/A'}`,
          `   Notas: ${coverage.notes ?? 'N/A'}`,
          `   Criado por ${coverage.createdBy} em ${this.serializeDate(coverage.createdAt)}`,
          `   Atualizado por ${coverage.updatedBy ?? 'N/A'} em ${this.serializeDate(coverage.updatedAt)}`,
          `   Cancelado em: ${coverage.cancelledAt ? this.serializeDate(coverage.cancelledAt) : 'N/A'} por ${
            coverage.cancelledBy ?? 'N/A'
          }`,
          `   Metadata: ${JSON.stringify(coverage.metadata ?? {}, null, 2)}`,
          '',
        );
      });
    }

    return this.buildPdfFromLines(lines);
  }

  async buildComparisonsExcel(comparison: ClinicDashboardComparisonDto): Promise<Buffer> {
    const columns = [
      'metrica',
      'clinicId',
      'nome',
      'ranking',
      'valorMetrica',
      'variacaoPercentual',
      'tendenciaDirecao',
      'tendenciaPercentual',
      'benchmarkValor',
      'benchmarkGapPercentual',
      'benchmarkPercentil',
      'revenue',
      'revenueVariacao',
      'consultas',
      'consultasVariacao',
      'pacientesAtivos',
      'pacientesVariacao',
      'ocupacao',
      'ocupacaoVariacao',
      'satisfacao',
      'satisfacaoVariacao',
    ];

    const rows = comparison.metrics.flatMap((metric) =>
      metric.entries.map((entry) => [
        metric.metric,
        entry.clinicId,
        entry.name,
        entry.rankingPosition,
        this.resolveMetricValue(metric.metric, entry),
        this.resolveMetricVariation(metric.metric, entry),
        entry.trendDirection,
        entry.trendPercentage,
        entry.benchmarkValue,
        entry.benchmarkGapPercentage,
        entry.benchmarkPercentile,
        entry.revenue,
        entry.revenueVariationPercentage,
        entry.appointments,
        entry.appointmentsVariationPercentage,
        entry.activePatients,
        entry.activePatientsVariationPercentage,
        entry.occupancyRate,
        entry.occupancyVariationPercentage,
        entry.satisfactionScore ?? '',
        entry.satisfactionVariationPercentage ?? '',
      ]),
    );

    return this.buildExcelBuffer('Comparisons', columns, rows);
  }

  async buildComparisonsPdf(comparison: ClinicDashboardComparisonDto): Promise<Buffer> {
    const periodStart = comparison.period?.start
      ? new Date(comparison.period.start).toISOString()
      : '';
    const periodEnd = comparison.period?.end ? new Date(comparison.period.end).toISOString() : '';

    const lines: string[] = [
      'Comparativo de Clinicas',
      `Periodo: ${periodStart} ate ${periodEnd}`,
      '',
    ];

    comparison.metrics.forEach((metric) => {
      lines.push(`Metrica: ${metric.metric.toUpperCase()}`);

      metric.entries.forEach((entry) => {
        const value = this.resolveMetricValue(metric.metric, entry);
        const variation = this.resolveMetricVariation(metric.metric, entry);

        lines.push(
          `  ${entry.rankingPosition}. ${entry.name} (${entry.clinicId})`,
          `    Valor: ${value ?? 'N/A'} | Variacao: ${
            variation !== null && variation !== undefined ? `${variation}%` : 'N/A'
          }`,
          `    Tendencia: ${entry.trendDirection} (${entry.trendPercentage}%)`,
          `    Benchmark: ${entry.benchmarkValue} | Gap: ${entry.benchmarkGapPercentage}% | Percentil: ${entry.benchmarkPercentile}%`,
          `    Receita: ${entry.revenue} (${entry.revenueVariationPercentage}%); Consultas: ${
            entry.appointments
          } (${entry.appointmentsVariationPercentage}%)`,
          `    Pacientes ativos: ${entry.activePatients} (${entry.activePatientsVariationPercentage}%); Ocupacao: ${entry.occupancyRate} (${entry.occupancyVariationPercentage}%)`,
          `    Satisfacao: ${
            entry.satisfactionScore ?? 'N/A'
          } (${entry.satisfactionVariationPercentage ?? 'N/A'}%)`,
        );
      });

      lines.push('');
    });

    return this.buildPdfFromLines(lines);
  }

  async buildOverviewExcel(overview: ClinicManagementOverviewResponseDto): Promise<Buffer> {
    const columns = [
      'clinicId',
      'nome',
      'status',
      'ultimoAtivoEm',
      'receita',
      'consultas',
      'pacientesAtivos',
      'ocupacao',
      'satisfacao',
      'margemContribuicao',
      'alertasAtivos',
      'tiposAlertasAtivos',
      'owners',
      'gestores',
      'profissionais',
      'secretarias',
      'coverageScheduled',
      'coverageActive',
      'coverageCompleted30Dias',
      'coverageUltimaAtualizacao',
      'complianceTotal',
      'complianceValid',
      'complianceExpiring',
      'complianceExpired',
      'complianceMissing',
      'compliancePending',
      'complianceReview',
      'complianceSubmitted',
      'complianceUnknown',
      'complianceNextExpirationTipo',
      'complianceNextExpirationEm',
      'complianceDocumentos',
    ];

    const rows = this.mapOverviewRows(overview).map((row) => [
      row.clinicId,
      row.name,
      row.status,
      row.lastActivityAt ? row.lastActivityAt.toISOString() : '',
      row.revenue,
      row.appointments,
      row.activePatients,
      row.occupancyRate,
      row.satisfactionScore ?? '',
      row.contributionMargin ?? '',
      row.activeAlerts,
      row.alertTypes,
      row.owners,
      row.managers,
      row.professionals,
      row.secretaries,
      row.coverageScheduled,
      row.coverageActive,
      row.coverageCompletedLast30Days,
      row.coverageLastUpdatedAt ? row.coverageLastUpdatedAt.toISOString() : '',
      row.complianceTotal,
      row.complianceValid,
      row.complianceExpiring,
      row.complianceExpired,
      row.complianceMissing,
      row.compliancePending,
      row.complianceReview,
      row.complianceSubmitted,
      row.complianceUnknown,
      row.complianceNextExpirationType,
      row.complianceNextExpirationAt ? row.complianceNextExpirationAt.toISOString() : '',
      row.complianceDocuments,
    ]);

    return this.buildExcelBuffer('Overview', columns, rows);
  }

  async buildOverviewPdf(overview: ClinicManagementOverviewResponseDto): Promise<Buffer> {
    const periodStart = overview.period?.start ? new Date(overview.period.start).toISOString() : '';
    const periodEnd = overview.period?.end ? new Date(overview.period.end).toISOString() : '';

    const lines: string[] = [
      'Visao Consolidada das Clinicas',
      `Periodo: ${periodStart} ate ${periodEnd}`,
      '',
      'Totais:',
      ` - Clinicas: ${overview.totals?.clinics ?? 0}`,
      ` - Profissionais: ${overview.totals?.professionals ?? 0}`,
      ` - Pacientes ativos: ${overview.totals?.activePatients ?? 0}`,
      ` - Receita: ${overview.totals?.revenue ?? 0}`,
      '',
      'Detalhes por clinica:',
    ];

    this.mapOverviewRows(overview).forEach((row) => {
      lines.push(
        `${row.name} (${row.status})`,
        `  Receita: ${row.revenue}`,
        `  Consultas: ${row.appointments}`,
        `  Pacientes: ${row.activePatients}`,
        `  Ocupacao: ${row.occupancyRate}`,
        `  Satisfacao: ${row.satisfactionScore ?? 'N/A'}`,
        `  Alertas ativos: ${row.activeAlerts} (${row.alertTypes || 'Nenhum'})`,
        `  Equipe -> Owner: ${row.owners} | Gestor: ${row.managers} | Profissionais: ${row.professionals} | Secretarias: ${row.secretaries}`,
        `  Coberturas -> Programadas: ${row.coverageScheduled} | Ativas: ${row.coverageActive} | Concluidas (30d): ${row.coverageCompletedLast30Days} | Ultima atualizacao: ${
          row.coverageLastUpdatedAt ? row.coverageLastUpdatedAt.toISOString() : 'N/A'
        }`,
        `  Compliance -> Total: ${row.complianceTotal} | Validos: ${row.complianceValid} | Expirando: ${row.complianceExpiring} | Expirados: ${row.complianceExpired} | Missing: ${row.complianceMissing} | Pendentes: ${row.compliancePending} | Revisao: ${row.complianceReview} | Submetidos: ${row.complianceSubmitted} | Desconhecido: ${row.complianceUnknown}`,
        `  Proximo vencimento: ${row.complianceNextExpirationType || 'N/A'}${
          row.complianceNextExpirationAt ? ` (${row.complianceNextExpirationAt.toISOString()})` : ''
        }`,
        `  Documentos: ${row.complianceDocuments || 'N/A'}`,
        '',
      );
    });

    return this.buildPdfFromLines(lines);
  }

  private mapOverviewRows(overview: ClinicManagementOverviewResponseDto): Array<{
    clinicId: string;
    name: string;
    status: string;
    lastActivityAt?: Date;
    revenue: number;
    appointments: number;
    activePatients: number;
    occupancyRate: number;
    satisfactionScore?: number;
    contributionMargin?: number;
    activeAlerts: number;
    alertTypes: string;
    owners: number;
    managers: number;
    professionals: number;
    secretaries: number;
    coverageScheduled: number;
    coverageActive: number;
    coverageCompletedLast30Days: number;
    coverageLastUpdatedAt?: Date;
    complianceTotal: number;
    complianceValid: number;
    complianceExpiring: number;
    complianceExpired: number;
    complianceMissing: number;
    compliancePending: number;
    complianceReview: number;
    complianceSubmitted: number;
    complianceUnknown: number;
    complianceNextExpirationType: string;
    complianceNextExpirationAt?: Date;
    complianceDocuments: string;
  }> {
    return overview.clinics.map((clinic) => {
      const metrics = clinic.metrics ?? ({} as NonNullable<typeof clinic.metrics>);
      const financials = clinic.financials;
      const activeAlerts = clinic.alerts?.filter((alert) => !alert.resolvedAt) ?? [];
      const alertTypes = Array.from(new Set(activeAlerts.map((alert) => alert.type))).join('|');
      const distribution = clinic.teamDistribution ?? [];
      const roleCount = (role: RolesEnum): number =>
        distribution.find((entry) => entry.role === role)?.count ?? 0;
      const compliance = clinic.compliance;

      const complianceDocuments =
        compliance?.documents
          ?.map((document) => {
            const type = document.type ?? 'desconhecido';
            const status = document.status ?? 'unknown';
            const optionalFlag = document.required === false ? ' (opcional)' : '';
            const expiresAt =
              document.expiresAt instanceof Date
                ? document.expiresAt.toISOString()
                : document.expiresAt
                  ? new Date(document.expiresAt).toISOString()
                  : undefined;
            const expiresSuffix = expiresAt ? `@${expiresAt}` : '';
            return `${type}:${status}${optionalFlag}${expiresSuffix}`;
          })
          .join('|') ?? '';

      const nextExpirationDateRaw = compliance?.nextExpiration?.expiresAt;
      const complianceNextExpirationAt =
        nextExpirationDateRaw instanceof Date
          ? nextExpirationDateRaw
          : nextExpirationDateRaw
            ? new Date(nextExpirationDateRaw)
            : undefined;

      return {
        clinicId: clinic.clinicId,
        name: clinic.name,
        status: clinic.status,
        lastActivityAt: clinic.lastActivityAt,
        revenue: financials?.revenue ?? metrics.revenue ?? 0,
        appointments: metrics.appointments ?? 0,
        activePatients: metrics.activePatients ?? 0,
        occupancyRate: metrics.occupancyRate ?? 0,
        satisfactionScore: metrics.satisfactionScore,
        contributionMargin: financials?.contributionPercentage ?? metrics.contributionMargin,
        activeAlerts: activeAlerts.length,
        alertTypes,
        owners: roleCount(RolesEnum.CLINIC_OWNER),
        managers: roleCount(RolesEnum.MANAGER),
        professionals: roleCount(RolesEnum.PROFESSIONAL),
        secretaries: roleCount(RolesEnum.SECRETARY),
        coverageScheduled: clinic.coverage?.scheduled ?? 0,
        coverageActive: clinic.coverage?.active ?? 0,
        coverageCompletedLast30Days: clinic.coverage?.completedLast30Days ?? 0,
        coverageLastUpdatedAt: clinic.coverage?.lastUpdatedAt,
        complianceTotal: compliance?.total ?? 0,
        complianceValid: compliance?.valid ?? 0,
        complianceExpiring: compliance?.expiring ?? 0,
        complianceExpired: compliance?.expired ?? 0,
        complianceMissing: compliance?.missing ?? 0,
        compliancePending: compliance?.pending ?? 0,
        complianceReview: compliance?.review ?? 0,
        complianceSubmitted: compliance?.submitted ?? 0,
        complianceUnknown: compliance?.unknown ?? 0,
        complianceNextExpirationType: compliance?.nextExpiration?.type ?? '',
        complianceNextExpirationAt,
        complianceDocuments,
      };
    });
  }

  private resolveMetricValue(
    metric: ClinicDashboardComparisonDto['metrics'][number]['metric'],
    entry: ClinicDashboardComparisonEntryDto,
  ): number | null {
    switch (metric) {
      case 'revenue':
        return entry.revenue;
      case 'appointments':
        return entry.appointments;
      case 'patients':
        return entry.activePatients;
      case 'occupancy':
        return entry.occupancyRate;
      case 'satisfaction':
        return entry.satisfactionScore ?? null;
      default:
        return null;
    }
  }

  private resolveMetricVariation(
    metric: ClinicDashboardComparisonDto['metrics'][number]['metric'],
    entry: ClinicDashboardComparisonEntryDto,
  ): number | null {
    switch (metric) {
      case 'revenue':
        return entry.revenueVariationPercentage;
      case 'appointments':
        return entry.appointmentsVariationPercentage;
      case 'patients':
        return entry.activePatientsVariationPercentage;
      case 'occupancy':
        return entry.occupancyVariationPercentage;
      case 'satisfaction':
        return entry.satisfactionVariationPercentage ?? null;
      default:
        return null;
    }
  }

}
