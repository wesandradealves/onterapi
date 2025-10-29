import { ClinicConfigurationExportService } from '../../../src/modules/clinic/services/clinic-configuration-export.service';
import { ClinicTemplateOverride } from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicConfigurationExportService', () => {
  let service: ClinicConfigurationExportService;
  let override: ClinicTemplateOverride;

  beforeEach(() => {
    service = new ClinicConfigurationExportService();
    override = {
      id: 'override-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      templateClinicId: 'template-1',
      section: 'team',
      overrideVersion: 3,
      overridePayload: {
        quotas: [
          { role: 'CLINIC_OWNER', limit: 1 },
          { role: 'CLINIC_MANAGER', limit: 2 },
        ],
      },
      overrideHash: 'hash-xyz',
      baseTemplateVersionId: 'base-1',
      baseTemplateVersionNumber: 5,
      appliedConfigurationVersionId: 'config-9',
      createdBy: 'owner-1',
      createdAt: new Date('2025-07-01T12:00:00.000Z'),
      updatedAt: new Date('2025-07-05T10:30:00.000Z'),
      supersededAt: new Date('2025-08-01T08:00:00.000Z'),
      supersededBy: 'owner-2',
    };
  });

  it('gera CSV com override e dados serializados', () => {
    const csv = service.buildTemplateOverridesCsv([override]);

    expect(csv).toHaveLength(2);
    expect(csv[0]).toBe(
      'overrideId,clinicId,tenantId,templateClinicId,section,overrideVersion,overrideHash,baseTemplateVersionId,baseTemplateVersionNumber,appliedConfigurationVersionId,createdBy,createdAt,updatedAt,supersededAt,supersededBy,overridePayload',
    );
    expect(csv[1]).toContain('"override-1"');
    expect(csv[1]).toContain('"2025-07-01T12:00:00.000Z"');
    expect(csv[1]).toContain('"owner-2"');
    expect(csv[1]).toContain('\"quotas\"');
  });

  it('gera Excel com planilha TemplateOverrides', async () => {
    const buffer = await service.buildTemplateOverridesExcel([override]);
    const content = buffer.toString('utf-8');

    expect(content).toContain('<Worksheet ss:Name="TemplateOverrides">');
    expect(content).toContain('<Data ss:Type="String">override-1</Data>');
    expect(content).toContain('&quot;role&quot;:&quot;CLINIC_OWNER&quot;');
  });

  it('gera PDF em formato texto com resumo por override', async () => {
    const buffer = await service.buildTemplateOverridesPdf([override]);
    const text = buffer.toString('utf-8');

    expect(text).toContain('Template overrides');
    expect(text).toContain('Override override-1');
    expect(text).toContain('Secao: team');
    expect(text).toContain('Versao override: 3');
    expect(text).toContain('"role": "CLINIC_OWNER"');
  });

  it('gera PDF vazio quando nao ha overrides', async () => {
    const buffer = await service.buildTemplateOverridesPdf([]);
    const text = buffer.toString('utf-8');

    expect(text).toContain('Template overrides');
    expect(text).toContain('Nenhum override encontrado');
  });
});
