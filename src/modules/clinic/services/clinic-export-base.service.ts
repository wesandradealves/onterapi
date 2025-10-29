import { Injectable } from '@nestjs/common';

@Injectable()
export class ClinicExportBaseService {
  protected escapeCsvValue(value: unknown): string {
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

  protected buildExcelBuffer(sheetName: string, columns: string[], rows: unknown[][]): Buffer {
    const headerRow = columns
      .map((column) => `<Cell><Data ss:Type="String">${this.escapeXmlValue(column)}</Data></Cell>`)
      .join('');

    const dataRows = rows
      .map((row) => {
        const cells = row
          .map((value) => {
            const normalized = this.normalizeExcelValue(value);
            return `<Cell><Data ss:Type="String">${this.escapeXmlValue(normalized)}</Data></Cell>`;
          })
          .join('');

        return `<Row>${cells}</Row>`;
      })
      .join('');

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${this.escapeXmlValue(sheetName)}">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    return Buffer.from(workbookXml, 'utf-8');
  }

  protected async buildPdfFromLines(lines: string[]): Promise<Buffer> {
    const textContent = this.composePdfText(lines);

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

    const encodedStream = Buffer.from(`${textContent}\n`, 'utf-8');
    addObject(`<< /Length ${encodedStream.length} >>\nstream\n${textContent}\nendstream`);
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

  protected serializeDate(value: unknown): string {
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

  private normalizeExcelValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return this.serializeDate(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}

