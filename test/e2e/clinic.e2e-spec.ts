import { ConflictException, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ClinicsController } from '@modules/clinic/api/controllers/clinics.controller';
import { ClinicConfigurationController } from '@modules/clinic/api/controllers/clinic-configuration.controller';
import { ClinicInvitationController } from '@modules/clinic/api/controllers/clinic-invitation.controller';
import { ClinicHoldController } from '@modules/clinic/api/controllers/clinic-hold.controller';
import { ClinicAuditController } from '@modules/clinic/api/controllers/clinic-audit.controller';
import { ClinicMemberController } from '@modules/clinic/api/controllers/clinic-member.controller';
import { ClinicConfigurationExportService } from '@modules/clinic/services/clinic-configuration-export.service';
import { ClinicManagementExportService } from '@modules/clinic/services/clinic-management-export.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ClinicScopeGuard } from '@modules/clinic/guards/clinic-scope.guard';
import { ClinicAccessService } from '@modules/clinic/services/clinic-access.service';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import {
  CancelClinicProfessionalCoverageInput,
  CheckClinicProfessionalFinancialClearanceInput,
  Clinic,
  ClinicAppointmentConfirmationResult,
  ClinicAuditLog,
  ClinicConfigurationVersion,
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicHoldSettings,
  ClinicInvitation,
  ClinicInvitationEconomicSummary,
  ClinicMember,
  ClinicOverbookingReviewInput,
  ClinicProfessionalCoverage,
  ClinicProfessionalFinancialClearanceStatus,
  ClinicProfessionalPolicy,
  ClinicStaffRole,
  ClinicTemplateOverrideListResult,
  ClinicTemplatePropagationInput,
  CreateClinicInput,
  CreateClinicProfessionalCoverageInput,
  DeclineClinicInvitationInput,
  ListClinicProfessionalCoveragesQuery,
  ListClinicTemplateOverridesInput,
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
  IUpdateClinicSecuritySettingsUseCase as IUpdateClinicSecuritySettingsUseCaseToken,
  UpdateClinicSecuritySettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-security-settings.use-case.interface';
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
import {
  GetClinicSecuritySettingsInput,
  IGetClinicSecuritySettingsUseCase as IGetClinicSecuritySettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-security-settings.use-case.interface';
import { IPropagateClinicTemplateUseCase as IPropagateClinicTemplateUseCaseToken } from '@domain/clinic/interfaces/use-cases/propagate-clinic-template.use-case.interface';
import { IListClinicTemplateOverridesUseCase as IListClinicTemplateOverridesUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-template-overrides.use-case.interface';
import {
  IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken,
  InviteClinicProfessionalInput,
} from '@domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import {
  CreateClinicInvitationAddendumInput,
  ICreateClinicInvitationAddendumUseCase as ICreateClinicInvitationAddendumUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/create-clinic-invitation-addendum.use-case.interface';
import {
  AcceptClinicInvitationInput,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import { IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken } from '@domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import {
  IReissueClinicInvitationUseCase as IReissueClinicInvitationUseCaseToken,
  ReissueClinicInvitationInput,
} from '@domain/clinic/interfaces/use-cases/reissue-clinic-invitation.use-case.interface';
import { IDeclineClinicInvitationUseCase as IDeclineClinicInvitationUseCaseToken } from '@domain/clinic/interfaces/use-cases/decline-clinic-invitation.use-case.interface';
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
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '@domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken } from '@domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';
import { ICreateClinicProfessionalCoverageUseCase as ICreateClinicProfessionalCoverageUseCaseToken } from '@domain/clinic/interfaces/use-cases/create-clinic-professional-coverage.use-case.interface';
import { IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import { ICancelClinicProfessionalCoverageUseCase as ICancelClinicProfessionalCoverageUseCaseToken } from '@domain/clinic/interfaces/use-cases/cancel-clinic-professional-coverage.use-case.interface';
import {
  GetClinicProfessionalPolicyInput,
  IGetClinicProfessionalPolicyUseCase as IGetClinicProfessionalPolicyUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-professional-policy.use-case.interface';

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
    assertAlertAccess: jest.fn(async () => null),
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

  type ListClinicMembersInputShape = {
    clinicId: string;
    tenantId: string;
    status?: string[];
    roles?: ClinicStaffRole[];
    page?: number;
    limit?: number;
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
  const listTemplateOverridesUseCase = createUseCaseMock<
    ListClinicTemplateOverridesInput,
    ClinicTemplateOverrideListResult
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
  const getSecuritySettingsUseCase = createUseCaseMock<
    GetClinicSecuritySettingsInput,
    ClinicConfigurationVersion
  >();
  const updateSecuritySettingsUseCase = createUseCaseMock<
    UpdateClinicSecuritySettingsInput,
    ClinicConfigurationVersion
  >();

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
  const declineInvitationUseCase = createUseCaseMock<
    DeclineClinicInvitationInput,
    ClinicInvitation
  >();
  const createInvitationAddendumUseCase = createUseCaseMock<
    CreateClinicInvitationAddendumInput,
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
  const listMembersUseCase = createUseCaseMock<
    ListClinicMembersInputShape,
    { data: ClinicMember[]; total: number }
  >();
  const manageMemberUseCase = createUseCaseMock<unknown, ClinicMember>();
  const checkFinancialClearanceUseCase = createUseCaseMock<
    CheckClinicProfessionalFinancialClearanceInput,
    ClinicProfessionalFinancialClearanceStatus
  >();
  const getProfessionalPolicyUseCase = createUseCaseMock<
    GetClinicProfessionalPolicyInput,
    ClinicProfessionalPolicy
  >();
  const createProfessionalCoverageUseCase = createUseCaseMock<
    CreateClinicProfessionalCoverageInput,
    ClinicProfessionalCoverage
  >();
  const listProfessionalCoveragesUseCase = createUseCaseMock<
    ListClinicProfessionalCoveragesQuery,
    {
      data: ClinicProfessionalCoverage[];
      total: number;
      page: number;
      limit: number;
    }
  >();
  const cancelProfessionalCoverageUseCase = createUseCaseMock<
    CancelClinicProfessionalCoverageInput,
    ClinicProfessionalCoverage
  >();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        ClinicsController,
        ClinicConfigurationController,
        ClinicInvitationController,
        ClinicHoldController,
        ClinicAuditController,
        ClinicMemberController,
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
        {
          provide: IListClinicTemplateOverridesUseCaseToken,
          useValue: listTemplateOverridesUseCase,
        },
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
        { provide: IGetClinicSecuritySettingsUseCaseToken, useValue: getSecuritySettingsUseCase },
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
        {
          provide: IUpdateClinicSecuritySettingsUseCaseToken,
          useValue: updateSecuritySettingsUseCase,
        },
        { provide: IInviteClinicProfessionalUseCaseToken, useValue: inviteUseCase },
        { provide: IListClinicInvitationsUseCaseToken, useValue: listInvitationsUseCase },
        { provide: IAcceptClinicInvitationUseCaseToken, useValue: acceptInvitationUseCase },
        { provide: IRevokeClinicInvitationUseCaseToken, useValue: revokeInvitationUseCase },
        { provide: IReissueClinicInvitationUseCaseToken, useValue: reissueInvitationUseCase },
        { provide: IDeclineClinicInvitationUseCaseToken, useValue: declineInvitationUseCase },
        {
          provide: ICreateClinicInvitationAddendumUseCaseToken,
          useValue: createInvitationAddendumUseCase,
        },
        { provide: ICreateClinicHoldUseCaseToken, useValue: createHoldUseCase },
        { provide: IProcessClinicOverbookingUseCaseToken, useValue: processOverbookingUseCase },
        { provide: IConfirmClinicAppointmentUseCaseToken, useValue: confirmAppointmentUseCase },
        { provide: IListClinicAuditLogsUseCaseToken, useValue: listAuditLogsUseCase },
        { provide: IListClinicMembersUseCaseToken, useValue: listMembersUseCase },
        { provide: IManageClinicMemberUseCaseToken, useValue: manageMemberUseCase },
        {
          provide: ICheckClinicProfessionalFinancialClearanceUseCaseToken,
          useValue: checkFinancialClearanceUseCase,
        },
        {
          provide: IGetClinicProfessionalPolicyUseCaseToken,
          useValue: getProfessionalPolicyUseCase,
        },
        {
          provide: ICreateClinicProfessionalCoverageUseCaseToken,
          useValue: createProfessionalCoverageUseCase,
        },
        {
          provide: IListClinicProfessionalCoveragesUseCaseToken,
          useValue: listProfessionalCoveragesUseCase,
        },
        {
          provide: ICancelClinicProfessionalCoverageUseCaseToken,
          useValue: cancelProfessionalCoverageUseCase,
        },
        ClinicConfigurationExportService,
        ClinicManagementExportService,
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
    clinicAccessService.assertAlertAccess.mockClear();

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
      getSecuritySettingsUseCase,
      updateGeneralSettingsUseCase,
      propagateTemplateUseCase,
      listTemplateOverridesUseCase,
      holdSettingsUseCase,
      serviceSettingsUseCase,
      paymentSettingsUseCase,
      integrationSettingsUseCase,
      notificationSettingsUseCase,
      brandingSettingsUseCase,
      scheduleSettingsUseCase,
      updateSecuritySettingsUseCase,
      inviteUseCase,
      listInvitationsUseCase,
      acceptInvitationUseCase,
      revokeInvitationUseCase,
      reissueInvitationUseCase,
      declineInvitationUseCase,
      createInvitationAddendumUseCase,
      createHoldUseCase,
      processOverbookingUseCase,
      confirmAppointmentUseCase,
      listAuditLogsUseCase,
      listMembersUseCase,
      manageMemberUseCase,
      checkFinancialClearanceUseCase,
      getProfessionalPolicyUseCase,
      createProfessionalCoverageUseCase,
      listProfessionalCoveragesUseCase,
      cancelProfessionalCoverageUseCase,
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
      channelScope: 'direct',
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

    // 4.1) Tentativa de hold com conflito confirmado em outra clinica
    createHoldUseCase.executeOrThrow.mockRejectedValueOnce(
      new ConflictException('Profissional ja possui atendimento confirmado para este periodo'),
    );

    await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/holds`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send({
        tenantId: FIXTURES.tenant,
        professionalId: FIXTURES.professional,
        patientId: FIXTURES.patient,
        serviceTypeId: holdPayload.serviceTypeId,
        start: '2025-10-20T16:00:00.000Z',
        end: '2025-10-20T17:00:00.000Z',
        idempotencyKey: 'flow-hold-conflict',
      })
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Profissional ja possui atendimento confirmado para este periodo',
        );
      });

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

  it('deve recusar convite de clinica com motivo opcional', async () => {
    const economicSummary: ClinicInvitationEconomicSummary = {
      items: [
        {
          serviceTypeId: 'service-1',
          price: 250,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 60,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    };

    const declinedAt = new Date('2025-10-15T12:30:00.000Z');

    declineInvitationUseCase.executeOrThrow.mockResolvedValueOnce({
      id: FIXTURES.invitation,
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      issuedBy: currentUser.id,
      status: 'declined',
      tokenHash: 'hash',
      channel: 'email',
      channelScope: 'direct',
      expiresAt: new Date('2025-10-18T10:00:00.000Z'),
      economicSummary,
      acceptedEconomicSnapshot: undefined,
      createdAt: new Date('2025-10-10T09:00:00.000Z'),
      updatedAt: declinedAt,
      declinedAt,
      declinedBy: currentUser.id,
      targetEmail: undefined,
      acceptedAt: undefined,
      acceptedBy: undefined,
      revokedAt: undefined,
      revokedBy: undefined,
      revocationReason: null,
      metadata: { source: 'portal' },
    });

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/decline`)
      .send({ tenantId: FIXTURES.tenant, reason: 'Agenda cheia' })
      .expect(201);

    expect(declineInvitationUseCase.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      declinedBy: currentUser.id,
      reason: 'Agenda cheia',
    });
    expect(response.body.status).toBe('declined');
    expect(response.body.declinedBy).toBe(currentUser.id);
    expect(response.body.economicSummary.items[0].payoutValue).toBe(60);
  });

  it('deve retornar status financeiro do profissional da clinica', async () => {
    const clearance: ClinicProfessionalFinancialClearanceStatus = {
      requiresClearance: true,
      hasPendencies: false,
      pendingCount: 0,
      statusesEvaluated: ['chargeback', 'failed'],
    };

    checkFinancialClearanceUseCase.executeOrThrow.mockResolvedValueOnce(clearance);

    const response = await request(app.getHttpServer())
      .get(
        `/clinics/${FIXTURES.clinic}/members/professional/${FIXTURES.professional}/financial-clearance`,
      )
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(200);

    expect(checkFinancialClearanceUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
    });
    expect(response.body.requiresClearance).toBe(true);
    expect(response.body.statusesEvaluated).toEqual(['chargeback', 'failed']);
  });

  it('deve retornar politica clinica-profissional ativa', async () => {
    const economicSummary: ClinicInvitationEconomicSummary = {
      items: [
        {
          serviceTypeId: 'service-2',
          price: 320,
          currency: 'BRL',
          payoutModel: 'fixed',
          payoutValue: 120,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    };

    const policy: ClinicProfessionalPolicy = {
      id: 'policy-123',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      channelScope: 'both',
      economicSummary,
      effectiveAt: new Date('2025-10-11T08:00:00.000Z'),
      endedAt: undefined,
      sourceInvitationId: FIXTURES.invitation,
      acceptedBy: currentUser.id,
      createdAt: new Date('2025-10-11T09:00:00.000Z'),
      updatedAt: new Date('2025-10-11T09:30:00.000Z'),
    };

    getProfessionalPolicyUseCase.executeOrThrow.mockResolvedValueOnce(policy);

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/members/professional/${FIXTURES.professional}/policy`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(200);

    expect(getProfessionalPolicyUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
    });
    expect(response.body.id).toBe('policy-123');
    expect(response.body.channelScope).toBe('both');
    expect(response.body.economicSummary.items[0].payoutValue).toBe(120);
  });
});
