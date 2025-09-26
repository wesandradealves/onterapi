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
  IPatientRepository,
  IPatientRepositoryToken,
} from '@domain/patients/interfaces/repositories/patient.repository.interface';
import {
  ArchivePatientInput,
  CreatePatientInput,
  Patient,
  PatientExportRequest,
  PatientListFilters,
  PatientListItem,
  PatientSummary,
  PatientTimelineEntry,
  TransferPatientInput,
  UpdatePatientInput,
} from '@domain/patients/types/patient.types';
import { ListPatientsUseCase } from '@modules/patients/use-cases/list-patients.use-case';
import { GetPatientUseCase } from '@modules/patients/use-cases/get-patient.use-case';
import { PatientAISuggestionsService } from '@infrastructure/patients/services/patient-ai-suggestions.service';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { PatientPresenter } from '@modules/patients/api/presenters/patient.presenter';

class InMemoryPatientRepository implements IPatientRepository {
  public lastFindAllParams?: {
    tenantId: string;
    filters?: PatientListFilters;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };

  constructor(
    private readonly patients: Patient[],
    private readonly listItems: PatientListItem[],
    private readonly summaries: Record<string, PatientSummary>,
    private readonly timelines: Record<string, PatientTimelineEntry[]>,
  ) {}

  async create(_data: CreatePatientInput): Promise<Patient> {
    throw new Error('Not implemented');
  }

  async findById(_tenantId: string, _patientId: string): Promise<Patient | null> {
    throw new Error('Not implemented');
  }

  async findBySlug(tenantId: string, slug: string): Promise<Patient | null> {
    return (
      this.patients.find((patient) => patient.tenantId === tenantId && patient.slug === slug) ??
      null
    );
  }

  async findSummary(_tenantId: string, patientId: string): Promise<PatientSummary> {
    return this.summaries[patientId];
  }

  async findTimeline(
    _tenantId: string,
    patientId: string,
    _options?: { limit?: number; before?: Date },
  ): Promise<PatientTimelineEntry[]> {
    return this.timelines[patientId] ?? [];
  }

  async findAll(params: {
    tenantId: string;
    filters?: PatientListFilters;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientListItem[]; total: number }> {
    this.lastFindAllParams = params;
    const filtered = this.listItems.filter((item) =>
      item.slug.includes(params.filters?.query ?? ''),
    );
    return { data: filtered, total: filtered.length };
  }

  async update(_data: UpdatePatientInput): Promise<Patient> {
    throw new Error('Not implemented');
  }

  async transfer(_data: TransferPatientInput): Promise<Patient> {
    throw new Error('Not implemented');
  }

  async archive(_data: ArchivePatientInput): Promise<void> {
    throw new Error('Not implemented');
  }

  async restore(_tenantId: string, _patientId: string, _requestedBy: string): Promise<Patient> {
    throw new Error('Not implemented');
  }

  async existsByCpf(_tenantId: string, _cpf: string, _excludePatientId?: string): Promise<boolean> {
    return false;
  }

  async findDuplicates(_tenantId: string, _cpf: string): Promise<PatientListItem[]> {
    return [];
  }

  async export(_request: PatientExportRequest): Promise<string> {
    return 's3://fake-export';
  }
}

describe('PatientsController (e2e)', () => {
  let app: INestApplication;
  let repository: InMemoryPatientRepository;
  const aiSuggestions = { getInsights: jest.fn().mockResolvedValue({ nextSteps: ['follow_up'] }) };
  const auditService = { register: jest.fn().mockResolvedValue(undefined) };

  const now = new Date('2025-03-01T12:00:00.000Z');
  const patient: Patient = {
    id: 'patient-1',

    slug: 'patient-joao',

    tenantId: 'tenant-1',

    professionalId: 'professional-1',

    fullName: 'Joao da Silva',

    shortName: 'Joao',

    cpf: '39053344705',

    status: 'active',

    emailVerified: true,

    preferredLanguage: undefined,

    contact: { email: 'joao@example.com', phone: '11999990000', whatsapp: '11999990000' },

    address: undefined,

    medical: {
      allergies: [],

      chronicConditions: [],

      preExistingConditions: [],

      medications: [],

      continuousMedications: [],

      observations: undefined,

      bloodType: undefined,

      lifestyle: undefined,

      heightCm: undefined,

      weightKg: undefined,
    },

    tags: [{ id: 'vip', label: 'VIP', color: '#f00' }],

    riskLevel: 'medium',

    lastAppointmentAt: now,

    nextAppointmentAt: now,

    acceptedTerms: true,

    acceptedTermsAt: now,

    createdAt: now,

    updatedAt: now,

    archivedAt: undefined,
  } as Patient;

  const listItem: PatientListItem = {
    id: patient.id,
    slug: patient.slug,
    fullName: patient.fullName,
    shortName: patient.shortName,
    status: 'active',
    riskLevel: 'medium',
    cpfMasked: '390.***.***.05',
    contact: patient.contact,
    medical: patient.medical,
    acceptedTerms: true,
    acceptedTermsAt: now,
    professionalId: patient.professionalId,
    professionalName: 'Dra. Example',
    nextAppointmentAt: now,
    lastAppointmentAt: now,
    tags: patient.tags,
    revenueTotal: 1200,
    createdAt: now,
    updatedAt: now,
  };

  const summaries: Record<string, PatientSummary> = {
    [patient.id]: {
      totals: {
        appointments: 5,
        completedAppointments: 4,
        cancellations: 1,
        revenue: 1800,
        pendingPayments: 0,
      },
      alerts: ['follow-up atrasado'],
      retentionScore: 82,
    },
  };

  const timelines: Record<string, PatientTimelineEntry[]> = {
    [patient.id]: [
      {
        id: 'timeline-1',
        type: 'appointment',
        title: 'Sessao inicial',
        occurredAt: now,
        createdBy: 'professional-1',
      },
    ],
  };

  const currentUser: ICurrentUser = {
    id: 'owner-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: RolesEnum.CLINIC_OWNER,
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    metadata: {},
  };

  const noop = () => ({ execute: jest.fn() });

  beforeAll(async () => {
    repository = new InMemoryPatientRepository([patient], [listItem], summaries, timelines);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        { provide: IPatientRepositoryToken, useValue: repository },
        { provide: ICreatePatientUseCase, useValue: noop() },
        { provide: IUpdatePatientUseCase, useValue: noop() },
        { provide: ITransferPatientUseCase, useValue: noop() },
        { provide: IArchivePatientUseCase, useValue: noop() },
        { provide: IExportPatientsUseCase, useValue: noop() },
        { provide: IListPatientsUseCase, useClass: ListPatientsUseCase },
        { provide: IGetPatientUseCase, useClass: GetPatientUseCase },
        { provide: PatientAISuggestionsService, useValue: aiSuggestions },
        { provide: PatientAuditService, useValue: auditService },
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
    currentUser.role = RolesEnum.CLINIC_OWNER;
    currentUser.id = 'owner-1';
    currentUser.tenantId = 'tenant-1';
    currentUser.metadata = {};
    aiSuggestions.getInsights.mockClear();
    auditService.register.mockClear();
  });

  it('retorna detalhes completos do paciente com resumo e timeline', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patient.slug}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.patient).toEqual(PatientPresenter.detail(patient));
        expect(body.summary.totals.appointments).toBe(5);
        expect(body.timeline).toHaveLength(1);
        expect(body.timeline[0]).toMatchObject({ id: 'timeline-1', type: 'appointment' });
        expect(body.insights).toEqual({ nextSteps: ['follow_up'] });
        expect(body.quickActions).toContain('transfer_patient');
      });

    expect(aiSuggestions.getInsights).toHaveBeenCalledWith(patient.id, patient.tenantId);
    expect(auditService.register).toHaveBeenCalledWith('patient.viewed', expect.any(Object));
  });

  it('forca filtro por profissional na listagem', async () => {
    currentUser.role = RolesEnum.PROFESSIONAL;
    currentUser.id = 'professional-1';

    await request(app.getHttpServer())
      .get('/patients')
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
      });

    expect(repository.lastFindAllParams?.filters?.assignedProfessionalIds).toEqual([
      'professional-1',
    ]);
  });

  it('bloqueia acesso quando role nao mapeada tenta consultar detalhes', async () => {
    currentUser.role = RolesEnum.VISITOR;

    await request(app.getHttpServer()).get(`/patients/${patient.slug}`).expect(403);
  });
});
