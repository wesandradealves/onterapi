import { Injectable } from '@nestjs/common';

import { ClinicTemplateOverride } from '../../../domain/clinic/types/clinic.types';

@Injectable()
export class ClinicConfigurationExportService {
  buildTemplateOverridesCsv(overrides: ClinicTemplateOverride[]): string[] {
    const headers = [
      'overrideId',
      'clinicId',
      'tenantId',
      'templateClinicId',
      'section',
      'overrideVersion',
      'overrideHash',
      'baseTemplateVersionId',
      'baseTemplateVersionNumber',
      'appliedConfigurationVersionId',
      'createdBy',
      'createdAt',
      'updatedAt',
      'supersededAt',
      'supersededBy',
      'overridePayload',
    ];

    const rows = overrides.map((override) =>
      [
        this.escapeCsvValue(override.id),
        this.escapeCsvValue(override.clinicId),
        this.escapeCsvValue(override.tenantId),
        this.escapeCsvValue(override.templateClinicId),
        this.escapeCsvValue(override.section),
        this.escapeCsvValue(override.overrideVersion),
        this.escapeCsvValue(override.overrideHash),
        this.escapeCsvValue(override.baseTemplateVersionId),
        this.escapeCsvValue(override.baseTemplateVersionNumber),
        this.escapeCsvValue(override.appliedConfigurationVersionId ?? ''),
        this.escapeCsvValue(override.createdBy),
        this.escapeCsvValue(this.serializeDate(override.createdAt)),
        this.escapeCsvValue(this.serializeDate(override.updatedAt)),
        this.escapeCsvValue(this.serializeDate(override.supersededAt)),
        this.escapeCsvValue(override.supersededBy ?? ''),
        this.escapeCsvValue(override.overridePayload ?? {}),
      ].join(','),
    );

    return [headers.join(','), ...rows];
  }

  async buildTemplateOverridesExcel(overrides: ClinicTemplateOverride[]): Promise<Buffer> {
    const columns = [
      'overrideId',
      'clinicId',
      'tenantId',
      'templateClinicId',
      'section',
      'overrideVersion',
      'overrideHash',
      'baseTemplateVersionId',
      'baseTemplateVersionNumber',
      'appliedConfigurationVersionId',
      'createdBy',
      'createdAt',
      'updatedAt',
      'supersededAt',
      'supersededBy',
      'overridePayload',
    ];

    const headerRow = columns
      .map((column) => `<Cell><Data ss:Type="String">${this.escapeXmlValue(column)}</Data></Cell>`)
      .join('');

    const dataRows = overrides
      .map((override) => {
        const values: Array<string | number | null> = [
          override.id,
          override.clinicId,
          override.tenantId,
          override.templateClinicId,
          override.section,
          override.overrideVersion,
          override.overrideHash,
          override.baseTemplateVersionId,
          override.baseTemplateVersionNumber,
          override.appliedConfigurationVersionId ?? '',
          override.createdBy,
          this.serializeDate(override.createdAt),
          this.serializeDate(override.updatedAt),
          this.serializeDate(override.supersededAt),
          override.supersededBy ?? '',
          JSON.stringify(override.overridePayload ?? {}),
        ];

        const cells = values
          .map(
            (value) => `<Cell><Data ss:Type="String">${this.escapeXmlValue(value)}</Data></Cell>`,
          )
          .join('');

        return `<Row>${cells}</Row>`;
      })
      .join('');

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="TemplateOverrides">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    return Buffer.from(workbookXml, 'utf-8');
  }

  async buildTemplateOverridesPdf(overrides: ClinicTemplateOverride[]): Promise<Buffer> {
    const lines: string[] = ['Template overrides', ''];

    if (overrides.length === 0) {
      lines.push('Nenhum override encontrado para os filtros aplicados.');
    } else {
      overrides.forEach((override, index) => {
        lines.push(
          `${index + 1}. Override ${override.id}`,
          `   Clinica: ${override.clinicId} | Tenant: ${override.tenantId}`,
          `   Template base: ${override.templateClinicId} | Secao: ${override.section}`,
          `   Versao override: ${override.overrideVersion} | Hash: ${override.overrideHash}`,
          `   Versao base: ${override.baseTemplateVersionId} (${override.baseTemplateVersionNumber})`,
          `   Config aplicad: ${override.appliedConfigurationVersionId ?? 'N/A'}`,
          `   Criado por ${override.createdBy} em ${this.serializeDate(override.createdAt)}`,
          `   Atualizado em: ${this.serializeDate(override.updatedAt) || 'N/A'}`,
          `   Supersedido em: ${this.serializeDate(override.supersededAt) || 'N/A'} por ${
            override.supersededBy ?? 'N/A'
          }`,
          `   Payload: ${JSON.stringify(override.overridePayload ?? {}, null, 2)}`,
          '',
        );
      });
    }

    return this.buildPdfFromLines(lines);
  }

  private escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '""';
    }

    if (value instanceof Date) {
      return `"${this.serializeDate(value)}"`;
    }

    if (typeof value === 'object') {
      const serialized = JSON.stringify(value);
      return `"${serialized.replace(/"/g, '""')}"`;
    }

    const stringValue = String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
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

  private serializeDate(value: unknown): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : value.toISOString();
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
    }

    return '';
  }

  private buildPdfFromLines(lines: string[]): Buffer {
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
