import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '../../../src/domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '../../../src/domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken } from '../../../src/domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';
import { IGetClinicProfessionalPolicyUseCase as IGetClinicProfessionalPolicyUseCaseToken } from '../../../src/domain/clinic/interfaces/use-cases/get-clinic-professional-policy.use-case.interface';
import {
  ICreateClinicProfessionalCoverageUseCase,
  ICreateClinicProfessionalCoverageUseCase as ICreateClinicProfessionalCoverageUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/create-clinic-professional-coverage.use-case.interface';
import {
  IListClinicProfessionalCoveragesUseCase,
  IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import {
  ICancelClinicProfessionalCoverageUseCase,
  ICancelClinicProfessionalCoverageUseCase as ICancelClinicProfessionalCoverageUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/cancel-clinic-professional-coverage.use-case.interface';
import { ClinicMemberController } from '../../../src/modules/clinic/api/controllers/clinic-member.controller';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';
import { ClinicScopeGuard } from '../../../src/modules/clinic/guards/clinic-scope.guard';
import { ClinicProfessionalCoverage } from '../../../src/domain/clinic/types/clinic.types';
import { ClinicManagementExportService } from '../../../src/modules/clinic/services/clinic-management-export.service';

class AllowAuthGuard {
  canActivate(context: any): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'user-ctx',
      tenantId: '00000000-0000-0000-0000-000000000000',
      role: RolesEnum.CLINIC_OWNER,
    };
    return true;
  }
}

const binaryParser = (res: any, callback: any) => {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
};

describe('ClinicMemberController - professional coverages (integration)', () => {
  let app: INestApplication;
  let createCoverageUseCase: jest.Mocked<ICreateClinicProfessionalCoverageUseCase>;
  let listCoveragesUseCase: jest.Mocked<IListClinicProfessionalCoveragesUseCase>;
  let cancelCoverageUseCase: jest.Mocked<ICancelClinicProfessionalCoverageUseCase>;

  const tenantId = '00000000-0000-0000-0000-000000000000';
  const clinicId = '11111111-1111-1111-1111-111111111111';

  const coverageFixture: ClinicProfessionalCoverage = {
    id: 'coverage-1',
    tenantId,
    clinicId,
    professionalId: '22222222-2222-2222-2222-222222222222',
    coverageProfessionalId: '33333333-3333-3333-3333-333333333333',
    startAt: new Date('2025-02-01T09:00:00Z'),
    endAt: new Date('2025-02-01T18:00:00Z'),
    status: 'scheduled',
    reason: 'Ferias',
    notes: undefined,
    metadata: {},
    createdBy: 'user-ctx',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedBy: 'user-ctx',
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    cancelledAt: undefined,
    cancelledBy: undefined,
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicMemberController],
      providers: [
        { provide: IListClinicMembersUseCaseToken, useValue: { executeOrThrow: jest.fn() } },
        { provide: IManageClinicMemberUseCaseToken, useValue: { executeOrThrow: jest.fn() } },
        {
          provide: ICheckClinicProfessionalFinancialClearanceUseCaseToken,
          useValue: { executeOrThrow: jest.fn() },
        },
        {
          provide: IGetClinicProfessionalPolicyUseCaseToken,
          useValue: { executeOrThrow: jest.fn() },
        },
        {
          provide: ICreateClinicProfessionalCoverageUseCaseToken,
          useValue: { executeOrThrow: jest.fn() },
        },
        {
          provide: IListClinicProfessionalCoveragesUseCaseToken,
          useValue: { executeOrThrow: jest.fn() },
        },
        {
          provide: ICancelClinicProfessionalCoverageUseCaseToken,
          useValue: { executeOrThrow: jest.fn() },
        },
        ClinicManagementExportService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAuthGuard)
      .overrideGuard(ClinicScopeGuard)
      .useClass(AllowAuthGuard as any)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    createCoverageUseCase = moduleRef.get<ICreateClinicProfessionalCoverageUseCase>(
      ICreateClinicProfessionalCoverageUseCaseToken,
    ) as jest.Mocked<ICreateClinicProfessionalCoverageUseCase>;
    listCoveragesUseCase = moduleRef.get<IListClinicProfessionalCoveragesUseCase>(
      IListClinicProfessionalCoveragesUseCaseToken,
    ) as jest.Mocked<IListClinicProfessionalCoveragesUseCase>;
    cancelCoverageUseCase = moduleRef.get<ICancelClinicProfessionalCoverageUseCase>(
      ICancelClinicProfessionalCoverageUseCaseToken,
    ) as jest.Mocked<ICancelClinicProfessionalCoverageUseCase>;
  });

  beforeEach(() => {
    createCoverageUseCase.executeOrThrow.mockReset();
    listCoveragesUseCase.executeOrThrow.mockReset();
    cancelCoverageUseCase.executeOrThrow.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /clinics/:id/members/professional-coverages cria cobertura', async () => {
    createCoverageUseCase.executeOrThrow.mockResolvedValue(coverageFixture);

    const response = await request(app.getHttpServer())
      .post(`/clinics/${clinicId}/members/professional-coverages`)
      .set('x-tenant-id', tenantId)
      .send({
        professionalId: coverageFixture.professionalId,
        coverageProfessionalId: coverageFixture.coverageProfessionalId,
        startAt: coverageFixture.startAt.toISOString(),
        endAt: coverageFixture.endAt.toISOString(),
        reason: 'Ferias',
      })
      .expect(201);

    expect(createCoverageUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        clinicId,
        professionalId: coverageFixture.professionalId,
        coverageProfessionalId: coverageFixture.coverageProfessionalId,
        performedBy: 'user-ctx',
      }),
    );

    expect(response.body).toMatchObject({
      id: coverageFixture.id,
      status: 'scheduled',
      reason: 'Ferias',
    });
  });

  it('GET /clinics/:id/members/professional-coverages lista coberturas', async () => {
    listCoveragesUseCase.executeOrThrow.mockResolvedValue({
      data: [coverageFixture],
      total: 1,
      page: 1,
      limit: 25,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages`)
      .set('x-tenant-id', tenantId)
      .query({
        professionalId: coverageFixture.professionalId,
        statuses: 'scheduled,active',
        from: '2025-02-01T00:00:00Z',
        to: '2025-02-02T00:00:00Z',
        includeCancelled: 'false',
        page: 2,
        limit: 10,
      })
      .expect(200);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        clinicId,
        professionalId: coverageFixture.professionalId,
        statuses: ['scheduled', 'active'],
        includeCancelled: false,
        page: 2,
        limit: 10,
      }),
    );

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].id).toBe(coverageFixture.id);
  });

  it('PATCH /clinics/:id/members/professional-coverages/:coverageId/cancel cancela cobertura', async () => {
    cancelCoverageUseCase.executeOrThrow.mockResolvedValue({
      ...coverageFixture,
      status: 'cancelled',
      cancelledAt: new Date('2025-01-25T12:00:00Z'),
      cancelledBy: 'user-ctx',
      updatedAt: new Date('2025-01-25T12:00:00Z'),
    });

    const response = await request(app.getHttpServer())
      .patch(`/clinics/${clinicId}/members/professional-coverages/${coverageFixture.id}/cancel`)
      .set('x-tenant-id', tenantId)
      .send({ cancellationReason: 'Encerrado' })
      .expect(200);

    expect(cancelCoverageUseCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId,
      clinicId,
      coverageId: coverageFixture.id,
      cancelledBy: 'user-ctx',
      cancellationReason: 'Encerrado',
    });

    expect(response.body.status).toBe('cancelled');
    expect(response.body.cancelledBy).toBe('user-ctx');
  });

  it('GET /clinics/:id/members/professional-coverages/export retorna CSV com as coberturas', async () => {
    listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
      data: [coverageFixture],
      total: 1,
      page: 1,
      limit: 200,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages/export`)
      .set('x-tenant-id', tenantId)
      .expect(200);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        clinicId,
      }),
    );
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment; filename="clinic-');
    expect(response.text).toContain('coverageId');
    expect(response.text).toContain(coverageFixture.id);
  });

  it('GET /clinics/:id/members/professional-coverages/export.xls retorna planilha em buffer', async () => {
    listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
      data: [coverageFixture],
      total: 1,
      page: 1,
      limit: 200,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages/export.xls`)
      .set('x-tenant-id', tenantId)
      .buffer()
      .parse(binaryParser)
      .expect(200);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        clinicId,
        page: 1,
        limit: 200,
      }),
    );
    expect(response.headers['content-type']).toContain('application/vnd.ms-excel');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.toString('utf-8')).toContain(
      '<Worksheet ss:Name="ProfessionalCoverages">',
    );
  });

  it('GET /clinics/:id/members/professional-coverages/export.pdf retorna resumo textual', async () => {
    listCoveragesUseCase.executeOrThrow.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 200,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages/export.pdf`)
      .set('x-tenant-id', tenantId)
      .buffer()
      .parse(binaryParser)
      .expect(200);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        clinicId,
        page: 1,
        limit: 200,
      }),
    );
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body.toString('utf-8')).toContain('Coberturas temporarias de profissionais');
    expect(response.body.toString('utf-8')).toContain('Nenhuma cobertura encontrada');
  });

  it('GET /clinics/:id/members/professional-coverages/export retorna 403 quando o use case nega acesso', async () => {
    listCoveragesUseCase.executeOrThrow.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages/export`)
      .set('x-tenant-id', tenantId)
      .expect(403);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledTimes(1);
  });

  it('GET /clinics/:id/members/professional-coverages/export.xls retorna 403 quando o use case nega acesso', async () => {
    listCoveragesUseCase.executeOrThrow.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages/export.xls`)
      .set('x-tenant-id', tenantId)
      .buffer()
      .parse(binaryParser)
      .expect(403);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledTimes(1);
  });

  it('GET /clinics/:id/members/professional-coverages/export.pdf retorna 403 quando o use case nega acesso', async () => {
    listCoveragesUseCase.executeOrThrow.mockRejectedValueOnce(
      new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas'),
    );

    await request(app.getHttpServer())
      .get(`/clinics/${clinicId}/members/professional-coverages/export.pdf`)
      .set('x-tenant-id', tenantId)
      .buffer()
      .parse(binaryParser)
      .expect(403);

    expect(listCoveragesUseCase.executeOrThrow).toHaveBeenCalledTimes(1);
  });
});
