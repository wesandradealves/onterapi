import { Injectable } from '@nestjs/common';

import { ClinicDashboardAlertDto } from '../api/dtos/clinic-dashboard-response.dto';
import { ClinicManagementOverviewResponseDto } from '../api/dtos/clinic-management-overview-response.dto';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

@Injectable()
export class ClinicManagementExportService {
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
    ];

    const headerRow = columns
      .map((column) => `<Cell><Data ss:Type="String">${this.escapeXmlValue(column)}</Data></Cell>`)
      .join('');

    const dataRows = this.mapOverviewRows(overview)
      .map(
        (row) =>
          `<Row>${[
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
          ]
            .map(
              (value) => `<Cell><Data ss:Type="String">${this.escapeXmlValue(value)}</Data></Cell>`,
            )
            .join('')}</Row>`,
      )
      .join('');

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Overview">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    return Buffer.from(workbookXml, 'utf-8');
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
        '',
      );
    });

    const textContent = this.composePdfText(lines);
    const contentBuffer = Buffer.from(textContent, 'utf-8');

    const objects: string[] = [];
    const addObject = (content: string) => {
      const obj = `${objects.length + 1} 0 obj\n${content}\nendobj\n`;
      objects.push(obj);
    };

    addObject('<< /Type /Catalog /Pages 2 0 R >>');
    addObject('<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    addObject(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    );
    addObject(`<< /Length ${contentBuffer.length} >>\nstream\n${textContent}\nendstream`);
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    const header = '%PDF-1.4\n';
    let body = '';
    const offsets: number[] = [0];
    let currentOffset = header.length;

    objects.forEach((obj) => {
      offsets.push(currentOffset);
      body += obj;
      currentOffset += obj.length;
    });

    const xrefStart = currentOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) {
      xref += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(header + body + xref + trailer, 'utf-8');
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
  }> {
    return overview.clinics.map((clinic) => {
      const metrics = clinic.metrics ?? ({} as NonNullable<typeof clinic.metrics>);
      const financials = clinic.financials;
      const activeAlerts = clinic.alerts?.filter((alert) => !alert.resolvedAt) ?? [];
      const alertTypes = Array.from(new Set(activeAlerts.map((alert) => alert.type))).join('|');
      const distribution = clinic.teamDistribution ?? [];
      const roleCount = (role: RolesEnum): number =>
        distribution.find((entry) => entry.role === role)?.count ?? 0;

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
      };
    });
  }

  private escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '""';
    }

    if (value instanceof Date) {
      return `"${value.toISOString()}"`;
    }

    if (typeof value === 'object') {
      const serialized = JSON.stringify(value);
      return `"${serialized.replace(/"/g, '""')}"`;
    }

    const stringValue = String(value);
    const sanitized = stringValue.replace(/"/g, '""');
    return `"${sanitized}"`;
  }

  private escapeXmlValue(value: unknown): string {
    const stringValue = value === null || value === undefined ? '' : String(value);
    return stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private composePdfText(lines: string[]): string {
    const escapedLines = lines.map((line) => `(${this.escapePdfText(line)}) Tj`).join('\nT*\n');

    return `BT
/F1 11 Tf
50 780 Td
${escapedLines}
ET`;
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
