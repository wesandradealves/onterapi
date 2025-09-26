import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { PatientsController } from '@modules/patients/api/controllers/patients.controller';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ICreatePatientUseCase } from '@domain/patients/interfaces/use-cases/create-patient.use-case.interface';
import { IListPatientsUseCase } from '@domain/patients/interfaces/use-cases/list-patients.use-case.interface';
import { IGetPatientUseCase } from '@domain/patients/interfaces/use-cases/get-patient.use-case.interface';
import { IUpdatePatientUseCase } from '@domain/patients/interfaces/use-cases/update-patient.use-case.interface';
import { ITransferPatientUseCase } from '@domain/patients/interfaces/use-cases/transfer-patient.use-case.interface';
import { IArchivePatientUseCase } from '@domain/patients/interfaces/use-cases/archive-patient.use-case.interface';
import { IExportPatientsUseCase } from '@domain/patients/interfaces/use-cases/export-patients.use-case.interface';
import {
  Patient,
  PatientListItem,
  PatientStatus,
  PatientRiskLevel,
} from '@domain/patients/types/patient.types';
import { Result } from '@shared/types/result.type';
import { PatientPresenter } from '@modules/patients/api/presenters/patient.presenter';

interface UseCaseMock<TInput, TOutput> {
  execute: jest.Mock<Promise<Result<TOutput>>, [TInput]>;
}

describe('PatientsController (integration)', () => {
  let app: INestApplication;

  const currentUser: ICurrentUser = {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: RolesEnum.CLINIC_OWNER,
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    metadata: {},
  };

  const createMock = <TInput, TOutput>(): UseCaseMock<TInput, TOutput> => ({
    execute: jest.fn(),
  });

  const useCases = {
    create: createMock<any, Patient>(),
    list: createMock<any, { data: PatientListItem[]; total: number }>(),
    get: createMock<any, any>(),
    update: createMock<any, Patient>(),
    transfer: createMock<any, Patient>(),
    archive: createMock<any, void>(),
    export: createMock<any, { fileUrl: string }>(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        { provide: ICreatePatientUseCase, useValue: useCases.create },
        { provide: IListPatientsUseCase, useValue: useCases.list },
        { provide: IGetPatientUseCase, useValue: useCases.get },
        { provide: IUpdatePatientUseCase, useValue: useCases.update },
        { provide: ITransferPatientUseCase, useValue: useCases.transfer },
        { provide: IArchivePatientUseCase, useValue: useCases.archive },
        { provide: IExportPatientsUseCase, useValue: useCases.export },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    currentUser.role = RolesEnum.CLINIC_OWNER;
    currentUser.tenantId = 'tenant-1';
    currentUser.metadata = {};
  });

  it('lista pacientes convertendo resposta via presenter', async () => {
    const now = new Date('2025-01-01T00:00:00.000Z');
    const listItem: PatientListItem = {
      id: 'patient-1',
      slug: 'paciente-1',
      fullName: 'Paciente 1',
      status: 'active' as PatientStatus,
      riskLevel: 'medium' as PatientRiskLevel,
      cpfMasked: '111.***.***.11',
      contact: { email: 'p1@example.com', phone: '11999990000', whatsapp: '11999990000' },
      professionalId: 'professional-1',
      professionalName: 'Dra. Example',
      nextAppointmentAt: now,
      lastAppointmentAt: now,
      tags: [{ id: 'vip', label: 'VIP', color: '#f00' }],
      revenueTotal: 1500,
      createdAt: now,
      updatedAt: now,
    };

    useCases.list.execute.mockResolvedValue(
      Promise.resolve({ data: { data: [listItem], total: 1 } }),
    );

    await request(app.getHttpServer()).get('/patients').expect(200).expect(({ body }) => {
      expect(body.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toEqual(PatientPresenter.listItem(listItem));
    });

    expect(useCases.list.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      requesterId: currentUser.id,
      requesterRole: currentUser.role,
      filters: {
        query: undefined,
        status: undefined,
        riskLevel: undefined,
        assignedProfessionalIds: undefined,
        tags: undefined,
        quickFilter: undefined,
      },
      page: undefined,
      limit: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it('impede override de tenant para roles nao privilegiadas', async () => {
    currentUser.role = RolesEnum.PROFESSIONAL;

    await request(app.getHttpServer())
      .get('/patients')
      .set('x-tenant-id', 'tenant-externo')
      .expect(403);

    expect(useCases.list.execute).not.toHaveBeenCalled();
  });

  it('cria paciente com payload normalizado e retorna resumo', async () => {
    const now = new Date('2025-02-01T10:00:00.000Z');
    const patient: Patient = {
      id: 'patient-123',
      slug: 'patient-123',
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
      fullName: 'Paciente Teste',
      cpf: '39053344705',
      status: 'active' as PatientStatus,
      emailVerified: true,
      contact: { email: 'paciente@example.com', phone: '11999999999', whatsapp: '11999999999' },
      createdAt: now,
      updatedAt: now,
    } as Patient;

    useCases.create.execute.mockResolvedValue({ data: patient });

    await request(app.getHttpServer())
      .post('/patients')
      .set('x-tenant-id', 'tenant-1')
      .send({
        fullName: 'Paciente Teste',
        cpf: '39053344705',
        birthDate: '2025-02-01T10:00:00.000Z',
        email: 'paciente@example.com',
        phone: '11999999999',
        whatsapp: '11999999999',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.fullName).toBe('Paciente Teste');
        expect(body.cpfMasked).toBe('390.***.***.05');
        expect(body.createdAt).toBe(now.toISOString());
      });

    expect(useCases.create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        createdBy: currentUser.id,
        requesterRole: currentUser.role,
        birthDate: new Date('2025-02-01T10:00:00.000Z'),
        contact: expect.objectContaining({ email: 'paciente@example.com' }),
      }),
    );
  });

  it('retorna 400 quando payload invalido viola schema', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .send({
        fullName: 'A',
        cpf: '123',
      })
      .expect(400);

    expect(useCases.create.execute).not.toHaveBeenCalled();
  });
});

