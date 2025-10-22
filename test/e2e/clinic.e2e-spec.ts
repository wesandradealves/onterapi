import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ClinicsController } from '@modules/clinic/api/controllers/clinics.controller';
import { ClinicConfigurationController } from '@modules/clinic/api/controllers/clinic-configuration.controller';
import { ClinicInvitationController } from '@modules/clinic/api/controllers/clinic-invitation.controller';
import { ClinicHoldController } from '@modules/clinic/api/controllers/clinic-hold.controller';
import { ClinicAuditController } from '@modules/clinic/api/controllers/clinic-audit.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ClinicScopeGuard } from '@modules/clinic/guards/clinic-scope.guard';
import { ClinicAccessService } from '@modules/clinic/services/clinic-access.service';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import {
  Clinic,
  ClinicAppointmentConfirmationResult,
  ClinicAuditLog,
  ClinicConfigurationVersion,
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicHoldSettings,
  ClinicInvitation,
  ClinicInvitationEconomicSummary,
  ClinicOverbookingReviewInput,
  ClinicTemplatePropagationInput,
  CreateClinicInput,
} from '@domain/clinic/types/clinic.types';
import { IListClinicsUseCase as IListClinicsUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import { IGetClinicUseCase as IGetClinicUseCaseToken } from '@domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import { ICreateClinicUseCase as ICreateClinicUseCaseToken } from '@domain/clinic/interfaces/use-cases/create-clinic.use-case.interface';
import { IUpdateClinicStatusUseCase as IUpdateClinicStatusUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-status.use-case.interface';
import {
  GetClinicGeneralSettingsInput,
  IGetClinicGeneralSettingsUseCase as IGetClinicGeneralSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-general-settings.use-case.interface';
import {
  GetClinicTeamSettingsInput,
  IGetClinicTeamSettingsUseCase as IGetClinicTeamSettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-team-settings.use-case.interface';
import {
  IUpdateClinicTeamSettingsUseCase as IUpdateClinicTeamSettingsUseCaseToken,
  UpdateClinicTeamSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-team-settings.use-case.interface';
import {
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
  UpdateClinicGeneralSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import { IUpdateClinicServiceSettingsUseCase as IUpdateClinicServiceSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-service-settings.use-case.interface';
import { IUpdateClinicPaymentSettingsUseCase as IUpdateClinicPaymentSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-payment-settings.use-case.interface';
import { IUpdateClinicIntegrationSettingsUseCase as IUpdateClinicIntegrationSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-integration-settings.use-case.interface';
import { IUpdateClinicNotificationSettingsUseCase as IUpdateClinicNotificationSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-notification-settings.use-case.interface';
import { IUpdateClinicBrandingSettingsUseCase as IUpdateClinicBrandingSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-branding-settings.use-case.interface';
import { IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken } from '@domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
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
import { IPropagateClinicTemplateUseCase as IPropagateClinicTemplateUseCaseToken } from '@domain/clinic/interfaces/use-cases/propagate-clinic-template.use-case.interface';
import {
  IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken,
  InviteClinicProfessionalInput,
} from '@domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import {
  AcceptClinicInvitationInput,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import { IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken } from '@domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import {
  IReissueClinicInvitationUseCase as IReissueClinicInvitationUseCaseToken,
  ReissueClinicInvitationInput,
} from '@domain/clinic/interfaces/use-cases/reissue-clinic-invitation.use-case.interface';
import {
  ClinicHoldRequestInput,
  ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
import { IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken } from '@domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';
import { IProcessClinicOverbookingUseCase as IProcessClinicOverbookingUseCaseToken } from '@domain/clinic/interfaces/use-cases/process-clinic-overbooking.use-case.interface';
import {
  IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken,
  ListClinicAuditLogsUseCaseInput,
} from '@domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';

type UseCaseMock<TInput, TOutput> = {
  execute: jest.Mock;
  executeOrThrow: jest.Mock<Promise<TOutput>, [TInput]>;
};

const createUseCaseMock = <TInput, TOutput>(): UseCaseMock<TInput, TOutput> => ({
  execute: jest.fn(),
  executeOrThrow: jest.fn<Promise<TOutput>, [TInput]>(),
});

describe('Clinic module (e2e)', () => {
  let app: INestApplication;

  const FIXTURES = {
    tenant: '11111111-1111-1111-1111-111111111111',
    clinic: '22222222-2222-2222-2222-222222222222',
    owner: '33333333-3333-3333-3333-333333333333',
    professional: '44444444-4444-4444-4444-444444444444',
    patient: '55555555-5555-5555-5555-555555555555',
    invitation: '66666666-6666-6666-6666-666666666666',
  } as const;

  const currentUser: ICurrentUser = {
    id: FIXTURES.owner,
    email: 'owner@onterapi.com',
    name: 'Clinic Owner',
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
    ClinicScopeGuard: class implements Partial<ClinicScopeGuard> {
      canActivate() {
        return true;
      }
    },
  } as const;

  const clinicAccessService = {
    resolveAuthorizedClinicIds: jest.fn(
      async ({ requestedClinicIds }: { requestedClinicIds?: string[] | null }) =>
        requestedClinicIds && requestedClinicIds.length > 0
          ? requestedClinicIds
          : [FIXTURES.clinic],
    ),
    assertClinicAccess: jest.fn(async () => undefined),
  };

  const state: {
    clinic: Clinic | null;
    generalVersion: ClinicConfigurationVersion | null;
    invitation: ClinicInvitation | null;
    hold: ClinicHold | null;
    auditLogs: ClinicAuditLog[];
  } = {
    clinic: null,
    generalVersion: null,
    invitation: null,
    hold: null,
    auditLogs: [],
  };

  type ListClinicsInputShape = {
    tenantId: string;
    status?: string[];
    search?: string;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  };

  type GetClinicInputShape = {
    clinicId: string;
    tenantId: string;
  };

  type ListClinicInvitationsInputShape = {
    clinicId: string;
    tenantId: string;
    status?: string[];
    page?: number;
    limit?: number;
  };

  type RevokeClinicInvitationInputShape = {
    invitationId: string;
    tenantId: string;
    revokedBy: string;
    reason?: string;
  };

  const createClinicUseCase = createUseCaseMock<CreateClinicInput, Clinic>();
  const listClinicsUseCase = createUseCaseMock<
    ListClinicsInputShape,
    { data: Clinic[]; total: number }
  >();
  const getClinicUseCase = createUseCaseMock<GetClinicInputShape, Clinic>();
  const updateClinicStatusUseCase = createUseCaseMock<unknown, Clinic>();

  const getGeneralSettingsUseCase = createUseCaseMock<
    GetClinicGeneralSettingsInput,
    ClinicConfigurationVersion
  >();
  const getTeamSettingsUseCase = createUseCaseMock<
    GetClinicTeamSettingsInput,
    ClinicConfigurationVersion
  >();
  const updateTeamSettingsUseCase = createUseCaseMock<
    UpdateClinicTeamSettingsInput,
    ClinicConfigurationVersion
  >();
  const updateGeneralSettingsUseCase = createUseCaseMock<
    UpdateClinicGeneralSettingsInput,
    ClinicConfigurationVersion
  >();
  const propagateTemplateUseCase = createUseCaseMock<
    ClinicTemplatePropagationInput,
    ClinicConfigurationVersion[]
  >();
  const getScheduleSettingsUseCase = createUseCaseMock<
    GetClinicScheduleSettingsInput,
    ClinicConfigurationVersion
  >();
  const getServiceSettingsUseCase = createUseCaseMock<
    GetClinicServiceSettingsInput,
    ClinicConfigurationVersion
  >();
  const getPaymentSettingsUseCase = createUseCaseMock<
    GetClinicPaymentSettingsInput,
    ClinicConfigurationVersion
  >();
  const getIntegrationSettingsUseCase = createUseCaseMock<
    GetClinicIntegrationSettingsInput,
    ClinicConfigurationVersion
  >();
  const getNotificationSettingsUseCase = createUseCaseMock<
    GetClinicNotificationSettingsInput,
    ClinicConfigurationVersion
  >();
  const getBrandingSettingsUseCase = createUseCaseMock<
    GetClinicBrandingSettingsInput,
    ClinicConfigurationVersion
  >();

  const holdSettingsUseCase = createUseCaseMock<unknown, Clinic>();
  const serviceSettingsUseCase = createUseCaseMock<unknown, ClinicConfigurationVersion>();
  const paymentSettingsUseCase = createUseCaseMock<unknown, ClinicConfigurationVersion>();
  const integrationSettingsUseCase = createUseCaseMock<unknown, ClinicConfigurationVersion>();
  const notificationSettingsUseCase = createUseCaseMock<unknown, ClinicConfigurationVersion>();
  const brandingSettingsUseCase = createUseCaseMock<unknown, ClinicConfigurationVersion>();
  const scheduleSettingsUseCase = createUseCaseMock<unknown, ClinicConfigurationVersion>();

  const inviteUseCase = createUseCaseMock<InviteClinicProfessionalInput, ClinicInvitation>();
  const listInvitationsUseCase = createUseCaseMock<
    ListClinicInvitationsInputShape,
    { data: ClinicInvitation[]; total: number }
  >();
  const acceptInvitationUseCase = createUseCaseMock<
    AcceptClinicInvitationInput,
    ClinicInvitation
  >();
  const revokeInvitationUseCase = createUseCaseMock<
    RevokeClinicInvitationInputShape,
    ClinicInvitation
  >();
  const reissueInvitationUseCase = createUseCaseMock<
    ReissueClinicInvitationInput,
    ClinicInvitation
  >();

  const createHoldUseCase = createUseCaseMock<ClinicHoldRequestInput, ClinicHold>();
  const processOverbookingUseCase = createUseCaseMock<ClinicOverbookingReviewInput, ClinicHold>();
  const confirmAppointmentUseCase = createUseCaseMock<
    ClinicHoldConfirmationInput,
    ClinicAppointmentConfirmationResult
  >();
  const listAuditLogsUseCase = createUseCaseMock<
    ListClinicAuditLogsUseCaseInput,
    { data: ClinicAuditLog[]; total: number }
  >();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        ClinicsController,
        ClinicConfigurationController,
        ClinicInvitationController,
        ClinicHoldController,
        ClinicAuditController,
      ],
      providers: [
        { provide: IListClinicsUseCaseToken, useValue: listClinicsUseCase },
        { provide: IGetClinicUseCaseToken, useValue: getClinicUseCase },
        { provide: ICreateClinicUseCaseToken, useValue: createClinicUseCase },
        { provide: IUpdateClinicStatusUseCaseToken, useValue: updateClinicStatusUseCase },
        { provide: IGetClinicGeneralSettingsUseCaseToken, useValue: getGeneralSettingsUseCase },
        {
          provide: IUpdateClinicGeneralSettingsUseCaseToken,
          useValue: updateGeneralSettingsUseCase,
        },
        { provide: IUpdateClinicTeamSettingsUseCaseToken, useValue: updateTeamSettingsUseCase },
        { provide: IPropagateClinicTemplateUseCaseToken, useValue: propagateTemplateUseCase },
        { provide: IGetClinicTeamSettingsUseCaseToken, useValue: getTeamSettingsUseCase },
        { provide: IGetClinicScheduleSettingsUseCaseToken, useValue: getScheduleSettingsUseCase },
        { provide: IGetClinicServiceSettingsUseCaseToken, useValue: getServiceSettingsUseCase },
        { provide: IGetClinicPaymentSettingsUseCaseToken, useValue: getPaymentSettingsUseCase },
        {
          provide: IGetClinicIntegrationSettingsUseCaseToken,
          useValue: getIntegrationSettingsUseCase,
        },
        {
          provide: IGetClinicNotificationSettingsUseCaseToken,
          useValue: getNotificationSettingsUseCase,
        },
        { provide: IGetClinicBrandingSettingsUseCaseToken, useValue: getBrandingSettingsUseCase },
        { provide: IUpdateClinicHoldSettingsUseCaseToken, useValue: holdSettingsUseCase },
        { provide: IUpdateClinicServiceSettingsUseCaseToken, useValue: serviceSettingsUseCase },
        { provide: IUpdateClinicPaymentSettingsUseCaseToken, useValue: paymentSettingsUseCase },
        {
          provide: IUpdateClinicIntegrationSettingsUseCaseToken,
          useValue: integrationSettingsUseCase,
        },
        {
          provide: IUpdateClinicNotificationSettingsUseCaseToken,
          useValue: notificationSettingsUseCase,
        },
        { provide: IUpdateClinicBrandingSettingsUseCaseToken, useValue: brandingSettingsUseCase },
        { provide: IUpdateClinicScheduleSettingsUseCaseToken, useValue: scheduleSettingsUseCase },
        { provide: IInviteClinicProfessionalUseCaseToken, useValue: inviteUseCase },
        { provide: IListClinicInvitationsUseCaseToken, useValue: listInvitationsUseCase },
        { provide: IAcceptClinicInvitationUseCaseToken, useValue: acceptInvitationUseCase },
        { provide: IRevokeClinicInvitationUseCaseToken, useValue: revokeInvitationUseCase },
        { provide: IReissueClinicInvitationUseCaseToken, useValue: reissueInvitationUseCase },
        { provide: ICreateClinicHoldUseCaseToken, useValue: createHoldUseCase },
        { provide: IProcessClinicOverbookingUseCaseToken, useValue: processOverbookingUseCase },
        { provide: IConfirmClinicAppointmentUseCaseToken, useValue: confirmAppointmentUseCase },
        { provide: IListClinicAuditLogsUseCaseToken, useValue: listAuditLogsUseCase },
        { provide: ClinicAccessService, useValue: clinicAccessService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as new () => JwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as new () => RolesGuard)
      .overrideGuard(ClinicScopeGuard)
      .useClass(guards.ClinicScopeGuard as new () => ClinicScopeGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    state.clinic = null;
    state.generalVersion = null;
    state.invitation = null;
    state.hold = null;
    state.auditLogs = [];
    clinicAccessService.resolveAuthorizedClinicIds.mockClear();
    clinicAccessService.assertClinicAccess.mockClear();

    [
      createClinicUseCase,
      listClinicsUseCase,
      getClinicUseCase,
      updateClinicStatusUseCase,
      getGeneralSettingsUseCase,
      getTeamSettingsUseCase,
      getScheduleSettingsUseCase,
      getServiceSettingsUseCase,
      getPaymentSettingsUseCase,
      getIntegrationSettingsUseCase,
      getNotificationSettingsUseCase,
      getBrandingSettingsUseCase,
      updateGeneralSettingsUseCase,
      holdSettingsUseCase,
      serviceSettingsUseCase,
      paymentSettingsUseCase,
      integrationSettingsUseCase,
      notificationSettingsUseCase,
      brandingSettingsUseCase,
      scheduleSettingsUseCase,
      inviteUseCase,
      listInvitationsUseCase,
      acceptInvitationUseCase,
      revokeInvitationUseCase,
      reissueInvitationUseCase,
      createHoldUseCase,
      processOverbookingUseCase,
      confirmAppointmentUseCase,
      listAuditLogsUseCase,
    ].forEach((mock) => {
      mock.execute.mockReset();
      mock.executeOrThrow.mockReset();
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve realizar onboarding da cl nica e preparar agendamento sem quebrar invariantes', async () => {
    const holdSettings: ClinicHoldSettings = {
      ttlMinutes: 25,
      minAdvanceMinutes: 120,
      maxAdvanceMinutes: 20160,
      allowOverbooking: false,
      overbookingThreshold: 0,
      resourceMatchingStrict: true,
    };

    createClinicUseCase.executeOrThrow.mockImplementation(async (input) => {
      state.clinic = {
        id: FIXTURES.clinic,
        tenantId: input.tenantId,
        name: input.name,
        slug: input.slug,
        status: 'active',
        holdSettings,
        primaryOwnerId: input.primaryOwnerId,
        createdAt: new Date('2025-10-10T12:00:00.000Z'),
        updatedAt: new Date('2025-10-10T12:00:00.000Z'),
        document: input.document,
        configurationVersions: {},
      };
      return state.clinic;
    });

    getClinicUseCase.executeOrThrow.mockImplementation(async () => state.clinic as Clinic);

    const generalEconomicSummary: ClinicInvitationEconomicSummary = {
      items: [
        {
          serviceTypeId: '77777777-7777-7777-7777-777777777777',
          price: 280,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 55,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    };

    updateGeneralSettingsUseCase.executeOrThrow.mockImplementation(async (input) => {
      state.generalVersion = {
        id: 'version-1',
        clinicId: input.clinicId,
        section: 'general',
        version: 1,
        payload: {
          tradeName: input.settings.tradeName,
          address: input.settings.address,
          contact: input.settings.contact,
        },
        createdBy: input.requestedBy,
        createdAt: new Date('2025-10-11T09:00:00.000Z'),
        appliedAt: new Date('2025-10-11T09:00:00.000Z'),
      };
      return state.generalVersion;
    });

    getGeneralSettingsUseCase.executeOrThrow.mockImplementation(
      async () => state.generalVersion as ClinicConfigurationVersion,
    );

    inviteUseCase.executeOrThrow.mockImplementation(async (input) => {
      state.invitation = {
        id: FIXTURES.invitation,
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        professionalId: input.professionalId,
        issuedBy: input.issuedBy,
        status: 'pending',
        tokenHash: 'hash',
        channel: input.channel,
        expiresAt: input.expiresAt,
        economicSummary: generalEconomicSummary,
        acceptedEconomicSnapshot: undefined,
        createdAt: new Date('2025-10-11T10:00:00.000Z'),
        updatedAt: new Date('2025-10-11T10:00:00.000Z'),
        metadata: { issuedToken: 'flow-token' },
      };
      return state.invitation;
    });

    acceptInvitationUseCase.executeOrThrow.mockImplementation(async (input) => {
      state.invitation = {
        ...(state.invitation as ClinicInvitation),
        status: 'accepted',
        acceptedAt: new Date('2025-10-11T10:30:00.000Z'),
        acceptedBy: input.acceptedBy,
        acceptedEconomicSnapshot: {
          ...generalEconomicSummary,
          items: generalEconomicSummary.items.map((item) => ({ ...item })),
        },
        metadata: { source: 'dashboard' },
      };
      return state.invitation;
    });

    createHoldUseCase.executeOrThrow.mockImplementation(async (input) => {
      state.hold = {
        id: 'hold-1',
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        professionalId: input.professionalId,
        patientId: input.patientId,
        serviceTypeId: input.serviceTypeId,
        start: input.start,
        end: input.end,
        ttlExpiresAt: new Date(input.start.getTime() - 10 * 60000),
        status: 'pending',
        idempotencyKey: input.idempotencyKey,
        createdBy: input.requestedBy,
        createdAt: new Date('2025-10-11T11:00:00.000Z'),
        updatedAt: new Date('2025-10-11T11:00:00.000Z'),
      };
      return state.hold;
    });

    // 1) Cria  o da cl nica
    const createPayload = {
      tenantId: FIXTURES.tenant,
      name: 'Cl nica Central',
      slug: 'clinica-central',
      primaryOwnerId: FIXTURES.owner,
      document: { type: 'cnpj', value: '12345678000199' },
      holdSettings,
    };

    const createResponse = await request(app.getHttpServer())
      .post('/clinics')
      .send(createPayload)
      .expect(201);

    expect(createClinicUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: FIXTURES.tenant, name: createPayload.name }),
    );
    expect(createResponse.body.id).toBe(FIXTURES.clinic);
    expect(createResponse.body.holdSettings.ttlMinutes).toBe(holdSettings.ttlMinutes);

    // 2) Atualiza  o e leitura das configura  es gerais
    const updatePayload = {
      tenantId: FIXTURES.tenant,
      generalSettings: {
        tradeName: 'Cl nica Central Atualizada',
        address: {
          zipCode: '01000-000',
          street: 'Av. Onterapi',
          city: 'S o Paulo',
          state: 'SP',
        },
        contact: {
          email: 'contato@central.com',
          phone: '+55 11 99999-0000',
        },
      },
    };

    const updateResponse = await request(app.getHttpServer())
      .patch(`/clinics/${FIXTURES.clinic}/settings/general`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(updatePayload)
      .expect(200);

    expect(updateGeneralSettingsUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: FIXTURES.clinic,
        tenantId: FIXTURES.tenant,
        settings: expect.objectContaining({ tradeName: 'Cl nica Central Atualizada' }),
      }),
    );
    expect(updateResponse.body.version).toBe(1);
    expect(updateResponse.body.payload.tradeName).toBe('Cl nica Central Atualizada');

    const generalResponse = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/general`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(200);

    expect(getGeneralSettingsUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
    });
    expect(generalResponse.body.payload.contact.email).toBe('contato@central.com');

    // 3) Convite e aceite do profissional
    const invitePayload = {
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      channel: 'email',
      economicSummary: generalEconomicSummary,
      expiresAt: '2025-10-18T10:00:00.000Z',
    };

    const inviteResponse = await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/invitations`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(invitePayload)
      .expect(201);

    expect(inviteUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: FIXTURES.clinic,
        tenantId: FIXTURES.tenant,
        professionalId: FIXTURES.professional,
      }),
    );
    expect(inviteResponse.body.token).toBe('flow-token');
    expect(inviteResponse.body.economicSummary.items[0].payoutValue).toBe(55);

    const acceptResponse = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/accept`)
      .send({ tenantId: FIXTURES.tenant, token: 'flow-token' })
      .expect(201);

    expect(acceptInvitationUseCase.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      acceptedBy: currentUser.id,
      token: 'flow-token',
    });
    expect(acceptResponse.body.status).toBe('accepted');
    expect(acceptResponse.body.acceptedAt).toBeDefined();
    expect(acceptResponse.body.acceptedEconomicSnapshot.items[0].payoutValue).toBe(55);

    // 4) Cria  o do hold respeitando TTL
    const holdPayload = {
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      patientId: FIXTURES.patient,
      serviceTypeId: '88888888-8888-8888-8888-888888888888',
      start: '2025-10-20T14:00:00.000Z',
      end: '2025-10-20T15:00:00.000Z',
      idempotencyKey: 'flow-hold-1',
    };

    const holdResponse = await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/holds`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(holdPayload)
      .expect(201);

    expect(createHoldUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: FIXTURES.clinic,
        tenantId: FIXTURES.tenant,
        idempotencyKey: 'flow-hold-1',
      }),
    );
    expect(new Date(holdResponse.body.ttlExpiresAt).getTime()).toBeLessThan(
      new Date(holdPayload.start).getTime(),
    );
    expect(holdResponse.body.status).toBe('pending');

    // 5) Listagem de auditoria
    const auditLog: ClinicAuditLog = {
      id: 'log-1',
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      event: 'clinic.created',
      performedBy: currentUser.id,
      detail: { field: 'value' },
      createdAt: new Date('2025-10-11T12:00:00.000Z'),
    };
    listAuditLogsUseCase.executeOrThrow.mockResolvedValueOnce({ data: [auditLog], total: 1 });

    const auditResponse = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/audit-logs`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ events: 'clinic.created', page: 1, limit: 10 })
      .expect(200);

    expect(listAuditLogsUseCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      events: ['clinic.created'],
      page: 1,
      limit: 10,
    });
    expect(auditResponse.body.total).toBe(1);
    expect(auditResponse.body.data[0].id).toBe(auditLog.id);
  });

  it('deve exportar logs de auditoria em CSV', async () => {
    const auditLog: ClinicAuditLog = {
      id: 'log-2',
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      event: 'clinic.updated',
      performedBy: currentUser.id,
      detail: { section: 'general', change: 'tradeName' },
      createdAt: new Date('2025-10-12T09:30:00.000Z'),
    };

    listAuditLogsUseCase.executeOrThrow.mockResolvedValueOnce({ data: [auditLog], total: 1 });

    const exportResponse = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/audit-logs/export`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ events: 'clinic.updated' })
      .expect(200);

    expect(listAuditLogsUseCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      events: ['clinic.updated'],
      page: 1,
      limit: 1000,
    });

    expect(exportResponse.headers['content-type']).toContain('text/csv');
    const csvLines = exportResponse.text.trim().split('\n');
    expect(csvLines[0]).toBe('id,tenantId,clinicId,event,performedBy,createdAt,detail');
    expect(csvLines[1]).toContain('"log-2"');
    expect(csvLines[1]).toContain('"clinic.updated"');
    expect(csvLines[1]).toContain('""section"":""general""');
  });
});
