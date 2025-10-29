import { ClinicManagementExportService } from '../../../src/modules/clinic/services/clinic-management-export.service';
import { ClinicDashboardComparisonDto } from '../../../src/modules/clinic/api/dtos/clinic-dashboard-response.dto';
import { ClinicManagementOverviewResponseDto } from '../../../src/modules/clinic/api/dtos/clinic-management-overview-response.dto';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import { ClinicProfessionalCoverage } from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicManagementExportService', () => {
  let service: ClinicManagementExportService;
  let comparison: ClinicDashboardComparisonDto;
  let overview: ClinicManagementOverviewResponseDto;

  beforeEach(() => {
    service = new ClinicManagementExportService();
    comparison = {
      period: {
        start: new Date('2025-07-01T00:00:00.000Z'),
        end: new Date('2025-07-31T23:59:59.000Z'),
      },
      previousPeriod: {
        start: new Date('2025-06-01T00:00:00.000Z'),
        end: new Date('2025-06-30T23:59:59.000Z'),
      },
      metrics: [
        {
          metric: 'revenue',
          entries: [
            {
              clinicId: 'clinic-1',
              name: 'Clinic One',
              rankingPosition: 1,
              revenue: 18000,
              revenueVariationPercentage: 12.5,
              appointments: 120,
              appointmentsVariationPercentage: 6.4,
              activePatients: 90,
              activePatientsVariationPercentage: 5.2,
              occupancyRate: 0.82,
              occupancyVariationPercentage: 2.1,
              satisfactionScore: 4.8,
              satisfactionVariationPercentage: 1.3,
              trendDirection: 'upward',
              trendPercentage: 12.5,
              benchmarkValue: 17000,
              benchmarkGapPercentage: 5.88235294117647,
              benchmarkPercentile: 100,
            },
          ],
        },
      ],
    };

    overview = {
      period: {
        start: new Date('2025-07-01T00:00:00.000Z'),
        end: new Date('2025-07-31T23:59:59.000Z'),
      },
      totals: {
        clinics: 1,
        professionals: 6,
        activePatients: 90,
        revenue: 18000,
      },
      clinics: [
        {
          clinicId: 'clinic-1',
          name: 'Clinic One',
          status: 'active',
          lastActivityAt: new Date('2025-07-25T15:00:00.000Z'),
          metrics: {
            revenue: 18000,
            appointments: 120,
            activePatients: 90,
            occupancyRate: 0.82,
            satisfactionScore: 4.8,
            contributionMargin: 35,
          },
          financials: {
            revenue: 18000,
            expenses: 6000,
            profit: 12000,
            margin: 66.6,
            contributionPercentage: 55,
          },
          alerts: [
            {
              id: 'alert-1',
              clinicId: 'clinic-1',
              tenantId: 'tenant-1',
              type: 'revenue_drop',
              channel: 'email',
              triggeredBy: 'system',
              triggeredAt: new Date('2025-07-20T10:00:00.000Z'),
              payload: { threshold: 10 },
            },
          ],
          teamDistribution: [
            { role: RolesEnum.CLINIC_OWNER, count: 1 },
            { role: RolesEnum.MANAGER, count: 1 },
            { role: RolesEnum.PROFESSIONAL, count: 3 },
            { role: RolesEnum.SECRETARY, count: 1 },
          ],
          coverage: {
            scheduled: 1,
            active: 2,
            completedLast30Days: 3,
            lastUpdatedAt: new Date('2025-07-24T18:00:00.000Z'),
          },
          compliance: {
            total: 3,
            valid: 1,
            expiring: 1,
            expired: 1,
            missing: 0,
            pending: 1,
            review: 0,
            submitted: 0,
            unknown: 0,
            nextExpiration: {
              type: 'CRM',
              expiresAt: new Date('2025-07-30T00:00:00.000Z'),
            },
            documents: [
              {
                type: 'CRM',
                status: 'valid',
                required: true,
                expiresAt: new Date('2025-07-30T00:00:00.000Z'),
              },
              {
                type: 'LGPD',
                status: 'pending',
                required: true,
                expiresAt: null,
              },
              {
                type: 'NR-32',
                status: 'expired',
                required: true,
                expiresAt: new Date('2025-06-15T00:00:00.000Z'),
              },
            ],
          },
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          clinicId: 'clinic-1',
          tenantId: 'tenant-1',
          type: 'revenue_drop',
          channel: 'email',
          triggeredBy: 'system',
          triggeredAt: new Date('2025-07-20T10:00:00.000Z'),
          payload: { threshold: 10 },
        },
      ],
      financials: {
        totalRevenue: 18000,
        totalExpenses: 6000,
        totalProfit: 12000,
        averageMargin: 66.6,
        clinics: [
          {
            clinicId: 'clinic-1',
            revenue: 18000,
            expenses: 6000,
            profit: 12000,
            margin: 66.6,
            contributionPercentage: 55,
          },
        ],
      },
    };
  });

  it('deve gerar CSV de comparacoes com valores e variacoes formatados', () => {
    const csv = service.buildComparisonsCsv(comparison);

    expect(csv).toHaveLength(2);
    expect(csv[0]).toBe(
      'metrica,clinicId,nome,ranking,valorMetrica,variacaoPercentual,tendenciaDirecao,tendenciaPercentual,benchmarkValor,benchmarkGapPercentual,benchmarkPercentil,revenue,revenueVariacao,consultas,consultasVariacao,pacientesAtivos,pacientesVariacao,ocupacao,ocupacaoVariacao,satisfacao,satisfacaoVariacao',
    );
    expect(csv[1]).toBe(
      '"revenue","clinic-1","Clinic One","1","18000","12.5","upward","12.5","17000","5.88235294117647","100","18000","12.5","120","6.4","90","5.2","0.82","2.1","4.8","1.3"',
    );
  });

  it('deve gerar CSV de overview com dados agregados e distribuicao de equipe', () => {
    const csv = service.buildOverviewCsv(overview);

    expect(csv).toHaveLength(2);
    expect(csv[0]).toBe(
      'clinicId,nome,status,ultimoAtivoEm,receita,consultas,pacientesAtivos,ocupacao,satisfacao,margemContribuicao,alertasAtivos,tiposAlertasAtivos,owners,gestores,profissionais,secretarias,coverageScheduled,coverageActive,coverageCompleted30Dias,coverageUltimaAtualizacao,complianceTotal,complianceValid,complianceExpiring,complianceExpired,complianceMissing,compliancePending,complianceReview,complianceSubmitted,complianceUnknown,complianceNextExpirationTipo,complianceNextExpirationEm,complianceDocumentos',
    );
    expect(csv[1]).toBe(
      [
        '"clinic-1"',
        '"Clinic One"',
        '"active"',
        '"2025-07-25T15:00:00.000Z"',
        '"18000"',
        '"120"',
        '"90"',
        '"0.82"',
        '"4.8"',
        '"55"',
        '"1"',
        '"revenue_drop"',
        '"1"',
        '"1"',
        '"3"',
        '"1"',
        '"1"',
        '"2"',
        '"3"',
        '"2025-07-24T18:00:00.000Z"',
        '"3"',
        '"1"',
        '"1"',
        '"1"',
        '"0"',
        '"1"',
        '"0"',
        '"0"',
        '"0"',
        '"CRM"',
        '"2025-07-30T00:00:00.000Z"',
        '"CRM:valid@2025-07-30T00:00:00.000Z|LGPD:pending|NR-32:expired@2025-06-15T00:00:00.000Z"',
      ].join(','),
    );
  });

  it('deve gerar planilha Excel de comparacoes contendo ranking', async () => {
    const buffer = await service.buildComparisonsExcel(comparison);
    const content = buffer.toString('utf-8');

    expect(content).toContain('<Worksheet ss:Name="Comparisons">');
    expect(content).toContain('<Data ss:Type="String">Clinic One</Data>');
    expect(content).toContain('<Data ss:Type="String">1</Data>');
  });

  it('deve gerar PDF de comparacoes com resumo por clinica', async () => {
    const buffer = await service.buildComparisonsPdf(comparison);
    const text = buffer.toString('utf-8');

    expect(text).toContain('Comparativo de Clinicas');
    expect(text).toContain('Clinic One \\(clinic-1\\)');
    expect(text).toContain('Valor: 18000');
    expect(text).toContain('Tendencia: upward \\(12.5%\\)');
    expect(text).toContain('Benchmark: 17000');
  });

  it('deve gerar planilha Excel de overview com dados consolidados', async () => {
    const buffer = await service.buildOverviewExcel(overview);
    const content = buffer.toString('utf-8');

    expect(content).toContain('<Worksheet ss:Name="Overview">');
    expect(content).toContain('<Data ss:Type="String">Clinic One</Data>');
    expect(content).toContain('<Data ss:Type="String">revenue_drop</Data>');
    expect(content).toContain('<Data ss:Type="String">complianceTotal</Data>');
    expect(content).toContain('<Data ss:Type="String">coverageScheduled</Data>');
    expect(content).toContain('<Data ss:Type="String">2025-07-24T18:00:00.000Z</Data>');
    expect(content).toContain(
      '<Data ss:Type="String">CRM:valid@2025-07-30T00:00:00.000Z|LGPD:pending|NR-32:expired@2025-06-15T00:00:00.000Z</Data>',
    );
  });

  it('deve gerar PDF de overview com totais e detalhes por clinica', async () => {
    const buffer = await service.buildOverviewPdf(overview);
    const text = buffer.toString('utf-8');

    expect(text).toContain('Visao Consolidada das Clinicas');
    expect(text).toContain('Totais:');
    expect(text).toContain('Clinic One \\(active\\)');
    expect(text).toContain(
      'Coberturas -> Programadas: 1 | Ativas: 2 | Concluidas \\(30d\\): 3 | Ultima atualizacao: 2025-07-24T18:00:00.000Z',
    );
    expect(text).toContain('Compliance -> Total: 3 | Validos: 1 | Expirando: 1 | Expirados: 1');
    expect(text).toContain('Proximo vencimento: CRM \\(2025-07-30T00:00:00.000Z\\)');
    expect(text).toContain(
      'Documentos: CRM:valid@2025-07-30T00:00:00.000Z|LGPD:pending|NR-32:expired@2025-06-15T00:00:00.000Z',
    );
  });

  it('deve gerar CSV de coberturas temporarias de profissionais', () => {
    const coverages: ClinicProfessionalCoverage[] = [
      {
        id: 'coverage-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date('2025-02-01T09:00:00.000Z'),
        endAt: new Date('2025-02-01T18:00:00.000Z'),
        status: 'scheduled',
        reason: 'Ferias',
        notes: 'Cobertura integral',
        metadata: { origin: 'manager-1' },
        createdBy: 'manager-1',
        createdAt: new Date('2025-01-20T10:00:00.000Z'),
        updatedBy: 'manager-1',
        updatedAt: new Date('2025-01-20T10:00:00.000Z'),
        cancelledAt: undefined,
        cancelledBy: undefined,
      },
    ];

    const csv = service.buildProfessionalCoveragesCsv(coverages);

    expect(csv).toHaveLength(2);
    expect(csv[0]).toBe(
      'coverageId,tenantId,clinicId,professionalTitularId,profissionalCoberturaId,inicioCoverage,fimCoverage,status,motivo,notas,criadoPor,criadoEm,atualizadoPor,atualizadoEm,canceladoEm,canceladoPor,metadata',
    );
    expect(csv[1]).toContain('"coverage-1"');
    expect(csv[1]).toContain('"2025-02-01T09:00:00.000Z"');
    expect(csv[1]).toContain('origin');
  });

  it('deve gerar planilha Excel de coberturas temporarias', async () => {
    const coverages: ClinicProfessionalCoverage[] = [
      {
        id: 'coverage-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date('2025-02-01T09:00:00.000Z'),
        endAt: new Date('2025-02-01T18:00:00.000Z'),
        status: 'active',
        reason: 'Ferias',
        notes: 'Cobertura integral',
        metadata: { origin: 'manager-1' },
        createdBy: 'manager-1',
        createdAt: new Date('2025-01-20T10:00:00.000Z'),
        updatedBy: 'manager-1',
        updatedAt: new Date('2025-01-21T10:00:00.000Z'),
        cancelledAt: undefined,
        cancelledBy: undefined,
      },
    ];

    const buffer = await service.buildProfessionalCoveragesExcel(coverages);
    const content = buffer.toString('utf-8');

    expect(content).toContain('<Worksheet ss:Name="ProfessionalCoverages">');
    expect(content).toContain('<Data ss:Type="String">coverageId</Data>');
    expect(content).toContain('<Data ss:Type="String">coverage-1</Data>');
    expect(content).toContain('<Data ss:Type="String">manager-1</Data>');
    expect(content).toContain('&quot;origin&quot;:&quot;manager-1&quot;');
  });

  it('deve gerar PDF de coberturas temporarias com sumario descritivo', async () => {
    const coverages: ClinicProfessionalCoverage[] = [
      {
        id: 'coverage-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date('2025-02-01T09:00:00.000Z'),
        endAt: new Date('2025-02-01T18:00:00.000Z'),
        status: 'completed',
        reason: 'Ferias',
        notes: 'Cobertura integral',
        metadata: { origin: 'manager-1' },
        createdBy: 'manager-1',
        createdAt: new Date('2025-01-20T10:00:00.000Z'),
        updatedBy: 'manager-1',
        updatedAt: new Date('2025-01-21T10:00:00.000Z'),
        cancelledAt: new Date('2025-02-01T20:00:00.000Z'),
        cancelledBy: 'manager-1',
      },
    ];

    const buffer = await service.buildProfessionalCoveragesPdf(coverages);
    const text = buffer.toString('utf-8');

    expect(text).toContain('Coberturas temporarias de profissionais');
    expect(text).toContain('1. Cobertura coverage-1');
    expect(text).toContain('Profissional titular: professional-1 | Cobertura: professional-2');
    expect(text).toContain('Periodo: 2025-02-01T09:00:00.000Z -> 2025-02-01T18:00:00.000Z');
    expect(text).toContain('Status: completed');
    expect(text).toContain('"origin": "manager-1"');
  });

  it('deve gerar PDF de coberturas vazio quando nao ha registros', async () => {
    const buffer = await service.buildProfessionalCoveragesPdf([]);
    const text = buffer.toString('utf-8');

    expect(text).toContain('Coberturas temporarias de profissionais');
    expect(text).toContain('Nenhuma cobertura encontrada');
  });
});
