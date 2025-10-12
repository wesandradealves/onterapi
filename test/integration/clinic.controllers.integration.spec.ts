import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ClinicConfigurationController } from '@modules/clinic/api/controllers/clinic-configuration.controller';
import { ClinicInvitationController } from '@modules/clinic/api/controllers/clinic-invitation.controller';
import { ClinicHoldController } from '@modules/clinic/api/controllers/clinic-hold.controller';
import { ClinicAuditController } from '@modules/clinic/api/controllers/clinic-audit.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import {
  ClinicAppointmentConfirmationResult,
  ClinicAuditLog,
  ClinicConfigurationVersion,
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicInvitation,
  ClinicInvitationEconomicSummary,
} from '@domain/clinic/types/clinic.types';
import {
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
  UpdateClinicGeneralSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import {
  IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken,
  UpdateClinicHoldSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import {
  IUpdateClinicServiceSettingsUseCase as IUpdateClinicServiceSettingsUseCaseToken,
  UpdateClinicServiceSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-service-settings.use-case.interface';
import {
  IUpdateClinicPaymentSettingsUseCase as IUpdateClinicPaymentSettingsUseCaseToken,
  UpdateClinicPaymentSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-payment-settings.use-case.interface';
import {
  IUpdateClinicIntegrationSettingsUseCase as IUpdateClinicIntegrationSettingsUseCaseToken,
  UpdateClinicIntegrationSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-integration-settings.use-case.interface';
import {
  IUpdateClinicNotificationSettingsUseCase as IUpdateClinicNotificationSettingsUseCaseToken,
  UpdateClinicNotificationSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-notification-settings.use-case.interface';
import {
  IUpdateClinicBrandingSettingsUseCase as IUpdateClinicBrandingSettingsUseCaseToken,
  UpdateClinicBrandingSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-branding-settings.use-case.interface';
import {
  IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken,
  UpdateClinicScheduleSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
import {
  GetClinicGeneralSettingsInput,
  IGetClinicGeneralSettingsUseCase as IGetClinicGeneralSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-general-settings.use-case.interface';
import {
  GetClinicTeamSettingsInput,
  IGetClinicTeamSettingsUseCase as IGetClinicTeamSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-team-settings.use-case.interface';
import {
  GetClinicScheduleSettingsInput,
  IGetClinicScheduleSettingsUseCase as IGetClinicScheduleSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-schedule-settings.use-case.interface';
import {
  GetClinicServiceSettingsInput,
  IGetClinicServiceSettingsUseCase as IGetClinicServiceSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-service-settings.use-case.interface';
import {
  GetClinicPaymentSettingsInput,
  IGetClinicPaymentSettingsUseCase as IGetClinicPaymentSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-payment-settings.use-case.interface';
import {
  GetClinicIntegrationSettingsInput,
  IGetClinicIntegrationSettingsUseCase as IGetClinicIntegrationSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-integration-settings.use-case.interface';
import {
  GetClinicNotificationSettingsInput,
  IGetClinicNotificationSettingsUseCase as IGetClinicNotificationSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-notification-settings.use-case.interface';
import {
  GetClinicBrandingSettingsInput,
  IGetClinicBrandingSettingsUseCase as IGetClinicBrandingSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-branding-settings.use-case.interface';
import { IGetClinicUseCase as IGetClinicUseCaseToken } from '@domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import {
  IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken,
  InviteClinicProfessionalInput,
} from '@domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import {
  AcceptClinicInvitationInput,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import {
  IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken,
  RevokeClinicInvitationInput,
} from '@domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import {
  ClinicHoldRequestInput,
  ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
import {
  IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';
import {
  IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken,
  ListClinicAuditLogsUseCaseInput,
} from '@domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';
interface UseCaseMock<TInput, TOutput> {
  execute: jest.Mock;
  executeOrThrow: jest.Mock<Promise<TOutput>, [TInput]>;
}

const createUseCaseMock = <TInput, TOutput>(): UseCaseMock<TInput, TOutput> => ({
  execute: jest.fn(),
  executeOrThrow: jest.fn<Promise<TOutput>, [TInput]>(),
});

const FIXTURES = {
  tenant: '11111111-1111-1111-1111-111111111111',
  clinic: '22222222-2222-2222-2222-222222222222',
  professional: '33333333-3333-3333-3333-333333333333',
  patient: '44444444-4444-4444-4444-444444444444',
  invitation: '55555555-5555-5555-5555-555555555555',
  user: '66666666-6666-6666-6666-666666666666',
} as const;

const currentUser: ICurrentUser = {
  id: FIXTURES.user,
  email: 'owner@example.com',
  name: 'Owner Clinic',
  role: RolesEnum.CLINIC_OWNER,
  tenantId: FIXTURES.tenant,
  sessionId: 'session-1',
  metadata: {},
};

const guards = {
  JwtAuthGuard: class implements Partial<JwtAuthGuard> {
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      request.user = currentUser;
      return true;
    }
  },
  RolesGuard: class implements Partial<RolesGuard> {
    canActivate() {
      return true;
    }
  },
} as const;

type ListClinicInvitationsInputShape = {
  clinicId: string;
  tenantId: string;
  status?: string[];
  page?: number;
  limit?: number;
};

describe('ClinicConfigurationController (integration)', () => {
  let app: INestApplication;
  const useCases = {
    updateGeneral: createUseCaseMock<
      UpdateClinicGeneralSettingsInput,
      ClinicConfigurationVersion
    >(),
    updateHold: createUseCaseMock<UpdateClinicHoldSettingsInput, unknown>(),
    updateServices: createUseCaseMock<
      UpdateClinicServiceSettingsInput,
      ClinicConfigurationVersion
    >(),
    updatePayments: createUseCaseMock<
      UpdateClinicPaymentSettingsInput,
      ClinicConfigurationVersion
    >(),
    updateIntegrations: createUseCaseMock<
      UpdateClinicIntegrationSettingsInput,
      ClinicConfigurationVersion
    >(),
    updateNotifications: createUseCaseMock<
      UpdateClinicNotificationSettingsInput,
      ClinicConfigurationVersion
    >(),
    updateBranding: createUseCaseMock<
      UpdateClinicBrandingSettingsInput,
      ClinicConfigurationVersion
    >(),
    updateSchedule: createUseCaseMock<
      UpdateClinicScheduleSettingsInput,
      ClinicConfigurationVersion
    >(),
    getGeneral: createUseCaseMock<GetClinicGeneralSettingsInput, ClinicConfigurationVersion>(),
    getTeam: createUseCaseMock<GetClinicTeamSettingsInput, ClinicConfigurationVersion>(),
    getSchedule: createUseCaseMock<GetClinicScheduleSettingsInput, ClinicConfigurationVersion>(),
    getServices: createUseCaseMock<GetClinicServiceSettingsInput, ClinicConfigurationVersion>(),
    getPayments: createUseCaseMock<GetClinicPaymentSettingsInput, ClinicConfigurationVersion>(),
    getIntegrations: createUseCaseMock<
      GetClinicIntegrationSettingsInput,
      ClinicConfigurationVersion
    >(),
    getNotifications: createUseCaseMock<
      GetClinicNotificationSettingsInput,
      ClinicConfigurationVersion
    >(),
    getBranding: createUseCaseMock<GetClinicBrandingSettingsInput, ClinicConfigurationVersion>(),
    getClinic: createUseCaseMock<{ clinicId: string; tenantId: string }, unknown>(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicConfigurationController],
      providers: [
        { provide: IUpdateClinicGeneralSettingsUseCaseToken, useValue: useCases.updateGeneral },
        { provide: IUpdateClinicHoldSettingsUseCaseToken, useValue: useCases.updateHold },
        { provide: IUpdateClinicServiceSettingsUseCaseToken, useValue: useCases.updateServices },
        { provide: IUpdateClinicPaymentSettingsUseCaseToken, useValue: useCases.updatePayments },
        {
          provide: IUpdateClinicIntegrationSettingsUseCaseToken,
          useValue: useCases.updateIntegrations,
        },
        {
          provide: IUpdateClinicNotificationSettingsUseCaseToken,
          useValue: useCases.updateNotifications,
        },
        { provide: IUpdateClinicBrandingSettingsUseCaseToken, useValue: useCases.updateBranding },
        { provide: IUpdateClinicScheduleSettingsUseCaseToken, useValue: useCases.updateSchedule },
        { provide: IGetClinicGeneralSettingsUseCaseToken, useValue: useCases.getGeneral },
        { provide: IGetClinicTeamSettingsUseCaseToken, useValue: useCases.getTeam },
        { provide: IGetClinicScheduleSettingsUseCaseToken, useValue: useCases.getSchedule },
        { provide: IGetClinicServiceSettingsUseCaseToken, useValue: useCases.getServices },
        { provide: IGetClinicPaymentSettingsUseCaseToken, useValue: useCases.getPayments },
        { provide: IGetClinicIntegrationSettingsUseCaseToken, useValue: useCases.getIntegrations },
        {
          provide: IGetClinicNotificationSettingsUseCaseToken,
          useValue: useCases.getNotifications,
        },
        { provide: IGetClinicBrandingSettingsUseCaseToken, useValue: useCases.getBranding },
        { provide: IGetClinicUseCaseToken, useValue: useCases.getClinic },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as new () => JwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as new () => RolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    Object.values(useCases).forEach((mock) => {
      mock.execute.mockReset();
      mock.executeOrThrow.mockReset();
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clinics/:id/settings/general deve retornar versão atual', async () => {
    const version: ClinicConfigurationVersion = {
      id: 'version-1',
      clinicId: FIXTURES.clinic,
      section: 'general',
      version: 3,
      payload: {
        tradeName: 'Clínica Onterapi',
        address: { city: 'São Paulo', state: 'SP', zipCode: '01000-000', street: 'Rua A' },
        contact: { email: 'contato@onterapi.com' },
      },
      createdBy: currentUser.id,
      createdAt: new Date('2025-10-10T10:00:00.000Z'),
      appliedAt: new Date('2025-10-10T10:05:00.000Z'),
      notes: 'Primeira versão',
    };
    useCases.getGeneral.executeOrThrow.mockResolvedValue(version);

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/general`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(200);

    expect(useCases.getGeneral.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
    });
    expect(response.body).toMatchObject({
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      payload: version.payload,
      notes: version.notes,
    });
    expect(response.body.createdAt).toBe(version.createdAt.toISOString());
    expect(response.body.appliedAt).toBe(version.appliedAt?.toISOString());
  });

  it('PATCH /clinics/:id/settings/general deve mapear payload e aplicar versão', async () => {
    const requestPayload = {
      tenantId: FIXTURES.tenant,
      generalSettings: {
        tradeName: 'Clínica Atualizada',
        legalName: 'Clínica Atualizada LTDA',
        document: { type: 'cnpj', value: '12345678000199' },
        foundationDate: '2025-01-15T00:00:00.000Z',
        address: {
          zipCode: '22222-000',
          street: 'Rua B',
          number: '100',
          city: 'Rio de Janeiro',
          state: 'RJ',
        },
        contact: {
          phone: '+55 11 99999-0000',
          email: 'nova@clinca.com',
        },
        notes: 'Observação importante',
      },
    };

    const updatedVersion: ClinicConfigurationVersion = {
      id: 'version-2',
      clinicId: FIXTURES.clinic,
      section: 'general',
      version: 4,
      payload: requestPayload.generalSettings,
      createdBy: currentUser.id,
      createdAt: new Date('2025-10-11T12:00:00.000Z'),
      appliedAt: new Date('2025-10-11T12:01:00.000Z'),
      notes: 'Autosave',
    };
    useCases.updateGeneral.executeOrThrow.mockResolvedValue(updatedVersion);

    const response = await request(app.getHttpServer())
      .patch(`/clinics/${FIXTURES.clinic}/settings/general`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(requestPayload)
      .expect(200);

    expect(useCases.updateGeneral.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      requestedBy: currentUser.id,
      settings: expect.objectContaining({
        tradeName: requestPayload.generalSettings.tradeName,
        foundationDate: new Date(requestPayload.generalSettings.foundationDate),
        address: expect.objectContaining({
          city: requestPayload.generalSettings.address.city,
          state: requestPayload.generalSettings.address.state,
        }),
        contact: expect.objectContaining({
          email: requestPayload.generalSettings.contact.email,
        }),
      }),
    });
    expect(response.body.id).toBe(updatedVersion.id);
    expect(response.body.version).toBe(updatedVersion.version);
    expect(response.body.createdAt).toBe(updatedVersion.createdAt.toISOString());
  });
});

describe('ClinicInvitationController (integration)', () => {
  let app: INestApplication;
  const economicSummary: ClinicInvitationEconomicSummary = {
    items: [
      {
        serviceTypeId: '77777777-7777-7777-7777-777777777777',
        price: 300,
        currency: 'BRL',
        payoutModel: 'percentage',
        payoutValue: 60,
      },
    ],
    orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
    roundingStrategy: 'half_even',
  };

  const buildInvitation = (overrides: Partial<ClinicInvitation> = {}): ClinicInvitation => ({
    id: overrides.id ?? FIXTURES.invitation,
    clinicId: overrides.clinicId ?? FIXTURES.clinic,
    tenantId: overrides.tenantId ?? FIXTURES.tenant,
    professionalId: overrides.professionalId ?? FIXTURES.professional,
    targetEmail: overrides.targetEmail ?? 'pro@onterapi.com',
    issuedBy: overrides.issuedBy ?? currentUser.id,
    status: overrides.status ?? 'pending',
    tokenHash: overrides.tokenHash ?? 'hash',
    channel: overrides.channel ?? 'email',
    expiresAt: overrides.expiresAt ?? new Date('2025-11-01T12:00:00.000Z'),
    acceptedAt: overrides.acceptedAt,
    acceptedBy: overrides.acceptedBy,
    revokedAt: overrides.revokedAt,
    revokedBy: overrides.revokedBy,
    revocationReason: overrides.revocationReason ?? null,
    declinedAt: overrides.declinedAt,
    declinedBy: overrides.declinedBy,
    economicSummary: overrides.economicSummary ?? economicSummary,
    createdAt: overrides.createdAt ?? new Date('2025-10-01T12:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-10-01T12:00:00.000Z'),
    metadata: { ...(overrides.metadata ?? { rawToken: 'token-123', source: 'manager' }) },
  });

  const useCases = {
    invite: createUseCaseMock<InviteClinicProfessionalInput, ClinicInvitation>(),
    list: createUseCaseMock<
      ListClinicInvitationsInputShape,
      { data: ClinicInvitation[]; total: number }
    >(),
    accept: createUseCaseMock<AcceptClinicInvitationInput, ClinicInvitation>(),
    revoke: createUseCaseMock<RevokeClinicInvitationInput, ClinicInvitation>(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicInvitationController],
      providers: [
        { provide: IInviteClinicProfessionalUseCaseToken, useValue: useCases.invite },
        { provide: IListClinicInvitationsUseCaseToken, useValue: useCases.list },
        { provide: IAcceptClinicInvitationUseCaseToken, useValue: useCases.accept },
        { provide: IRevokeClinicInvitationUseCaseToken, useValue: useCases.revoke },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as new () => JwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as new () => RolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    Object.values(useCases).forEach((mock) => {
      mock.execute.mockReset();
      mock.executeOrThrow.mockReset();
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /clinics/:id/invitations deve emitir convite com token exposto e metadata sanitizada', async () => {
    const invitationResponse = buildInvitation();
    useCases.invite.executeOrThrow.mockResolvedValue(invitationResponse);

    const payload = {
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      email: invitationResponse.targetEmail,
      channel: 'email',
      economicSummary: {
        items: economicSummary.items,
        orderOfRemainders: economicSummary.orderOfRemainders,
        roundingStrategy: 'half_even',
      },
      expiresAt: invitationResponse.expiresAt.toISOString(),
      metadata: { origin: 'dashboard' },
    };

    const response = await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/invitations`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(payload)
      .expect(201);

    expect(useCases.invite.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      issuedBy: currentUser.id,
      professionalId: payload.professionalId,
      email: payload.email,
      channel: payload.channel,
      economicSummary,
      expiresAt: new Date(payload.expiresAt),
      metadata: payload.metadata,
    });
    expect(response.body.token).toBe('token-123');
    expect(response.body.metadata).toEqual({ source: 'manager' });
  });

  it('GET /clinics/:id/invitations deve respeitar filtros e mapear lista', async () => {
    const invitationListItem = buildInvitation();
    useCases.list.executeOrThrow.mockResolvedValue({ data: [invitationListItem], total: 1 });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/invitations`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ tenantId: FIXTURES.tenant, status: 'pending,accepted', page: 2, limit: 5 })
      .expect(200);

    expect(useCases.list.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      status: ['pending', 'accepted'],
      page: 2,
      limit: 5,
    });
    expect(response.body.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(invitationListItem.id);
  });

  it('POST /clinics/invitations/:id/accept deve vincular profissional', async () => {
    const acceptedInvitation = buildInvitation({ status: 'accepted' });
    useCases.accept.executeOrThrow.mockResolvedValue(acceptedInvitation);

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/accept`)
      .send({ tenantId: FIXTURES.tenant, token: 'token-1234' })
      .expect(201);

    expect(useCases.accept.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      acceptedBy: currentUser.id,
      token: 'token-1234',
    });
    expect(response.body.status).toBe('accepted');
  });

  it('POST /clinics/invitations/:id/revoke deve revogar convite', async () => {
    const revokedInvitation = buildInvitation({ status: 'revoked', revokedBy: currentUser.id });
    useCases.revoke.executeOrThrow.mockResolvedValue(revokedInvitation);

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/revoke`)
      .send({ tenantId: FIXTURES.tenant, reason: 'Atualização econômica' })
      .expect(201);

    expect(useCases.revoke.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      revokedBy: currentUser.id,
      reason: 'Atualização econômica',
    });
    expect(response.body.status).toBe('revoked');
    expect(response.body.revokedBy).toBe(currentUser.id);
  });
});

describe('ClinicHoldController (integration)', () => {
  let app: INestApplication;
  const createHoldUseCase = createUseCaseMock<ClinicHoldRequestInput, ClinicHold>();
  const confirmHoldUseCase = createUseCaseMock<
    ClinicHoldConfirmationInput,
    ClinicAppointmentConfirmationResult
  >();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicHoldController],
      providers: [
        { provide: ICreateClinicHoldUseCaseToken, useValue: createHoldUseCase },
        { provide: IConfirmClinicAppointmentUseCaseToken, useValue: confirmHoldUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as new () => JwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as new () => RolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    createHoldUseCase.execute.mockReset();
    createHoldUseCase.executeOrThrow.mockReset();
    confirmHoldUseCase.execute.mockReset();
    confirmHoldUseCase.executeOrThrow.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /clinics/:id/holds deve criar hold respeitando tenant e conversão de datas', async () => {
    const payload = {
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      patientId: FIXTURES.patient,
      serviceTypeId: '88888888-8888-8888-8888-888888888888',
      start: '2025-12-01T10:00:00.000Z',
      end: '2025-12-01T11:00:00.000Z',
      idempotencyKey: 'hold-unique-key',
      resources: ['room-1'],
      metadata: { riskScore: 0.2 },
    };

    const hold: ClinicHold = {
      id: 'hold-1',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      serviceTypeId: payload.serviceTypeId,
      start: new Date(payload.start),
      end: new Date(payload.end),
      ttlExpiresAt: new Date('2025-12-01T09:50:00.000Z'),
      status: 'pending',
      locationId: undefined,
      resources: payload.resources,
      idempotencyKey: payload.idempotencyKey,
      createdBy: currentUser.id,
      createdAt: new Date('2025-11-30T12:00:00.000Z'),
      updatedAt: new Date('2025-11-30T12:00:00.000Z'),
      metadata: payload.metadata,
    };
    createHoldUseCase.executeOrThrow.mockResolvedValue(hold);

    const response = await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/holds`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(payload)
      .expect(201);

    expect(createHoldUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      requestedBy: currentUser.id,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      serviceTypeId: payload.serviceTypeId,
      start: new Date(payload.start),
      end: new Date(payload.end),
      locationId: payload.locationId,
      resources: payload.resources,
      idempotencyKey: payload.idempotencyKey,
      metadata: payload.metadata,
    });
    expect(response.body.id).toBe(hold.id);
    expect(response.body.start).toBe(hold.start.toISOString());
    expect(response.body.ttlExpiresAt).toBe(hold.ttlExpiresAt.toISOString());
  });
});

describe('ClinicAuditController (integration)', () => {
  let app: INestApplication;
  const useCase = createUseCaseMock<
    ListClinicAuditLogsUseCaseInput,
    { data: ClinicAuditLog[]; total: number }
  >();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicAuditController],
      providers: [{ provide: IListClinicAuditLogsUseCaseToken, useValue: useCase }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as new () => JwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as new () => RolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    useCase.execute.mockReset();
    useCase.executeOrThrow.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clinics/:id/audit-logs deve retornar logs paginados', async () => {
    const auditLog: ClinicAuditLog = {
      id: 'log-1',
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      event: 'clinic.updated',
      performedBy: currentUser.id,
      detail: { field: 'value' },
      createdAt: new Date('2025-10-12T12:00:00.000Z'),
    };
    useCase.executeOrThrow.mockResolvedValue({ data: [auditLog], total: 1 });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/audit-logs`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ events: 'clinic.updated', page: 2, limit: 10 })
      .expect(200);

    expect(useCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      events: ['clinic.updated'],
      page: 2,
      limit: 10,
    });
    expect(response.body.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(auditLog.id);
    expect(response.body.data[0].detail).toEqual(auditLog.detail);
  });
});
