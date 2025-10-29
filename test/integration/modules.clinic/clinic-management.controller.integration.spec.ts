import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import {
  ClinicAlert,
  ClinicManagementOverview,
  ClinicManagementOverviewQuery,
  ClinicManagementTemplateInfo,
  ClinicMember,
  ClinicProfessionalCoverage,
} from '../../../src/domain/clinic/types/clinic.types';
import {
  IGetClinicManagementOverviewUseCase,
  IGetClinicManagementOverviewUseCase as IGetClinicManagementOverviewUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/get-clinic-management-overview.use-case.interface';
import {
  ITransferClinicProfessionalUseCase,
  ITransferClinicProfessionalUseCase as ITransferClinicProfessionalUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/transfer-clinic-professional.use-case.interface';
import {
  IListClinicAlertsUseCase,
  IListClinicAlertsUseCase as IListClinicAlertsUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/list-clinic-alerts.use-case.interface';
import {
  IResolveClinicAlertUseCase,
  IResolveClinicAlertUseCase as IResolveClinicAlertUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/resolve-clinic-alert.use-case.interface';
import {
  IEvaluateClinicAlertsUseCase,
  IEvaluateClinicAlertsUseCase as IEvaluateClinicAlertsUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/evaluate-clinic-alerts.use-case.interface';
import {
  ICompareClinicsUseCase,
  ICompareClinicsUseCase as ICompareClinicsUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';
import {
  IListClinicProfessionalCoveragesUseCase,
  IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import { ClinicManagementController } from '../../../src/modules/clinic/api/controllers/clinic-management.controller';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';
import { ClinicAccessService } from '../../../src/modules/clinic/services/clinic-access.service';
import { ClinicManagementExportService } from '../../../src/modules/clinic/services/clinic-management-export.service';

class AllowAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'user-ctx',
      tenantId: '00000000-0000-0000-0000-000000000000',
      role: RolesEnum.CLINIC_OWNER,
    };
    return true;
  }
}

describe('ClinicManagementController (integration)', () => {
  let app: INestApplication;
  let overviewUseCase: jest.Mocked<IGetClinicManagementOverviewUseCase>;
  let transferUseCase: jest.Mocked<ITransferClinicProfessionalUseCase>;
  let alertsUseCase: jest.Mocked<IListClinicAlertsUseCase>;
  let resolveAlertUseCase: jest.Mocked<IResolveClinicAlertUseCase>;
  let evaluateAlertsUseCase: jest.Mocked<IEvaluateClinicAlertsUseCase>;
  let compareUseCase: jest.Mocked<ICompareClinicsUseCase>;
  let listCoveragesUseCase: jest.Mocked<IListClinicProfessionalCoveragesUseCase>;
  let clinicAccessService: {
    resolveAuthorizedClinicIds: jest.Mock;
    assertClinicAccess: jest.Mock;
    assertAlertAccess: jest.Mock;
  };
  const tenantCtx = '00000000-0000-0000-0000-000000000000';
  const clinicOneId = '11111111-1111-1111-1111-111111111111';
  const clinicTwoId = '22222222-2222-2222-2222-222222222222';
  const binaryParser = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  };

  const buildOverviewFixture = (): ClinicManagementOverview => ({
    period: {
      start: new Date('2025-01-01T00:00:00Z'),
      end: new Date('2025-01-31T23:59:59Z'),
    },
    totals: {
      clinics: 1,
      professionals: 4,
      activePatients: 80,
      revenue: 10000,
    },
    clinics: [
      {
        clinicId: clinicOneId,
        name: 'Clinic One',
        status: 'active',
        primaryOwnerId: 'owner-1',
        lastActivityAt: new Date('2025-01-15T12:00:00Z'),
        metrics: {
          revenue: 10000,
          appointments: 120,
          activePatients: 80,
          occupancyRate: 0.82,
          satisfactionScore: 4.5,
          contributionMargin: 0.3,
        },
        financials: {
          clinicId: clinicOneId,
          revenue: 10000,
          expenses: 5000,
          profit: 5000,
          margin: 50,
          contributionPercentage: 55,
        },
        alerts: [
          {
            id: 'alert-active',
            clinicId: clinicOneId,
            tenantId: tenantCtx,
            type: 'revenue_drop',
            channel: 'push',
            triggeredBy: 'system',
            triggeredAt: new Date('2025-01-10T10:00:00Z'),
            payload: { variation: -12 },
            resolvedAt: undefined,
            resolvedBy: undefined,
          } as ClinicAlert,
          {
            id: 'alert-resolved',
            clinicId: clinicOneId,
            tenantId: tenantCtx,
            type: 'compliance',
            channel: 'email',
            triggeredBy: 'system',
            triggeredAt: new Date('2025-01-05T10:00:00Z'),
            resolvedAt: new Date('2025-01-06T10:00:00Z'),
            resolvedBy: 'manager-1',
            payload: { document: 'crm' },
          } as ClinicAlert,
        ],
        teamDistribution: [
          { role: RolesEnum.CLINIC_OWNER, count: 1 },
          { role: RolesEnum.MANAGER, count: 2 },
          { role: RolesEnum.PROFESSIONAL, count: 3 },
          { role: RolesEnum.SECRETARY, count: 1 },
        ],
        coverage: {
          scheduled: 1,
          active: 2,
          completedLast30Days: 1,
          lastUpdatedAt: new Date('2025-01-12T09:00:00Z'),
        },
        template: undefined,
        compliance: {
          total: 2,
          valid: 1,
          expiring: 1,
          expired: 0,
          missing: 0,
          pending: 0,
          review: 0,
          submitted: 0,
          unknown: 0,
          nextExpiration: {
            type: 'crm',
            expiresAt: new Date('2025-02-01T12:00:00Z'),
          },
          documents: [
            {
              type: 'crm',
              status: 'valid',
              required: true,
              expiresAt: new Date('2025-02-01T12:00:00Z'),
            },
            {
              type: 'lgpd',
              status: 'pending',
              required: true,
              expiresAt: null,
            },
          ],
        },
      },
    ],
    alerts: [],
    comparisons: undefined,
    forecast: undefined,
    financials: undefined,
  });

  beforeEach(async () => {
    overviewUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IGetClinicManagementOverviewUseCase>;

    transferUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ITransferClinicProfessionalUseCase>;

    alertsUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IListClinicAlertsUseCase>;

    resolveAlertUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IResolveClinicAlertUseCase>;

    evaluateAlertsUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IEvaluateClinicAlertsUseCase>;

    compareUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ICompareClinicsUseCase>;

    listCoveragesUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IListClinicProfessionalCoveragesUseCase>;

    clinicAccessService = {
      resolveAuthorizedClinicIds: jest.fn(
        async ({ requestedClinicIds }: { requestedClinicIds?: string[] | null }) =>
          requestedClinicIds && requestedClinicIds.length > 0 ? requestedClinicIds : [clinicOneId],
      ),
      assertClinicAccess: jest.fn(async () => undefined),
      assertAlertAccess: jest.fn(async () => ({
        id: 'alert-1',
        clinicId: clinicOneId,
        tenantId: tenantCtx,
        type: 'revenue_drop',
        channel: 'system',
        triggeredAt: new Date('2025-01-01T00:00:00Z'),
        triggeredBy: 'system',
        payload: {},
      })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicManagementController],
      providers: [
        {
          provide: IGetClinicManagementOverviewUseCaseToken,
          useValue: overviewUseCase,
        },
        {
          provide: ITransferClinicProfessionalUseCaseToken,
          useValue: transferUseCase,
        },
        {
          provide: IListClinicAlertsUseCaseToken,
          useValue: alertsUseCase,
        },
        {
          provide: IResolveClinicAlertUseCaseToken,
          useValue: resolveAlertUseCase,
        },
        {
          provide: IEvaluateClinicAlertsUseCaseToken,
          useValue: evaluateAlertsUseCase,
        },
        {
          provide: ICompareClinicsUseCaseToken,
          useValue: compareUseCase,
        },
        {
          provide: IListClinicProfessionalCoveragesUseCaseToken,
          useValue: listCoveragesUseCase,
        },
        { provide: ClinicAccessService, useValue: clinicAccessService },
        ClinicManagementExportService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('permite desabilitar o resumo financeiro via query', async () => {
    const overview: ClinicManagementOverview = {
      period: {
        start: new Date('2025-02-01T00:00:00Z'),
        end: new Date('2025-02-28T23:59:59Z'),
      },
      totals: {
        clinics: 2,
        professionals: 5,
        activePatients: 120,
        revenue: 15000,
      },
      clinics: [],
      alerts: [],
      comparisons: undefined,
      forecast: undefined,
      financials: undefined,
    };

    overviewUseCase.executeOrThrow.mockResolvedValue(overview);

    const response = await request(app.getHttpServer())
      .get('/management/overview')
      .set('x-tenant-id', 'tenant-fin')
      .query({
        includeFinancials: 'false',
        includeCoverageSummary: 'false',
      })
      .expect(200);

    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledTimes(1);
    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
      tenantId: 'tenant-fin',
      user: expect.objectContaining({ id: 'user-ctx' }),
      requestedClinicIds: undefined,
    });

    const input = overviewUseCase.executeOrThrow.mock.calls.at(
      -1,
    )?.[0] as ClinicManagementOverviewQuery;

    expect(input.includeFinancials).toBe(false);
    expect(input.includeCoverageSummary).toBe(false);
    expect(input.tenantId).toBe('tenant-fin');
    expect(response.body.financials).toBeUndefined();
    expect(response.body.totals.revenue).toBe(15000);
  });

  it('retorna 403 quando usuario solicita clinicas sem acesso', async () => {
    clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValue(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get('/management/overview')
      .set('x-tenant-id', 'tenant-denied')
      .query({ clinicIds: [clinicOneId] })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Usuario nao possui acesso a uma ou mais clinicas solicitadas');
      });

    expect(overviewUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  it('exporta alertas em csv respeitando filtros e escopo', async () => {
    const tenantHeader = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const clinicId = '11111111-1111-1111-1111-111111111111';
    const alert: ClinicAlert = {
      id: 'alert-export',
      clinicId,
      tenantId: tenantHeader,
      type: 'revenue_drop',
      channel: 'push',
      triggeredBy: 'system',
      triggeredAt: new Date('2025-04-05T09:00:00Z'),
      resolvedAt: new Date('2025-04-05T10:00:00Z'),
      resolvedBy: 'manager-1',
      payload: { delta: -12.5 },
    };

    alertsUseCase.executeOrThrow.mockResolvedValue([alert]);

    const response = await request(app.getHttpServer())
      .get('/management/alerts/export')
      .set('x-tenant-id', tenantHeader)
      .expect(200);

    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
      tenantId: tenantHeader,
      user: expect.objectContaining({ id: 'user-ctx' }),
      requestedClinicIds: undefined,
    });

    expect(alertsUseCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: tenantHeader,
      clinicIds: [clinicOneId],
      types: undefined,
      activeOnly: undefined,
      limit: 1000,
    });

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="clinic-alerts-.*\.csv"/,
    );

    const lines = response.text.trim().split('\n');
    expect(lines[0]).toBe(
      'alertId,clinicId,tipo,canal,disparadoPor,disparadoEm,resolvidoPor,resolvidoEm,dados',
    );
    expect(lines[1]).toContain('"alert-export"');
    expect(lines[1]).toContain(`"${clinicId}"`);
    expect(lines[1]).toContain('"revenue_drop"');
    expect(lines[1]).toContain('"push"');
    expect(lines[1]).toContain('"system"');
    expect(lines[1]).toContain('"2025-04-05T09:00:00.000Z"');
    expect(lines[1]).toContain('"manager-1"');
    expect(lines[1]).toContain('"2025-04-05T10:00:00.000Z"');
    expect(lines[1]).toContain('"{""delta"":-12.5}"');
  });

  it('retorna 403 ao exportar alertas sem escopo autorizado', async () => {
    clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get('/management/alerts/export')
      .set('x-tenant-id', tenantCtx)
      .expect(403);

    expect(alertsUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  it('permite forcar avaliacao de alertas com escopo autorizado', async () => {
    const tenantHeader = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const clinicId = clinicOneId;

    const alert: ClinicAlert = {
      id: 'alert-eval',
      clinicId,
      tenantId: tenantHeader,
      type: 'revenue_drop',
      channel: 'push',
      triggeredBy: 'system',
      triggeredAt: new Date('2025-05-10T08:00:00Z'),
      resolvedAt: undefined,
      resolvedBy: undefined,
      payload: { variation: -15 },
    };

    evaluateAlertsUseCase.executeOrThrow.mockResolvedValue({
      tenantId: tenantHeader,
      evaluatedClinics: 1,
      triggered: 1,
      skipped: 1,
      alerts: [alert],
      skippedDetails: [
        {
          clinicId: clinicTwoId,
          type: 'revenue_drop',
          reason: 'clinic_not_authorized',
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/management/alerts/evaluate')
      .set('x-tenant-id', tenantHeader)
      .send({ clinicIds: [clinicOneId, clinicTwoId] })
      .expect(201);

    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
      tenantId: tenantHeader,
      user: expect.objectContaining({ id: 'user-ctx' }),
      requestedClinicIds: [clinicOneId, clinicTwoId],
    });

    expect(evaluateAlertsUseCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: tenantHeader,
      clinicIds: [clinicOneId, clinicTwoId],
      triggeredBy: 'user-ctx',
    });

    expect(response.body).toEqual({
      tenantId: tenantHeader,
      evaluatedClinics: 1,
      triggered: 1,
      skipped: 1,
      alerts: [
        {
          id: 'alert-eval',
          clinicId,
          tenantId: tenantHeader,
          type: 'revenue_drop',
          channel: 'push',
          triggeredBy: 'system',
          triggeredAt: alert.triggeredAt.toISOString(),
          resolvedAt: undefined,
          resolvedBy: undefined,
          payload: { variation: -15 },
        },
      ],
      skippedDetails: [
        {
          clinicId: clinicTwoId,
          type: 'revenue_drop',
          reason: 'clinic_not_authorized',
        },
      ],
    });
  });

  it('exporta overview consolidada em CSV respeitando escopo', async () => {
    const overview = buildOverviewFixture();

    overviewUseCase.executeOrThrow.mockResolvedValue(overview);

    const response = await request(app.getHttpServer())
      .get('/management/overview/export')
      .set('x-tenant-id', tenantCtx)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="clinic-management-overview-/,
    );

    const lines = response.text.trim().split('\n');
    expect(lines[0]).toBe(
      'clinicId,nome,status,ultimoAtivoEm,receita,consultas,pacientesAtivos,ocupacao,satisfacao,margemContribuicao,alertasAtivos,tiposAlertasAtivos,owners,gestores,profissionais,secretarias,coverageScheduled,coverageActive,coverageCompleted30Dias,coverageUltimaAtualizacao,complianceTotal,complianceValid,complianceExpiring,complianceExpired,complianceMissing,compliancePending,complianceReview,complianceSubmitted,complianceUnknown,complianceNextExpirationTipo,complianceNextExpirationEm,complianceDocumentos',
    );
    const expectedRow = [
      `"${clinicOneId}"`,
      '"Clinic One"',
      '"active"',
      '"2025-01-15T12:00:00.000Z"',
      '"10000"',
      '"120"',
      '"80"',
      '"0.82"',
      '"4.5"',
      '"55"',
      '"1"',
      '"revenue_drop"',
      '"1"',
      '"2"',
      '"3"',
      '"1"',
      '"1"',
      '"2"',
      '"1"',
      '"2025-01-12T09:00:00.000Z"',
      '"2"',
      '"1"',
      '"1"',
      '"0"',
      '"0"',
      '"0"',
      '"0"',
      '"0"',
      '"0"',
      '"crm"',
      '"2025-02-01T12:00:00.000Z"',
      '"crm:valid@2025-02-01T12:00:00.000Z|lgpd:pending"',
    ].join(',');
    expect(lines[1]).toBe(expectedRow);

    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
      tenantId: tenantCtx,
      user: expect.objectContaining({ id: 'user-ctx' }),
      requestedClinicIds: undefined,
    });
  });

  it('exporta overview consolidada em Excel', async () => {
    const overview = buildOverviewFixture();
    overviewUseCase.executeOrThrow.mockResolvedValue(overview);

    const response = await request(app.getHttpServer())
      .get('/management/overview/export.xls')
      .set('x-tenant-id', tenantCtx)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.headers['content-type']).toContain('application/vnd.ms-excel');
    const xml = response.body.toString('utf-8');
    expect(xml).toContain('<Workbook');
    expect(xml).toContain('Clinic One');
    expect(xml).toContain('coverageScheduled');
    expect(xml).toContain('2025-01-12T09:00:00.000Z');

    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
      tenantId: tenantCtx,
      user: expect.objectContaining({ id: 'user-ctx' }),
      requestedClinicIds: undefined,
    });
  });

  it('exporta overview consolidada em PDF', async () => {
    const overview = buildOverviewFixture();
    overviewUseCase.executeOrThrow.mockResolvedValue(overview);

    const response = await request(app.getHttpServer())
      .get('/management/overview/export.pdf')
      .set('x-tenant-id', tenantCtx)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(response.body.toString('utf-8')).toContain('Clinic One');
    expect(response.body.toString('utf-8')).toContain(
      'Coberturas -> Programadas: 1 | Ativas: 2 | Concluidas \\(30d\\): 1 | Ultima atualizacao: 2025-01-12T09:00:00.000Z',
    );
  });

  it('retorna 403 ao exportar overview CSV sem acesso autorizado', async () => {
    clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get('/management/overview/export')
      .set('x-tenant-id', tenantCtx)
      .expect(403);

    expect(overviewUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  it('retorna 403 ao exportar overview Excel sem acesso autorizado', async () => {
    clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get('/management/overview/export.xls')
      .set('x-tenant-id', tenantCtx)
      .buffer()
      .parse(binaryParser)
      .expect(403);

    expect(overviewUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  it('retorna 403 ao exportar overview PDF sem acesso autorizado', async () => {
    clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get('/management/overview/export.pdf')
      .set('x-tenant-id', tenantCtx)
      .buffer()
      .parse(binaryParser)
      .expect(403);

    expect(overviewUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna overview e converte os parametros de consulta', async () => {
    const templateInfo: ClinicManagementTemplateInfo = {
      templateClinicId: 'template-1',
      lastPropagationAt: new Date('2025-01-02T10:00:00Z'),
      lastTriggeredBy: 'user-1',
      sections: [
        {
          section: 'general',
          templateVersionId: 'tv-1',
          templateVersionNumber: 3,
          propagatedVersionId: 'pv-1',
          propagatedAt: new Date('2025-01-02T10:00:00Z'),
          triggeredBy: 'user-1',
          override: {
            overrideId: 'ov-1',
            overrideVersion: 2,
            overrideHash: 'hash',
            overrideUpdatedAt: new Date('2025-01-03T08:00:00Z'),
            overrideUpdatedBy: 'user-2',
            overrideAppliedVersionId: 'cv-1',
          },
        },
      ],
    };

    const toClinicId = '44444444-4444-4444-4444-444444444444';

    const overview: ClinicManagementOverview = {
      period: {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z'),
      },
      totals: {
        clinics: 1,
        professionals: 3,
        activePatients: 40,
        revenue: 8000,
      },
      clinics: [
        {
          clinicId: toClinicId,
          name: 'Clinic B',
          slug: 'clinic-b',
          status: 'active',
          primaryOwnerId: 'owner-1',
          lastActivityAt: new Date('2025-01-31T00:00:00Z'),
          metrics: {
            revenue: 8000,
            appointments: 100,
            activePatients: 40,
            occupancyRate: 0.75,
            satisfactionScore: 4.3,
            contributionMargin: 0.25,
          },
          alerts: [
            {
              id: 'alert-b',
              clinicId: toClinicId,
              type: 'revenue_drop',
              channel: 'in_app',
              triggeredAt: new Date('2025-01-10T12:00:00Z'),
              resolvedAt: undefined,
              payload: { value: -10 },
            },
          ],
          teamDistribution: [
            { role: RolesEnum.CLINIC_OWNER, count: 1 },
            { role: RolesEnum.MANAGER, count: 1 },
            { role: RolesEnum.PROFESSIONAL, count: 2 },
            { role: RolesEnum.SECRETARY, count: 1 },
          ],
          template: templateInfo,
          coverage: {
            scheduled: 1,
            active: 2,
            completedLast30Days: 1,
            lastUpdatedAt: new Date('2025-01-12T09:00:00Z'),
          },
          financials: {
            clinicId: toClinicId,
            revenue: 8000,
            expenses: 4000,
            profit: 4000,
            margin: 50,
            contributionPercentage: 100,
          },
          compliance: {
            total: 3,
            valid: 1,
            expiring: 1,
            expired: 1,
            missing: 0,
            pending: 0,
            review: 0,
            submitted: 0,
            unknown: 0,
            nextExpiration: {
              type: 'nr-32',
              expiresAt: new Date('2025-02-05T10:00:00Z'),
            },
            documents: [
              {
                type: 'crm',
                status: 'valid',
                required: true,
                expiresAt: new Date('2025-06-01T00:00:00Z'),
              },
              { type: 'lgpd', status: 'pending', required: true, expiresAt: null },
              {
                type: 'nr-32',
                status: 'expired',
                required: true,
                expiresAt: new Date('2025-01-10T00:00:00Z'),
              },
            ],
          },
        },
      ],
      alerts: [
        {
          id: 'alert-b',
          clinicId: toClinicId,
          type: 'revenue_drop',
          channel: 'in_app',
          triggeredAt: new Date('2025-01-10T12:00:00Z'),
          resolvedAt: undefined,
          payload: { value: -10 },
        },
      ],
      comparisons: {
        period: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-01-31T23:59:59Z'),
        },
        previousPeriod: {
          start: new Date('2024-12-01T00:00:00Z'),
          end: new Date('2024-12-31T23:59:59Z'),
        },
        metrics: [
          {
            metric: 'revenue',
            entries: [
              {
                clinicId: toClinicId,
                name: 'Clinic B',
                revenue: 8000,
                revenueVariationPercentage: 5,
                appointments: 100,
                appointmentsVariationPercentage: 4,
                activePatients: 40,
                activePatientsVariationPercentage: 3,
                occupancyRate: 0.75,
                occupancyVariationPercentage: 2,
                satisfactionScore: 4.3,
                satisfactionVariationPercentage: 1,
                rankingPosition: 1,
                trendDirection: 'upward',
                trendPercentage: 5,
                benchmarkValue: 7600,
                benchmarkGapPercentage: 1.9736842105263157,
                benchmarkPercentile: 100,
              },
            ],
          },
        ],
      },
      forecast: {
        period: {
          start: new Date('2025-02-01T00:00:00Z'),
          end: new Date('2025-02-28T23:59:59Z'),
        },
        projections: [
          {
            clinicId: toClinicId,
            month: '2025-02',
            projectedRevenue: 8200,
            projectedAppointments: 105,
            projectedOccupancyRate: 0.77,
          },
        ],
      },
      financials: {
        totalRevenue: 18000,
        totalExpenses: 9000,
        totalProfit: 9000,
        averageMargin: 50,
        clinics: [
          {
            clinicId: toClinicId,
            revenue: 8000,
            expenses: 4000,
            profit: 4000,
            margin: 50,
            contributionPercentage: 100,
          },
        ],
      },
    };

    overviewUseCase.executeOrThrow.mockResolvedValue(overview);

    const response = await request(app.getHttpServer())
      .get('/management/overview')
      .set('x-tenant-id', 'tenant-1')
      .query({
        clinicIds: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
        status: ['active', 'inactive'],
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-31T23:59:59Z',
        includeForecast: 'true',
        includeComparisons: 'true',
        includeAlerts: 'false',
        includeTeamDistribution: 'true',
      })
      .expect(200);

    expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      user: expect.objectContaining({ id: 'user-ctx' }),
      requestedClinicIds: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ],
    });

    expect(overviewUseCase.executeOrThrow).toHaveBeenCalledTimes(1);
    const input = overviewUseCase.executeOrThrow.mock.calls[0][0];
    expect(input.tenantId).toBe('tenant-1');
    expect(input.filters?.clinicIds).toEqual([
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ]);
    expect(input.filters?.status).toEqual(['active', 'inactive']);
    expect(input.filters?.from).toBeInstanceOf(Date);
    expect(input.filters?.to).toBeInstanceOf(Date);
    expect(input.includeForecast).toBe(true);
    expect(input.includeComparisons).toBe(true);
    expect(input.includeAlerts).toBe(false);
    expect(input.includeTeamDistribution).toBe(true);
    expect(input.includeFinancials).toBeUndefined();
    expect(input.includeCoverageSummary).toBeUndefined();

    expect(response.body.financials?.totalRevenue).toBe(18000);
    expect(response.body.financials?.clinics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revenue: 8000,
        }),
      ]),
    );
    const clinicPayload = response.body.clinics?.[0];
    expect(clinicPayload?.compliance).toMatchObject({
      total: 3,
      valid: 1,
      expiring: 1,
      expired: 1,
    });
    expect(clinicPayload?.compliance?.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'crm' })]),
    );
    expect(clinicPayload?.coverage).toEqual({
      scheduled: 1,
      active: 2,
      completedLast30Days: 1,
      lastUpdatedAt: '2025-01-12T09:00:00.000Z',
    });
    expect(clinicPayload?.compliance?.nextExpiration).toEqual({
      type: 'nr-32',
      expiresAt: '2025-02-05T10:00:00.000Z',
    });
  });

  it('propaga excecoes do caso de uso', async () => {
    overviewUseCase.executeOrThrow.mockRejectedValue(new BadRequestException('invalid filters'));

    await request(app.getHttpServer())
      .get('/management/overview')
      .set('x-tenant-id', 'tenant-1')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('invalid filters');
      });
  });

  describe('GET /management/alerts', () => {
    it('retorna alertas e converte filtros', async () => {
      const tenantHeader = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const clinicA = '11111111-1111-1111-1111-111111111111';
      const clinicB = '22222222-2222-2222-2222-222222222222';
      const alerts: ClinicAlert[] = [
        {
          id: 'alert-1',
          clinicId: clinicA,
          tenantId: tenantHeader,
          type: 'revenue_drop',
          channel: 'in_app',
          triggeredBy: 'user-ctx',
          triggeredAt: new Date('2025-03-10T12:00:00Z'),
          resolvedAt: null,
          resolvedBy: null,
          payload: { delta: -15 },
        },
      ];

      alertsUseCase.executeOrThrow.mockResolvedValue(alerts);

      const response = await request(app.getHttpServer())
        .get('/management/alerts')
        .set('x-tenant-id', tenantHeader)
        .query({
          clinicIds: [clinicA, clinicB],
          types: ['revenue_drop'],
          activeOnly: 'true',
          limit: '5',
        })
        .expect(200);

      expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
        tenantId: tenantHeader,
        user: expect.objectContaining({ id: 'user-ctx' }),
        requestedClinicIds: [clinicA, clinicB],
      });

      expect(alertsUseCase.executeOrThrow).toHaveBeenCalledWith({
        tenantId: tenantHeader,
        clinicIds: [clinicA, clinicB],
        types: ['revenue_drop'],
        activeOnly: true,
        limit: 5,
      });
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 'alert-1', clinicId: clinicA });
    });

    it('usa tenant do contexto quando cabecalho nao e enviado', async () => {
      alertsUseCase.executeOrThrow.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/management/alerts').expect(200);

      expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
        tenantId: tenantCtx,
        user: expect.objectContaining({ id: 'user-ctx' }),
        requestedClinicIds: undefined,
      });

      expect(alertsUseCase.executeOrThrow).toHaveBeenCalledWith({
        tenantId: tenantCtx,
        clinicIds: [clinicOneId],
        types: undefined,
        activeOnly: undefined,
        limit: undefined,
      });
    });

    describe('GET /management/comparisons', () => {
      it('retorna comparativo com metricas normalizadas e aplica filtro de acesso', async () => {
        const start = '2025-04-01T00:00:00.000Z';
        const end = '2025-04-10T00:00:00.000Z';

        compareUseCase.executeOrThrow.mockResolvedValue([
          {
            clinicId: clinicOneId,
            name: 'Clinic One',
            revenue: 12000,
            revenueVariationPercentage: 8.5,
            appointments: 95,
            appointmentsVariationPercentage: 6.2,
            activePatients: 70,
            activePatientsVariationPercentage: 5.1,
            occupancyRate: 0.75,
            occupancyVariationPercentage: 3.4,
            satisfactionScore: 4.6,
            satisfactionVariationPercentage: 1.2,
            rankingPosition: 1,
            trendDirection: 'upward',
            trendPercentage: 6.2,
            benchmarkValue: 10500,
            benchmarkGapPercentage: 14.285714285714285,
            benchmarkPercentile: 100,
          },
          {
            clinicId: clinicTwoId,
            name: 'Clinic Two',
            revenue: 9000,
            revenueVariationPercentage: -2.1,
            appointments: 70,
            appointmentsVariationPercentage: -5.4,
            activePatients: 55,
            activePatientsVariationPercentage: -4.8,
            occupancyRate: 0.62,
            occupancyVariationPercentage: -3.2,
            satisfactionScore: 4.1,
            satisfactionVariationPercentage: -1.0,
            rankingPosition: 2,
            trendDirection: 'downward',
            trendPercentage: -5.4,
            benchmarkValue: 10500,
            benchmarkGapPercentage: -14.285714285714285,
            benchmarkPercentile: 50,
          },
        ]);

        clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([
          clinicOneId,
          clinicTwoId,
        ]);

        const response = await request(app.getHttpServer())
          .get('/management/comparisons')
          .set('x-tenant-id', tenantCtx)
          .query({
            clinicIds: `${clinicOneId},${clinicTwoId}`,
            metric: 'appointments',
            from: start,
            to: end,
            limit: 10,
          })
          .expect(200);

        expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
          tenantId: tenantCtx,
          user: expect.objectContaining({ id: 'user-ctx' }),
          requestedClinicIds: [clinicOneId, clinicTwoId],
        });
        expect(compareUseCase.executeOrThrow).toHaveBeenCalledWith({
          tenantId: tenantCtx,
          clinicIds: [clinicOneId, clinicTwoId],
          metric: 'appointments',
          limit: 10,
          period: {
            start: new Date(start),
            end: new Date(end),
          },
        });

        const duration = new Date(end).getTime() - new Date(start).getTime();
        const expectedPreviousEnd = new Date(new Date(start).getTime() - 1);
        const expectedPreviousStart = new Date(expectedPreviousEnd.getTime() - duration);

        expect(response.body.period.start).toBe(start);
        expect(response.body.period.end).toBe(end);
        expect(response.body.previousPeriod.start).toBe(expectedPreviousStart.toISOString());
        expect(response.body.previousPeriod.end).toBe(expectedPreviousEnd.toISOString());
        expect(response.body.metrics).toHaveLength(1);
        expect(response.body.metrics[0].metric).toBe('appointments');
        expect(response.body.metrics[0].entries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ clinicId: clinicOneId, rankingPosition: 1 }),
            expect.objectContaining({ clinicId: clinicTwoId, rankingPosition: 2 }),
          ]),
        );
      });

      it('deduplica clinicas e usa metrica padrao quando nao informada', async () => {
        compareUseCase.executeOrThrow.mockResolvedValue([]);
        clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([]);

        await request(app.getHttpServer())
          .get('/management/comparisons')
          .query({
            tenantId: tenantCtx,
            clinicIds: `${clinicOneId},${clinicOneId}`,
            from: '2025-05-01T00:00:00.000Z',
            to: '2025-05-15T00:00:00.000Z',
          })
          .expect(200);

        expect(compareUseCase.executeOrThrow).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: tenantCtx,
            clinicIds: [clinicOneId],
            metric: 'revenue',
            period: {
              start: new Date('2025-05-01T00:00:00.000Z'),
              end: new Date('2025-05-15T00:00:00.000Z'),
            },
          }),
        );
      });

      it('exporta comparativo em CSV', async () => {
        const start = '2025-06-01T00:00:00.000Z';
        const end = '2025-06-15T00:00:00.000Z';

        compareUseCase.executeOrThrow.mockResolvedValue([
          {
            clinicId: clinicOneId,
            name: 'Clinic One',
            revenue: 15000,
            revenueVariationPercentage: 12.5,
            appointments: 110,
            appointmentsVariationPercentage: 4.2,
            activePatients: 85,
            activePatientsVariationPercentage: 3.8,
            occupancyRate: 0.81,
            occupancyVariationPercentage: 2.5,
            satisfactionScore: 4.7,
            satisfactionVariationPercentage: 1.4,
            rankingPosition: 1,
            trendDirection: 'upward',
            trendPercentage: 12.5,
            benchmarkValue: 15000,
            benchmarkGapPercentage: 0,
            benchmarkPercentile: 100,
          },
        ]);

        clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([clinicOneId]);

        const response = await request(app.getHttpServer())
          .get('/management/comparisons/export')
          .set('x-tenant-id', tenantCtx)
          .query({
            tenantId: tenantCtx,
            clinicIds: clinicOneId,
            metric: 'revenue',
            from: start,
            to: end,
            limit: 5,
          })
          .buffer()
          .parse((res, callback) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        const csv = response.body.toString('utf-8');
        expect(csv).toContain('metrica,clinicId,nome,ranking');
        expect(csv).toContain('"revenue"');
        expect(csv).toContain('"Clinic One"');
        expect(compareUseCase.executeOrThrow).toHaveBeenCalledWith({
          tenantId: tenantCtx,
          clinicIds: [clinicOneId],
          metric: 'revenue',
          limit: 5,
          period: {
            start: new Date(start),
            end: new Date(end),
          },
        });
      });

      it('exporta comparativo em Excel', async () => {
        const start = '2025-07-01T00:00:00.000Z';
        const end = '2025-07-20T00:00:00.000Z';

        compareUseCase.executeOrThrow.mockResolvedValue([
          {
            clinicId: clinicOneId,
            name: 'Clinic One',
            revenue: 20000,
            revenueVariationPercentage: 15,
            appointments: 130,
            appointmentsVariationPercentage: 7.1,
            activePatients: 95,
            activePatientsVariationPercentage: 4.4,
            occupancyRate: 0.83,
            occupancyVariationPercentage: 2.8,
            satisfactionScore: 4.9,
            satisfactionVariationPercentage: 1.6,
            rankingPosition: 1,
            trendDirection: 'upward',
            trendPercentage: 15,
            benchmarkValue: 20000,
            benchmarkGapPercentage: 0,
            benchmarkPercentile: 100,
          },
        ]);

        clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([clinicOneId]);

        const response = await request(app.getHttpServer())
          .get('/management/comparisons/export.xls')
          .set('x-tenant-id', tenantCtx)
          .query({
            tenantId: tenantCtx,
            clinicIds: clinicOneId,
            metric: 'revenue',
            from: start,
            to: end,
            limit: 15,
          })
          .buffer()
          .parse((res, callback) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('application/vnd.ms-excel');
        const xml = response.body.toString('utf-8');
        expect(xml).toContain('<Workbook');
        expect(xml).toContain('Clinic One');
        expect(compareUseCase.executeOrThrow).toHaveBeenCalledWith({
          tenantId: tenantCtx,
          clinicIds: [clinicOneId],
          metric: 'revenue',
          limit: 15,
          period: {
            start: new Date(start),
            end: new Date(end),
          },
        });
      });

      it('exporta comparativo em PDF', async () => {
        const start = '2025-08-01T00:00:00.000Z';
        const end = '2025-08-15T00:00:00.000Z';

        compareUseCase.executeOrThrow.mockResolvedValue([
          {
            clinicId: clinicOneId,
            name: 'Clinic One',
            revenue: 18000,
            revenueVariationPercentage: 9.2,
            appointments: 125,
            appointmentsVariationPercentage: 4.0,
            activePatients: 88,
            activePatientsVariationPercentage: 3.3,
            occupancyRate: 0.8,
            occupancyVariationPercentage: 1.9,
            satisfactionScore: 4.6,
            satisfactionVariationPercentage: 1.1,
            rankingPosition: 1,
            trendDirection: 'upward',
            trendPercentage: 9.2,
            benchmarkValue: 18000,
            benchmarkGapPercentage: 0,
            benchmarkPercentile: 100,
          },
        ]);

        clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([clinicOneId]);

        const response = await request(app.getHttpServer())
          .get('/management/comparisons/export.pdf')
          .set('x-tenant-id', tenantCtx)
          .query({
            tenantId: tenantCtx,
            clinicIds: clinicOneId,
            metric: 'revenue',
            from: start,
            to: end,
            limit: 25,
          })
          .buffer()
          .parse((res, callback) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('application/pdf');
        expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
        expect(response.body.toString('utf-8')).toContain('Comparativo de Clinicas');
        expect(compareUseCase.executeOrThrow).toHaveBeenCalledWith({
          tenantId: tenantCtx,
          clinicIds: [clinicOneId],
          metric: 'revenue',
          limit: 25,
          period: {
            start: new Date(start),
            end: new Date(end),
          },
        });
      });

      it('retorna 403 ao exportar comparativo CSV sem acesso autorizado', async () => {
        clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
          new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
        );

        await request(app.getHttpServer())
          .get('/management/comparisons/export')
          .set('x-tenant-id', tenantCtx)
          .query({
            tenantId: tenantCtx,
            clinicIds: clinicOneId,
            metric: 'revenue',
            from: '2025-07-01T00:00:00.000Z',
            to: '2025-07-20T00:00:00.000Z',
            limit: 5,
          })
          .buffer()
          .parse(binaryParser)
          .expect(403);

        expect(compareUseCase.executeOrThrow).not.toHaveBeenCalled();
      });

      it('retorna 403 ao exportar comparativo Excel sem acesso autorizado', async () => {
        clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
          new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
        );

        await request(app.getHttpServer())
          .get('/management/comparisons/export.xls')
          .set('x-tenant-id', tenantCtx)
          .query({
            tenantId: tenantCtx,
            clinicIds: clinicOneId,
            metric: 'revenue',
            from: '2025-07-01T00:00:00.000Z',
            to: '2025-07-20T00:00:00.000Z',
            limit: 5,
          })
          .buffer()
          .parse(binaryParser)
          .expect(403);

        expect(compareUseCase.executeOrThrow).not.toHaveBeenCalled();
      });

      it('retorna 403 ao exportar comparativo PDF sem acesso autorizado', async () => {
        clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
          new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
        );

        await request(app.getHttpServer())
          .get('/management/comparisons/export.pdf')
          .set('x-tenant-id', tenantCtx)
          .query({
            tenantId: tenantCtx,
            clinicIds: clinicOneId,
            metric: 'revenue',
            from: '2025-07-01T00:00:00.000Z',
            to: '2025-07-20T00:00:00.000Z',
            limit: 5,
          })
          .buffer()
          .parse(binaryParser)
          .expect(403);

        expect(compareUseCase.executeOrThrow).not.toHaveBeenCalled();
      });
    });
  });

  describe('GET /management/professional-coverages', () => {
    const coverageFixture: ClinicProfessionalCoverage = {
      id: 'coverage-list',
      tenantId: tenantCtx,
      clinicId: clinicOneId,
      professionalId: 'prof-list',
      coverageProfessionalId: 'backup-list',
      startAt: new Date('2025-03-01T08:00:00Z'),
      endAt: new Date('2025-03-01T18:00:00Z'),
      status: 'scheduled',
      reason: 'Ferias',
      notes: undefined,
      metadata: { source: 'list-test' },
      createdBy: 'manager-ctx',
      createdAt: new Date('2025-02-15T10:00:00Z'),
      updatedBy: 'manager-ctx',
      updatedAt: new Date('2025-02-15T10:00:00Z'),
      cancelledAt: undefined,
      cancelledBy: undefined,
    };

    it('lista coberturas com filtros aplicados', async () => {
      listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
        data: [coverageFixture],
        total: 1,
        page: 1,
        limit: 25,
      });

      clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([clinicOneId]);

      const response = await request(app.getHttpServer())
        .get('/management/professional-coverages')
        .set('x-tenant-id', tenantCtx)
        .query({ clinicIds: clinicOneId, statuses: 'scheduled,active' })
        .expect(200);

      expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
        tenantId: tenantCtx,
        user: expect.objectContaining({ id: 'user-ctx' }),
        requestedClinicIds: [clinicOneId],
      });

      expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: tenantCtx,
          clinicIds: [clinicOneId],
          statuses: ['scheduled', 'active'],
        }),
      );

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].id).toBe(coverageFixture.id);
    });

    it('retorna 403 quando usuario nao possui acesso as clinicas solicitadas', async () => {
      clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
        new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
      );

      await request(app.getHttpServer())
        .get('/management/professional-coverages')
        .set('x-tenant-id', tenantCtx)
        .query({ clinicIds: clinicTwoId })
        .expect(403);

      expect(listCoveragesUseCase.executeOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('GET /management/professional-coverages/export', () => {
    it('exporta coberturas autorizadas em CSV', async () => {
      const coverage: ClinicProfessionalCoverage = {
        id: 'coverage-ctx',
        tenantId: tenantCtx,
        clinicId: clinicOneId,
        professionalId: 'prof-ctx',
        coverageProfessionalId: 'backup-ctx',
        startAt: new Date('2025-02-10T09:00:00Z'),
        endAt: new Date('2025-02-10T18:00:00Z'),
        status: 'scheduled',
        reason: 'Ferias',
        notes: 'Cobertura integral',
        createdBy: 'user-ctx',
        createdAt: new Date('2025-01-25T10:00:00Z'),
        updatedBy: 'user-ctx',
        updatedAt: new Date('2025-01-25T10:00:00Z'),
        metadata: { source: 'integration-test' },
      };

      listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
        data: [coverage],
        total: 1,
        page: 1,
        limit: 200,
      });

      const response = await request(app.getHttpServer())
        .get('/management/professional-coverages/export')
        .set('x-tenant-id', tenantCtx)
        .query({ statuses: 'scheduled,active' })
        .expect(200);

      expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: tenantCtx,
          clinicIds: [clinicOneId],
          statuses: ['scheduled', 'active'],
          page: 1,
          limit: 200,
        }),
      );

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('clinic-professional-coverages');
      expect(response.text).toContain('coverageId');
      expect(response.text).toContain(coverage.id);
    });

    it('respeita filtro clinicId e valida acesso', async () => {
      listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 200,
      });

      clinicAccessService.resolveAuthorizedClinicIds.mockResolvedValueOnce([clinicTwoId]);

      await request(app.getHttpServer())
        .get('/management/professional-coverages/export')
        .set('x-tenant-id', tenantCtx)
        .query({ clinicId: clinicTwoId })
        .expect(200);

      expect(clinicAccessService.resolveAuthorizedClinicIds).toHaveBeenCalledWith({
        tenantId: tenantCtx,
        user: expect.objectContaining({ id: 'user-ctx' }),
        requestedClinicIds: [clinicTwoId],
      });

      expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: tenantCtx,
          clinicIds: [clinicTwoId],
        }),
      );
    });

    it('retorna 403 quando usuario nao possui acesso as clinicas solicitadas', async () => {
      clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
        new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
      );

      await request(app.getHttpServer())
        .get('/management/professional-coverages/export')
        .set('x-tenant-id', tenantCtx)
        .expect(403);

      expect(listCoveragesUseCase.executeOrThrow).not.toHaveBeenCalled();
    });

    it('retorna 403 no export.xls quando usuario nao possui acesso', async () => {
      clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
        new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
      );

      await request(app.getHttpServer())
        .get('/management/professional-coverages/export.xls')
        .set('x-tenant-id', tenantCtx)
        .buffer()
        .parse(binaryParser)
        .expect(403);

      expect(listCoveragesUseCase.executeOrThrow).not.toHaveBeenCalled();
    });

    it('retorna 403 no export.pdf quando usuario nao possui acesso', async () => {
      clinicAccessService.resolveAuthorizedClinicIds.mockRejectedValueOnce(
        new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
      );

      await request(app.getHttpServer())
        .get('/management/professional-coverages/export.pdf')
        .set('x-tenant-id', tenantCtx)
        .buffer()
        .parse(binaryParser)
        .expect(403);

      expect(listCoveragesUseCase.executeOrThrow).not.toHaveBeenCalled();
    });

    it('exporta coberturas em Excel', async () => {
      listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 200,
      });

      const response = await request(app.getHttpServer())
        .get('/management/professional-coverages/export.xls')
        .set('x-tenant-id', tenantCtx)
        .buffer()
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.ms-excel');
      expect(response.body.toString('utf-8')).toContain('<Workbook');
    });

    it('exporta coberturas em PDF', async () => {
      listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 200,
      });

      const response = await request(app.getHttpServer())
        .get('/management/professional-coverages/export.pdf')
        .set('x-tenant-id', tenantCtx)
        .buffer()
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('PATCH /management/alerts/:alertId/resolve', () => {
    it('resolve alerta e retorna dados atualizados', async () => {
      const tenantHeader = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const clinicId = '33333333-3333-3333-3333-333333333333';
      const alertId = '55555555-5555-5555-5555-555555555555';
      const resolved: ClinicAlert = {
        id: alertId,
        clinicId,
        tenantId: tenantHeader,
        type: 'revenue_drop',
        channel: 'in_app',
        triggeredBy: 'user-ctx',
        triggeredAt: new Date('2025-03-10T12:00:00Z'),
        resolvedAt: new Date('2025-03-11T10:00:00Z'),
        resolvedBy: 'user-ctx',
        payload: { delta: -15 },
      };

      resolveAlertUseCase.executeOrThrow.mockResolvedValue(resolved);
      clinicAccessService.assertAlertAccess.mockResolvedValue(resolved);

      const response = await request(app.getHttpServer())
        .patch(`/management/alerts/${alertId}/resolve`)
        .set('x-tenant-id', tenantHeader)
        .send({ resolvedAt: '2025-03-11T10:00:00Z' })
        .expect(200);

      expect(clinicAccessService.assertAlertAccess).toHaveBeenCalledWith({
        tenantId: tenantHeader,
        alertId,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });
      expect(response.body.id).toBe(alertId);
      expect(response.body.resolvedAt).toBe('2025-03-11T10:00:00.000Z');

      expect(resolveAlertUseCase.executeOrThrow).toHaveBeenCalledWith({
        tenantId: tenantHeader,
        alertId,
        resolvedBy: 'user-ctx',
        resolvedAt: new Date('2025-03-11T10:00:00Z'),
      });
    });
  });

  describe('POST /management/professionals/transfer', () => {
    it('executa a transferencia e retorna os vinculos atualizados', async () => {
      const effectiveDate = new Date('2025-02-01T10:00:00Z');
      const tenantHeader = '11111111-1111-1111-1111-111111111111';
      const professionalId = '22222222-2222-2222-2222-222222222222';
      const fromClinicId = '33333333-3333-3333-3333-333333333333';
      const toClinicId = '44444444-4444-4444-4444-444444444444';
      const fromMembership: ClinicMember = {
        id: 'member-from',
        clinicId: fromClinicId,
        tenantId: tenantCtx,
        userId: professionalId,
        role: RolesEnum.PROFESSIONAL,
        status: 'inactive',
        scope: [fromClinicId],
        preferences: { notifications: { email: true } },
        joinedAt: new Date('2024-06-01T09:00:00Z'),
        suspendedAt: null,
        endedAt: effectiveDate,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: effectiveDate,
      };

      const toMembership: ClinicMember = {
        ...fromMembership,
        id: 'member-to',
        clinicId: toClinicId,
        status: 'active',
        scope: [toClinicId],
        suspendedAt: null,
        endedAt: null,
        joinedAt: effectiveDate,
      };

      transferUseCase.executeOrThrow.mockResolvedValue({
        fromMembership,
        toMembership,
        effectiveDate,
        transferPatients: true,
      });

      await request(app.getHttpServer())
        .post('/management/professionals/transfer')
        .set('x-tenant-id', tenantHeader)
        .send({
          tenantId: tenantHeader,
          professionalId,
          fromClinicId,
          toClinicId,
          effectiveDate: effectiveDate.toISOString(),
          transferPatients: true,
        })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            effectiveDate: effectiveDate.toISOString(),
            transferPatients: true,
            fromMembership: {
              id: 'member-from',
              clinicId: fromClinicId,
              tenantId: tenantCtx,
              userId: professionalId,
              role: RolesEnum.PROFESSIONAL,
              status: 'inactive',
            },
            toMembership: {
              id: 'member-to',
              clinicId: toClinicId,
              status: 'active',
            },
          });
        });
      expect(clinicAccessService.assertClinicAccess).toHaveBeenNthCalledWith(1, {
        clinicId: fromClinicId,
        tenantId: tenantHeader,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });
      expect(clinicAccessService.assertClinicAccess).toHaveBeenNthCalledWith(2, {
        clinicId: toClinicId,
        tenantId: tenantHeader,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });

      expect(transferUseCase.executeOrThrow).toHaveBeenCalledWith({
        tenantId: tenantHeader,
        professionalId,
        fromClinicId,
        toClinicId,
        effectiveDate,
        transferPatients: true,
        performedBy: 'user-ctx',
      });
    });

    it('usa tenant do contexto quando nao informado no corpo', async () => {
      const effectiveDate = new Date('2025-03-05T12:00:00Z');
      const professionalId = '55555555-5555-5555-5555-555555555555';
      const fromClinicId = '66666666-6666-6666-6666-666666666666';
      const toClinicId = '77777777-7777-7777-7777-777777777777';

      transferUseCase.executeOrThrow.mockResolvedValue({
        fromMembership: {} as ClinicMember,
        toMembership: {} as ClinicMember,
        effectiveDate,
        transferPatients: false,
      });

      await request(app.getHttpServer())
        .post('/management/professionals/transfer')
        .send({
          professionalId,
          fromClinicId,
          toClinicId,
          effectiveDate: effectiveDate.toISOString(),
        })
        .expect(201);
      expect(clinicAccessService.assertClinicAccess).toHaveBeenNthCalledWith(1, {
        clinicId: fromClinicId,
        tenantId: tenantCtx,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });
      expect(clinicAccessService.assertClinicAccess).toHaveBeenNthCalledWith(2, {
        clinicId: toClinicId,
        tenantId: tenantCtx,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });

      expect(transferUseCase.executeOrThrow).toHaveBeenCalledWith({
        tenantId: tenantCtx,
        professionalId,
        fromClinicId,
        toClinicId,
        effectiveDate,
        transferPatients: false,
        performedBy: 'user-ctx',
      });
    });

    it('propaga erro do caso de uso', async () => {
      transferUseCase.executeOrThrow.mockRejectedValue(
        new BadRequestException('transfer forbidden'),
      );

      const tenantHeader = '88888888-8888-8888-8888-888888888888';
      const professionalId = '99999999-9999-9999-9999-999999999999';
      const fromClinicId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const toClinicId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      await request(app.getHttpServer())
        .post('/management/professionals/transfer')
        .set('x-tenant-id', tenantHeader)
        .send({
          tenantId: tenantHeader,
          professionalId,
          fromClinicId,
          toClinicId,
          effectiveDate: new Date('2025-04-01T08:00:00Z').toISOString(),
        })
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe('transfer forbidden');
        });
      expect(clinicAccessService.assertClinicAccess).toHaveBeenNthCalledWith(1, {
        clinicId: fromClinicId,
        tenantId: tenantHeader,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });
      expect(clinicAccessService.assertClinicAccess).toHaveBeenNthCalledWith(2, {
        clinicId: toClinicId,
        tenantId: tenantHeader,
        user: expect.objectContaining({ id: 'user-ctx' }),
      });
    });
  });
});
