import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
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
import { ClinicManagementController } from '../../../src/modules/clinic/api/controllers/clinic-management.controller';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';

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
  const tenantCtx = '00000000-0000-0000-0000-000000000000';

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
      })
      .expect(200);

    const input = overviewUseCase.executeOrThrow.mock.calls.at(
      -1,
    )?.[0] as ClinicManagementOverviewQuery;

    expect(input.includeFinancials).toBe(false);
    expect(input.tenantId).toBe('tenant-fin');
    expect(response.body.financials).toBeUndefined();
    expect(response.body.totals.revenue).toBe(15000);
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
          financials: {
            clinicId: toClinicId,
            revenue: 8000,
            expenses: 4000,
            profit: 4000,
            margin: 50,
            contributionPercentage: 100,
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

    expect(response.body.financials?.totalRevenue).toBe(18000);
    expect(response.body.financials?.clinics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revenue: 8000,
        }),
      ]),
    );
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

      expect(alertsUseCase.executeOrThrow).toHaveBeenCalledWith({
        tenantId: tenantCtx,
        clinicIds: undefined,
        types: undefined,
        activeOnly: undefined,
        limit: undefined,
      });
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

      await request(app.getHttpServer())
        .patch(`/management/alerts/${alertId}/resolve`)
        .set('x-tenant-id', tenantHeader)
        .send({ resolvedAt: '2025-03-11T10:00:00Z' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(alertId);
          expect(body.resolvedAt).toBe('2025-03-11T10:00:00.000Z');
        });

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
    });
  });
});
