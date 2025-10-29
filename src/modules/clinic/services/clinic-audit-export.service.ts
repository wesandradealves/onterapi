import { Injectable } from '@nestjs/common';

import { ClinicAuditLog } from '../../../domain/clinic/types/clinic.types';
import { ClinicExportBaseService } from './clinic-export-base.service';

@Injectable()
export class ClinicAuditExportService extends ClinicExportBaseService {
  buildAuditLogsCsv(logs: ClinicAuditLog[]): string[] {
    const headers = [
      'id',
      'tenantId',
      'clinicId',
      'event',
      'performedBy',
      'createdAt',
      'detail',
    ];

    const rows = logs.map((log) =>
      [
        this.escapeCsvValue(log.id),
        this.escapeCsvValue(log.tenantId),
        this.escapeCsvValue(log.clinicId ?? ''),
        this.escapeCsvValue(log.event),
        this.escapeCsvValue(log.performedBy ?? ''),
        this.escapeCsvValue(this.serializeDate(log.createdAt)),
        this.escapeCsvValue(log.detail ?? {}),
      ].join(','),
    );

    return [headers.join(','), ...rows];
  }

  async buildAuditLogsExcel(logs: ClinicAuditLog[]): Promise<Buffer> {
    const columns = ['id', 'tenantId', 'clinicId', 'event', 'performedBy', 'createdAt', 'detail'];

    const rows = logs.map((log) => [
      log.id,
      log.tenantId,
      log.clinicId ?? '',
      log.event,
      log.performedBy ?? '',
      this.serializeDate(log.createdAt),
      log.detail ?? {},
    ]);

    return this.buildExcelBuffer('AuditLogs', columns, rows);
  }

  async buildAuditLogsPdf(logs: ClinicAuditLog[]): Promise<Buffer> {
    const lines: string[] = ['Relatorio de auditoria da clinica', ''];

    if (logs.length === 0) {
      lines.push('Nenhum registro encontrado para os filtros aplicados.');
    } else {
      logs.forEach((log, index) => {
        lines.push(
          `${index + 1}. Evento ${log.event}`,
          `   Log ID: ${log.id}`,
          `   Tenant: ${log.tenantId}`,
          `   Clinica: ${log.clinicId ?? 'N/A'}`,
          `   Executado por: ${log.performedBy ?? 'N/A'} em ${this.serializeDate(log.createdAt)}`,
          `   Detalhes: ${JSON.stringify(log.detail ?? {}, null, 2)}`,
          '',
        );
      });
    }

    return this.buildPdfFromLines(lines);
  }
}

