import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ClinicConfigurationController } from '@modules/clinic/api/controllers/clinic-configuration.controller';
import { ClinicInvitationController } from '@modules/clinic/api/controllers/clinic-invitation.controller';
import { ClinicInvitationOnboardingController } from '@modules/clinic/api/controllers/clinic-invitation-onboarding.controller';
import { ClinicMemberController } from '@modules/clinic/api/controllers/clinic-member.controller';
import { ClinicHoldController } from '@modules/clinic/api/controllers/clinic-hold.controller';
import { ClinicAuditController } from '@modules/clinic/api/controllers/clinic-audit.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { ClinicScopeGuard } from '@modules/clinic/guards/clinic-scope.guard';
import { ClinicManagementExportService } from '@modules/clinic/services/clinic-management-export.service';
import { ClinicConfigurationExportService } from '@modules/clinic/services/clinic-configuration-export.service';
import { UserEntity } from '@infrastructure/auth/entities/user.entity';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import {
  CancelClinicProfessionalCoverageInput,
  CheckClinicProfessionalFinancialClearanceInput,
  ClinicAppointmentConfirmationResult,
  ClinicAuditLog,
  ClinicConfigurationVersion,
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicInvitation,
  ClinicInvitationEconomicSummary,
  ClinicOverbookingReviewInput,
  ClinicProfessionalCoverage,
  ClinicProfessionalFinancialClearanceStatus,
  ClinicProfessionalPolicy,
  ClinicTemplateOverride,
  ClinicTemplateOverrideListResult,
  ClinicTemplatePropagationInput,
  CreateClinicProfessionalCoverageInput,
  DeclineClinicInvitationInput,
  ListClinicProfessionalCoveragesQuery,
  ListClinicTemplateOverridesInput,
} from '@domain/clinic/types/clinic.types';
import { ICreateClinicProfessionalCoverageUseCase as ICreateClinicProfessionalCoverageUseCaseToken } from '@domain/clinic/interfaces/use-cases/create-clinic-professional-coverage.use-case.interface';
import { IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import { ICancelClinicProfessionalCoverageUseCase as ICancelClinicProfessionalCoverageUseCaseToken } from '@domain/clinic/interfaces/use-cases/cancel-clinic-professional-coverage.use-case.interface';
import {
  CompleteClinicInvitationOnboardingInput,
  CompleteClinicInvitationOnboardingOutput,
  ICompleteClinicInvitationOnboardingUseCase as ICompleteClinicInvitationOnboardingUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/complete-clinic-invitation-onboarding.use-case.interface';
import {
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
  UpdateClinicGeneralSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import {
  IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken,
  UpdateClinicHoldSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import {
  IUpdateClinicTeamSettingsUseCase as IUpdateClinicTeamSettingsUseCaseToken,
  UpdateClinicTeamSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-team-settings.use-case.interface';
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
  IUpdateClinicSecuritySettingsUseCase as IUpdateClinicSecuritySettingsUseCaseToken,
  UpdateClinicSecuritySettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-security-settings.use-case.interface';
import {
  IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken,
  UpdateClinicScheduleSettingsInput,
} from '@domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
import { IPropagateClinicTemplateUseCase as IPropagateClinicTemplateUseCaseToken } from '@domain/clinic/interfaces/use-cases/propagate-clinic-template.use-case.interface';
import { IListClinicTemplateOverridesUseCase as IListClinicTemplateOverridesUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-template-overrides.use-case.interface';
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
import {
  GetClinicSecuritySettingsInput,
  IGetClinicSecuritySettingsUseCase as IGetClinicSecuritySettingsUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-security-settings.use-case.interface';
import { IGetClinicUseCase as IGetClinicUseCaseToken } from '@domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import {
  IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken,
  InviteClinicProfessionalInput,
} from '@domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '@domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '@domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import {
  AcceptClinicInvitationInput,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import {
  IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken,
  RevokeClinicInvitationInput,
} from '@domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import { IDeclineClinicInvitationUseCase as IDeclineClinicInvitationUseCaseToken } from '@domain/clinic/interfaces/use-cases/decline-clinic-invitation.use-case.interface';
import {
  IReissueClinicInvitationUseCase as IReissueClinicInvitationUseCaseToken,
  ReissueClinicInvitationInput,
} from '@domain/clinic/interfaces/use-cases/reissue-clinic-invitation.use-case.interface';
import {
  CreateClinicInvitationAddendumInput,
  ICreateClinicInvitationAddendumUseCase as ICreateClinicInvitationAddendumUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/create-clinic-invitation-addendum.use-case.interface';
import { ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken } from '@domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';
import {
  GetClinicProfessionalPolicyInput,
  IGetClinicProfessionalPolicyUseCase as IGetClinicProfessionalPolicyUseCaseToken,
} from '@domain/clinic/interfaces/use-cases/get-clinic-professional-policy.use-case.interface';
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

const binaryParser = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
  res.on('error', (err: Error) => callback(err, Buffer.alloc(0)));
};

const guardToggles: { allowRoles: boolean; allowScope: boolean } = {
  allowRoles: true,
  allowScope: true,
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
    canActivate(_context: ExecutionContext) {
      return guardToggles.allowRoles;
    }
  },
  ClinicScopeGuard: class implements Partial<ClinicScopeGuard> {
    canActivate(_context: ExecutionContext) {
      return guardToggles.allowScope;
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
    updateTeam: createUseCaseMock<UpdateClinicTeamSettingsInput, ClinicConfigurationVersion>(),
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
    updateSecurity: createUseCaseMock<
      UpdateClinicSecuritySettingsInput,
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
    propagateTemplate: createUseCaseMock<
      ClinicTemplatePropagationInput,
      ClinicConfigurationVersion[]
    >(),
    listTemplateOverrides: createUseCaseMock<
      ListClinicTemplateOverridesInput,
      ClinicTemplateOverrideListResult
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
    getSecurity: createUseCaseMock<GetClinicSecuritySettingsInput, ClinicConfigurationVersion>(),
    getBranding: createUseCaseMock<GetClinicBrandingSettingsInput, ClinicConfigurationVersion>(),
    getClinic: createUseCaseMock<{ clinicId: string; tenantId: string }, unknown>(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicConfigurationController],
      providers: [
        { provide: IUpdateClinicGeneralSettingsUseCaseToken, useValue: useCases.updateGeneral },
        { provide: IUpdateClinicHoldSettingsUseCaseToken, useValue: useCases.updateHold },
        { provide: IUpdateClinicTeamSettingsUseCaseToken, useValue: useCases.updateTeam },
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
        {
          provide: IUpdateClinicSecuritySettingsUseCaseToken,
          useValue: useCases.updateSecurity,
        },
        { provide: IUpdateClinicBrandingSettingsUseCaseToken, useValue: useCases.updateBranding },
        { provide: IUpdateClinicScheduleSettingsUseCaseToken, useValue: useCases.updateSchedule },
        {
          provide: IPropagateClinicTemplateUseCaseToken,
          useValue: useCases.propagateTemplate,
        },
        {
          provide: IListClinicTemplateOverridesUseCaseToken,
          useValue: useCases.listTemplateOverrides,
        },
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
        {
          provide: IGetClinicSecuritySettingsUseCaseToken,
          useValue: useCases.getSecurity,
        },
        { provide: IGetClinicBrandingSettingsUseCaseToken, useValue: useCases.getBranding },
        { provide: IGetClinicUseCaseToken, useValue: useCases.getClinic },
        ClinicConfigurationExportService,
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
    Object.values(useCases).forEach((mock) => {
      mock.execute.mockReset();
      mock.executeOrThrow.mockReset();
    });
    guardToggles.allowRoles = true;
    guardToggles.allowScope = true;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clinics/:id/settings/general deve retornar versao atual', async () => {
    const version: ClinicConfigurationVersion = {
      id: 'version-1',
      clinicId: FIXTURES.clinic,
      section: 'general',
      version: 3,
      payload: {
        tradeName: 'Clinica Onterapi',
        address: { city: 'Sao Paulo', state: 'SP', zipCode: '01000-000', street: 'Rua A' },
        contact: { email: 'contato@onterapi.com' },
      },
      createdBy: currentUser.id,
      createdAt: new Date('2025-10-10T10:00:00.000Z'),
      appliedAt: new Date('2025-10-10T10:05:00.000Z'),
      notes: 'Primeira versao',
      autoApply: true,
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
    expect(response.body.state).toBe('saved');
    expect(response.body.autoApply).toBe(true);
  });

  it('GET /clinics/:id/settings/template-overrides retorna overrides paginados', async () => {
    const override: ClinicTemplateOverride = {
      id: 'override-1',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      templateClinicId: 'template-clinic',
      section: 'services',
      overrideVersion: 3,
      overridePayload: { allowOnline: false },
      overrideHash: 'hash-123',
      baseTemplateVersionId: 'template-version-5',
      baseTemplateVersionNumber: 5,
      appliedConfigurationVersionId: 'config-version-2',
      createdBy: currentUser.id,
      createdAt: new Date('2025-09-10T10:00:00.000Z'),
      supersededAt: undefined,
      supersededBy: undefined,
      updatedAt: new Date('2025-09-11T08:30:00.000Z'),
    };

    useCases.listTemplateOverrides.executeOrThrow.mockResolvedValue({
      data: [override],
      total: 11,
      page: 2,
      limit: 5,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/template-overrides`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({
        tenantId: FIXTURES.tenant,
        section: 'services',
        includeSuperseded: 'true',
        page: 2,
        limit: 5,
      })
      .expect(200);

    expect(useCases.listTemplateOverrides.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      section: 'services',
      includeSuperseded: true,
      page: 2,
      limit: 5,
    });

    expect(response.body).toEqual({
      data: [
        {
          id: override.id,
          clinicId: override.clinicId,
          tenantId: override.tenantId,
          templateClinicId: override.templateClinicId,
          section: override.section,
          overrideVersion: override.overrideVersion,
          overridePayload: override.overridePayload,
          overrideHash: override.overrideHash,
          baseTemplateVersionId: override.baseTemplateVersionId,
          baseTemplateVersionNumber: override.baseTemplateVersionNumber,
          appliedConfigurationVersionId: override.appliedConfigurationVersionId,
          createdBy: override.createdBy,
          createdAt: override.createdAt.toISOString(),
          supersededAt: undefined,
          supersededBy: undefined,
          updatedAt: override.updatedAt?.toISOString(),
        },
      ],
      total: 11,
      page: 2,
      limit: 5,
      hasNextPage: true,
    });
  });

  it('GET /clinics/:id/settings/template-overrides/export gera CSV agregando paginas', async () => {
    const overrideA: ClinicTemplateOverride = {
      id: 'override-a',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      templateClinicId: 'template-root',
      section: 'team',
      overrideVersion: 2,
      overridePayload: { quotas: [{ role: 'CLINIC_OWNER', limit: 1 }] },
      overrideHash: 'hash-a',
      baseTemplateVersionId: 'base-1',
      baseTemplateVersionNumber: 1,
      appliedConfigurationVersionId: 'config-1',
      createdBy: currentUser.id,
      createdAt: new Date('2025-09-10T12:00:00.000Z'),
      updatedAt: new Date('2025-09-10T12:30:00.000Z'),
    };
    const overrideB: ClinicTemplateOverride = {
      id: 'override-b',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      templateClinicId: 'template-root',
      section: 'team',
      overrideVersion: 3,
      overridePayload: { quotas: [{ role: 'CLINIC_MANAGER', limit: 2 }] },
      overrideHash: 'hash-b',
      baseTemplateVersionId: 'base-1',
      baseTemplateVersionNumber: 1,
      appliedConfigurationVersionId: 'config-2',
      createdBy: currentUser.id,
      createdAt: new Date('2025-09-11T08:00:00.000Z'),
      updatedAt: new Date('2025-09-11T08:30:00.000Z'),
      supersededAt: undefined,
      supersededBy: undefined,
    };

    useCases.listTemplateOverrides.executeOrThrow
      .mockResolvedValueOnce({
        data: [overrideA],
        total: 2,
        page: 1,
        limit: 1,
      })
      .mockResolvedValueOnce({
        data: [overrideB],
        total: 2,
        page: 2,
        limit: 1,
      });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/template-overrides/export`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ limit: 1, section: 'team' })
      .expect(200);

    expect(useCases.listTemplateOverrides.executeOrThrow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: FIXTURES.tenant,
        clinicId: FIXTURES.clinic,
        section: 'team',
        includeSuperseded: undefined,
        page: 1,
        limit: 1,
      }),
    );
    expect(useCases.listTemplateOverrides.executeOrThrow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenantId: FIXTURES.tenant,
        clinicId: FIXTURES.clinic,
        section: 'team',
        includeSuperseded: undefined,
        page: 2,
        limit: 1,
      }),
    );

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('clinic-template-overrides');
    expect(response.text.split('\n')).toHaveLength(3);
    expect(response.text).toContain('overrideId');
    expect(response.text).toContain('override-a');
    expect(response.text).toContain('override-b');
  });

  it('GET /clinics/:id/settings/template-overrides/export.xls entrega planilha em buffer', async () => {
    const override: ClinicTemplateOverride = {
      id: 'override-xls',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      templateClinicId: 'template-root',
      section: 'notifications',
      overrideVersion: 5,
      overridePayload: { quietHours: { enabled: true, start: '20:00', end: '07:00' } },
      overrideHash: 'hash-xls',
      baseTemplateVersionId: 'base-quiet',
      baseTemplateVersionNumber: 4,
      appliedConfigurationVersionId: 'config-quiet',
      createdBy: currentUser.id,
      createdAt: new Date('2025-09-12T09:00:00.000Z'),
      updatedAt: new Date('2025-09-12T09:05:00.000Z'),
    };

    useCases.listTemplateOverrides.executeOrThrow.mockResolvedValueOnce({
      data: [override],
      total: 1,
      page: 1,
      limit: 100,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/template-overrides/export.xls`)
      .set('x-tenant-id', FIXTURES.tenant)
      .buffer()
      .parse(binaryParser)
      .expect(200);

    expect(useCases.listTemplateOverrides.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      section: undefined,
      includeSuperseded: undefined,
      page: 1,
      limit: 100,
    });

    expect(response.headers['content-type']).toContain('application/vnd.ms-excel');
    expect(response.headers['content-disposition']).toContain('clinic-template-overrides');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.toString('utf-8')).toContain('<Worksheet ss:Name="TemplateOverrides">');
  });

  it('GET /clinics/:id/settings/template-overrides/export.pdf retorna resumo textual', async () => {
    useCases.listTemplateOverrides.executeOrThrow.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/template-overrides/export.pdf`)
      .set('x-tenant-id', FIXTURES.tenant)
      .buffer()
      .parse(binaryParser)
      .expect(200);

    expect(useCases.listTemplateOverrides.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      section: undefined,
      includeSuperseded: undefined,
      page: 1,
      limit: 100,
    });

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body.toString('utf-8')).toContain('Nenhum override encontrado');
  });

  it('GET /clinics/:id/settings/template-overrides/export retorna 403 para papel sem permissao', async () => {
    guardToggles.allowRoles = false;

    await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/template-overrides/export`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(403);

    expect(useCases.listTemplateOverrides.executeOrThrow).not.toHaveBeenCalled();
  });

  it('GET /clinics/:id/settings/template-overrides/export.xls retorna 403 quando o escopo bloqueia a clinica', async () => {
    guardToggles.allowScope = false;

    await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/template-overrides/export.xls`)
      .set('x-tenant-id', FIXTURES.tenant)
      .buffer()
      .parse(binaryParser)
      .expect(403);

    expect(useCases.listTemplateOverrides.executeOrThrow).not.toHaveBeenCalled();
  });

  it('PATCH /clinics/:id/settings/general deve mapear payload e aplicar versao', async () => {
    const requestPayload = {
      tenantId: FIXTURES.tenant,
      generalSettings: {
        tradeName: 'Clinica Atualizada',
        legalName: 'Clinica Atualizada LTDA',
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
        notes: 'Observacao importante',
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
      autoApply: true,
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
    expect(response.body.state).toBe('saved');
    expect(response.body.autoApply).toBe(true);
  });

  it('GET /clinics/:id/settings/security deve retornar configuracao atual', async () => {
    const version: ClinicConfigurationVersion = {
      id: 'security-version-1',
      clinicId: FIXTURES.clinic,
      section: 'security',
      version: 2,
      payload: {
        securitySettings: {
          twoFactor: { enabled: true, requiredRoles: ['CLINIC_OWNER'], backupCodesEnabled: false },
          passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialCharacters: false,
          },
          session: { idleTimeoutMinutes: 30, absoluteTimeoutMinutes: 240 },
          loginAlerts: { email: true, whatsapp: false },
          ipRestrictions: { enabled: false, allowlist: [], blocklist: [] },
          audit: { retentionDays: 180, exportEnabled: true },
          metadata: { source: 'defaults' },
        },
      },
      createdBy: currentUser.id,
      createdAt: new Date('2025-10-12T12:00:00.000Z'),
      autoApply: false,
    };
    useCases.getSecurity.executeOrThrow.mockResolvedValue(version);

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/security`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(200);

    expect(useCases.getSecurity.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
    });

    expect(response.body.id).toBe(version.id);
    expect(response.body.section).toBe('security');
    expect(response.body.payload.twoFactor.enabled).toBe(true);
    expect(response.body.payload.passwordPolicy.minLength).toBe(12);
  });

  it('PATCH /clinics/:id/settings/security deve mapear payload e aplicar versao', async () => {
    const requestPayload = {
      tenantId: FIXTURES.tenant,
      securitySettings: {
        twoFactor: {
          enabled: true,
          requiredRoles: ['CLINIC_OWNER'],
          backupCodesEnabled: true,
        },
        passwordPolicy: {
          minLength: 14,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true,
        },
        session: {
          idleTimeoutMinutes: 25,
          absoluteTimeoutMinutes: 180,
        },
        loginAlerts: {
          email: true,
          whatsapp: true,
        },
        ipRestrictions: {
          enabled: true,
          allowlist: ['10.0.0.0/24'],
          blocklist: ['192.168.0.1'],
        },
        audit: {
          retentionDays: 365,
          exportEnabled: true,
        },
        compliance: {
          documents: [
            {
              type: 'lgpd',
              required: true,
              status: 'pending',
              expiresAt: '2025-12-01T00:00:00Z',
            },
          ],
        },
        metadata: {
          source: 'manual-update',
        },
      },
    };

    const updatedVersion: ClinicConfigurationVersion = {
      id: 'security-version-2',
      clinicId: FIXTURES.clinic,
      section: 'security',
      version: 3,
      payload: requestPayload.securitySettings,
      createdBy: currentUser.id,
      createdAt: new Date('2025-10-12T12:30:00.000Z'),
      appliedAt: new Date('2025-10-12T12:31:00.000Z'),
      notes: 'Atualizacao manual',
      autoApply: false,
    };
    useCases.updateSecurity.executeOrThrow.mockResolvedValue(updatedVersion);

    const response = await request(app.getHttpServer())
      .patch(`/clinics/${FIXTURES.clinic}/settings/security`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(requestPayload)
      .expect(200);

    expect(useCases.updateSecurity.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      requestedBy: currentUser.id,
      securitySettings: expect.objectContaining({
        twoFactor: {
          enabled: true,
          requiredRoles: ['CLINIC_OWNER'],
          backupCodesEnabled: true,
        },
        passwordPolicy: expect.objectContaining({
          minLength: 14,
          requireSpecialCharacters: true,
        }),
        session: expect.objectContaining({
          idleTimeoutMinutes: 25,
          absoluteTimeoutMinutes: 180,
        }),
        ipRestrictions: expect.objectContaining({
          enabled: true,
          allowlist: ['10.0.0.0/24'],
          blocklist: ['192.168.0.1'],
        }),
        compliance: {
          documents: [
            expect.objectContaining({
              type: 'lgpd',
              required: true,
              expiresAt: new Date('2025-12-01T00:00:00Z'),
            }),
          ],
        },
        metadata: { source: 'manual-update' },
      }),
    });

    expect(response.body.section).toBe('security');
    expect(response.body.version).toBe(updatedVersion.version);
    expect(response.body.payload.twoFactor.backupCodesEnabled).toBe(true);
  });

  it('PATCH /clinics/:id/settings/propagate deve propagar template para as clinicas alvo', async () => {
    const targetClinicA = '77777777-7777-7777-7777-777777777771';
    const targetClinicB = '77777777-7777-7777-7777-777777777772';
    const requestPayload = {
      tenantId: FIXTURES.tenant,
      targetClinicIds: [FIXTURES.clinic, targetClinicA, targetClinicB, targetClinicA],
      sections: ['general', 'services'],
      versionNotes: 'Propagacao 2',
    };

    const propagatedVersions: ClinicConfigurationVersion[] = [
      {
        id: 'version-general',
        clinicId: targetClinicA,
        section: 'general',
        version: 5,
        payload: { tradeName: 'Template Geral' },
        createdBy: currentUser.id,
        createdAt: new Date('2025-10-12T10:00:00.000Z'),
        appliedAt: new Date('2025-10-12T10:01:00.000Z'),
        notes: 'Propagacao 2',
        autoApply: true,
      },
      {
        id: 'version-services',
        clinicId: targetClinicB,
        section: 'services',
        version: 7,
        payload: { services: ['consulta', 'retorno'] },
        createdBy: currentUser.id,
        createdAt: new Date('2025-10-12T10:05:00.000Z'),
        appliedAt: new Date('2025-10-12T10:06:00.000Z'),
        notes: 'Propagacao 2',
        autoApply: true,
      },
    ];

    useCases.propagateTemplate.executeOrThrow.mockResolvedValue(propagatedVersions);

    const response = await request(app.getHttpServer())
      .patch(`/clinics/${FIXTURES.clinic}/settings/propagate`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(requestPayload)
      .expect(200);

    expect(useCases.propagateTemplate.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      templateClinicId: FIXTURES.clinic,
      targetClinicIds: [targetClinicA, targetClinicB],
      sections: ['general', 'services'],
      versionNotes: 'Propagacao 2',
      triggeredBy: currentUser.id,
    });

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      id: propagatedVersions[0].id,
      clinicId: propagatedVersions[0].clinicId,
      section: propagatedVersions[0].section,
      state: 'saved',
      autoApply: true,
    });
    expect(response.body[1]).toMatchObject({
      id: propagatedVersions[1].id,
      clinicId: propagatedVersions[1].clinicId,
      section: propagatedVersions[1].section,
    });
  });

  it('GET /clinics/:id/settings/propagation deve retornar snapshot da ultima propagacao', async () => {
    const clinicMetadata = {
      templatePropagation: {
        templateClinicId: 'template-uuid',
        lastPropagationAt: '2025-10-12T10:06:00.000Z',
        lastTriggeredBy: 'user-123',
        sections: {
          general: {
            templateVersionId: 'version-general',
            propagatedVersionId: 'version-general-prop',
            propagatedAt: '2025-10-12T10:01:00.000Z',
            triggeredBy: 'user-123',
          },
        },
      },
    };

    useCases.getClinic.executeOrThrow.mockResolvedValue({
      id: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      name: 'Clinica Propagation',
      slug: 'clinica-propagation',
      status: 'active',
      document: undefined,
      primaryOwnerId: currentUser.id,
      configurationVersions: {},
      holdSettings: {
        ttlMinutes: 30,
        minAdvanceMinutes: 60,
        maxAdvanceMinutes: undefined,
        allowOverbooking: false,
        overbookingThreshold: undefined,
        resourceMatchingStrict: true,
      },
      createdAt: new Date('2025-10-01T10:00:00.000Z'),
      updatedAt: new Date('2025-10-12T10:06:00.000Z'),
      deletedAt: undefined,
      metadata: clinicMetadata,
    });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/settings/propagation`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(200);

    expect(useCases.getClinic.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
    });

    expect(response.body).toMatchObject({
      templateClinicId: clinicMetadata.templatePropagation.templateClinicId,
      lastTriggeredBy: clinicMetadata.templatePropagation.lastTriggeredBy,
    });
    expect(response.body.lastPropagationAt).toBe(
      clinicMetadata.templatePropagation.lastPropagationAt,
    );
    expect(response.body.sections).toHaveLength(1);
    expect(response.body.sections[0]).toMatchObject({
      section: 'general',
      templateVersionId: 'version-general',
      propagatedVersionId: 'version-general-prop',
      triggeredBy: 'user-123',
    });
    expect(response.body.sections[0].propagatedAt).toBe(
      clinicMetadata.templatePropagation.sections.general.propagatedAt,
    );
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
    channelScope: overrides.channelScope ?? 'direct',
    expiresAt: overrides.expiresAt ?? new Date('2025-11-01T12:00:00.000Z'),
    acceptedAt: overrides.acceptedAt,
    acceptedBy: overrides.acceptedBy,
    acceptedEconomicSnapshot:
      overrides.acceptedEconomicSnapshot ??
      (overrides.status === 'accepted'
        ? {
            ...economicSummary,
            items: economicSummary.items.map((item) => ({ ...item })),
          }
        : undefined),
    revokedAt: overrides.revokedAt,
    revokedBy: overrides.revokedBy,
    revocationReason: overrides.revocationReason ?? null,
    declinedAt: overrides.declinedAt,
    declinedBy: overrides.declinedBy,
    economicSummary: overrides.economicSummary ?? economicSummary,
    createdAt: overrides.createdAt ?? new Date('2025-10-01T12:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-10-01T12:00:00.000Z'),
    metadata: { ...(overrides.metadata ?? { issuedToken: 'token-123', source: 'manager' }) },
  });

  const useCases = {
    invite: createUseCaseMock<InviteClinicProfessionalInput, ClinicInvitation>(),
    list: createUseCaseMock<
      ListClinicInvitationsInputShape,
      { data: ClinicInvitation[]; total: number }
    >(),
    decline: createUseCaseMock<DeclineClinicInvitationInput, ClinicInvitation>(),
    accept: createUseCaseMock<AcceptClinicInvitationInput, ClinicInvitation>(),
    revoke: createUseCaseMock<RevokeClinicInvitationInput, ClinicInvitation>(),
    reissue: createUseCaseMock<ReissueClinicInvitationInput, ClinicInvitation>(),
    addendum: createUseCaseMock<CreateClinicInvitationAddendumInput, ClinicInvitation>(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicInvitationController],
      providers: [
        { provide: IInviteClinicProfessionalUseCaseToken, useValue: useCases.invite },
        { provide: IListClinicInvitationsUseCaseToken, useValue: useCases.list },
        { provide: IAcceptClinicInvitationUseCaseToken, useValue: useCases.accept },
        { provide: IRevokeClinicInvitationUseCaseToken, useValue: useCases.revoke },
        { provide: IDeclineClinicInvitationUseCaseToken, useValue: useCases.decline },
        { provide: IReissueClinicInvitationUseCaseToken, useValue: useCases.reissue },
        {
          provide: ICreateClinicInvitationAddendumUseCaseToken,
          useValue: useCases.addendum,
        },
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
      channelScope: 'direct',
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
      channelScope: payload.channelScope,
      economicSummary,
      expiresAt: new Date(payload.expiresAt),
      metadata: payload.metadata,
    });
    expect(response.body.token).toBe('token-123');
    expect(response.body.metadata).toEqual({ source: 'manager' });
  });

  it('POST /clinics/:id/invitations/addendums deve emitir aditivo com metadata addendum e token exposto', async () => {
    const effectiveAt = new Date('2025-12-01T00:00:00.000Z');
    const expiresAt = new Date('2025-12-31T12:00:00.000Z');
    const addendumInvitation = buildInvitation({
      metadata: {
        issuedToken: 'token-addendum',
        kind: 'addendum',
        addendum: {
          effectiveAt: effectiveAt.toISOString(),
        },
        source: 'finance',
      },
    });
    useCases.addendum.executeOrThrow.mockResolvedValue(addendumInvitation);

    const payload = {
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      channel: 'email' as const,
      channelScope: 'marketplace' as const,
      economicSummary: {
        items: economicSummary.items,
        orderOfRemainders: economicSummary.orderOfRemainders,
        roundingStrategy: 'half_even' as const,
      },
      expiresAt: expiresAt.toISOString(),
      effectiveAt: effectiveAt.toISOString(),
      metadata: { origin: 'dashboard-aditivo' },
    };

    const response = await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/invitations/addendums`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(payload)
      .expect(201);

    expect(useCases.addendum.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      issuedBy: currentUser.id,
      professionalId: payload.professionalId,
      channel: payload.channel,
      channelScope: payload.channelScope,
      economicSummary,
      expiresAt,
      effectiveAt,
      metadata: payload.metadata,
    });
    expect(response.body.token).toBe('token-addendum');
    expect(response.body.metadata).toEqual({
      kind: 'addendum',
      addendum: { effectiveAt: effectiveAt.toISOString() },
      source: 'finance',
    });
    expect(response.body.status).toBe('pending');
  });

  it('POST /clinics/:id/invitations/addendums deve propagar 403 quando use case negar acesso', async () => {
    useCases.addendum.executeOrThrow.mockRejectedValueOnce(
      new ForbiddenException('Profissional nao pertence a clinica'),
    );

    await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/invitations/addendums`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send({
        tenantId: FIXTURES.tenant,
        professionalId: FIXTURES.professional,
        channel: 'email',
        economicSummary: {
          items: economicSummary.items,
          orderOfRemainders: economicSummary.orderOfRemainders,
          roundingStrategy: 'half_even',
        },
        expiresAt: new Date('2025-12-31T12:00:00.000Z').toISOString(),
      })
      .expect(403);

    expect(useCases.addendum.executeOrThrow).toHaveBeenCalledTimes(1);
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
    expect(response.body.acceptedEconomicSnapshot).toBeDefined();
    expect(response.body.acceptedEconomicSnapshot.items[0].payoutValue).toBe(
      economicSummary.items[0].payoutValue,
    );
  });

  it('POST /clinics/invitations/:id/decline deve recusar convite', async () => {
    const declinedInvitation = buildInvitation({
      status: 'declined',
      declinedBy: currentUser.id,
      declinedAt: new Date('2025-10-12T10:00:00.000Z'),
    });
    useCases.decline.executeOrThrow.mockResolvedValue(declinedInvitation);

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/decline`)
      .send({ tenantId: FIXTURES.tenant, reason: 'Nao tenho disponibilidade' })
      .expect(201);

    expect(useCases.decline.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      declinedBy: currentUser.id,
      reason: 'Nao tenho disponibilidade',
    });
    expect(response.body.status).toBe('declined');
    expect(response.body.declinedBy).toBe(currentUser.id);
  });

  it('POST /clinics/invitations/:id/revoke deve revogar convite', async () => {
    const revokedInvitation = buildInvitation({ status: 'revoked', revokedBy: currentUser.id });
    useCases.revoke.executeOrThrow.mockResolvedValue(revokedInvitation);

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/revoke`)
      .send({ tenantId: FIXTURES.tenant, reason: 'Atualizacao economica' })
      .expect(201);

    expect(useCases.revoke.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      revokedBy: currentUser.id,
      reason: 'Atualizacao economica',
    });
    expect(response.body.status).toBe('revoked');
    expect(response.body.revokedBy).toBe(currentUser.id);
  });

  it('POST /clinics/invitations/:id/reissue deve reemitir convite com novo token', async () => {
    const reissuedInvitation = buildInvitation({
      metadata: { issuedToken: 'token-reissue', source: 'manager' },
    });
    useCases.reissue.executeOrThrow.mockResolvedValue(reissuedInvitation);

    const payload = {
      tenantId: FIXTURES.tenant,
      expiresAt: new Date('2025-12-31T12:00:00.000Z').toISOString(),
      channel: 'email',
      channelScope: 'direct',
    };

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${FIXTURES.invitation}/reissue`)
      .send(payload)
      .expect(201);

    expect(useCases.reissue.executeOrThrow).toHaveBeenCalledWith({
      invitationId: FIXTURES.invitation,
      tenantId: FIXTURES.tenant,
      reissuedBy: currentUser.id,
      expiresAt: new Date(payload.expiresAt),
      channel: payload.channel,
      channelScope: payload.channelScope,
    });
    expect(response.body.token).toBe('token-reissue');
    expect(response.body.metadata).toEqual({ source: 'manager' });
    expect(response.body.status).toBe('pending');
  });
});

describe('ClinicInvitationOnboardingController (integration)', () => {
  let app: INestApplication;
  const useCase = createUseCaseMock<
    CompleteClinicInvitationOnboardingInput,
    CompleteClinicInvitationOnboardingOutput
  >();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicInvitationOnboardingController],
      providers: [
        {
          provide: ICompleteClinicInvitationOnboardingUseCaseToken,
          useValue: useCase,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    useCase.execute.mockReset();
    useCase.executeOrThrow.mockReset();
    guardToggles.allowRoles = true;
    guardToggles.allowScope = true;
  });

  afterEach(() => {
    guardToggles.allowRoles = true;
    guardToggles.allowScope = true;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /clinics/invitations/:invitationId/onboarding deve concluir onboarding e retornar snapshot', async () => {
    const invitation: ClinicInvitation = {
      id: FIXTURES.invitation,
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      targetEmail: 'new.pro@example.com',
      issuedBy: currentUser.id,
      status: 'pending',
      tokenHash: 'hash-123',
      channel: 'email',
      channelScope: 'direct',
      expiresAt: new Date('2025-10-15T10:00:00.000Z'),
      economicSummary: {
        items: [
          {
            serviceTypeId: 'service-123',
            price: 200,
            currency: 'BRL',
            payoutModel: 'percentage',
            payoutValue: 50,
          },
        ],
        orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
        roundingStrategy: 'half_even',
      },
      createdAt: new Date('2025-10-10T09:00:00.000Z'),
      updatedAt: new Date('2025-10-10T09:00:00.000Z'),
      metadata: {},
    };

    const user = {
      id: 'user-onboarding',
      email: invitation.targetEmail,
      name: 'Pro Example',
      slug: 'pro-example',
    } as unknown as UserEntity;

    useCase.executeOrThrow.mockResolvedValue({
      invitation,
      user,
    });

    const response = await request(app.getHttpServer())
      .post(`/clinics/invitations/${invitation.id}/onboarding`)
      .send({
        tenantId: invitation.tenantId,
        token: 'token-abc123',
        name: 'Pro Example',
        cpf: '123.456.789-09',
        phone: '+55 11 91234-5678',
        password: 'StrongPass1!',
        passwordConfirmation: 'StrongPass1!',
      })
      .expect(201);

    expect(useCase.executeOrThrow).toHaveBeenCalledWith({
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      token: 'token-abc123',
      name: 'Pro Example',
      cpf: '12345678909',
      phone: '+55 11 91234-5678',
      password: 'StrongPass1!',
    });

    expect(response.body.user).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      slug: user.slug,
    });

    expect(response.body.invitation).toMatchObject({
      id: invitation.id,
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      targetEmail: invitation.targetEmail,
      issuedBy: invitation.issuedBy,
      status: invitation.status,
      channel: invitation.channel,
      channelScope: invitation.channelScope,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString(),
      economicSummary: {
        items: [
          {
            serviceTypeId: 'service-123',
            price: 200,
            currency: 'BRL',
            payoutModel: 'percentage',
            payoutValue: 50,
          },
        ],
        orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
        roundingStrategy: 'half_even',
        examples: [
          {
            currency: 'BRL',
            patientPays: 200,
            professionalReceives: 100,
            remainder: 100,
          },
        ],
      },
      metadata: {},
    });
  });
});

describe('ClinicHoldController (integration)', () => {
  let app: INestApplication;
  const createHoldUseCase = createUseCaseMock<ClinicHoldRequestInput, ClinicHold>();
  const confirmHoldUseCase = createUseCaseMock<
    ClinicHoldConfirmationInput,
    ClinicAppointmentConfirmationResult
  >();
  const processOverbookingUseCase = createUseCaseMock<ClinicOverbookingReviewInput, ClinicHold>();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicHoldController],
      providers: [
        { provide: ICreateClinicHoldUseCaseToken, useValue: createHoldUseCase },
        { provide: IConfirmClinicAppointmentUseCaseToken, useValue: confirmHoldUseCase },
        { provide: IProcessClinicOverbookingUseCaseToken, useValue: processOverbookingUseCase },
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
    createHoldUseCase.execute.mockReset();
    createHoldUseCase.executeOrThrow.mockReset();
    confirmHoldUseCase.execute.mockReset();
    confirmHoldUseCase.executeOrThrow.mockReset();
    processOverbookingUseCase.execute.mockReset();
    processOverbookingUseCase.executeOrThrow.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /clinics/:id/holds deve criar hold respeitando tenant e conversao de datas', async () => {
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

  it('retorna 409 quando existe atendimento confirmado em outra clinica do tenant', async () => {
    const payload = {
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      patientId: FIXTURES.patient,
      serviceTypeId: '88888888-8888-8888-8888-888888888888',
      start: '2025-12-01T15:00:00.000Z',
      end: '2025-12-01T16:00:00.000Z',
      idempotencyKey: 'hold-conflict',
    };

    createHoldUseCase.executeOrThrow.mockRejectedValue(
      new ConflictException('Profissional ja possui atendimento confirmado para este periodo'),
    );

    await request(app.getHttpServer())
      .post(`/clinics/${FIXTURES.clinic}/holds`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(payload)
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Profissional ja possui atendimento confirmado para este periodo',
        );
      });
  });

  it('PUT /clinics/:clinicId/holds/:holdId/overbooking decide sobre solicitacoes pendentes', async () => {
    const payload = {
      tenantId: FIXTURES.tenant,
      approve: false,
      justification: 'Risco elevado de sobreposicao',
    };

    const hold: ClinicHold = {
      id: 'hold-2',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      patientId: FIXTURES.patient,
      serviceTypeId: 'service-1',
      start: new Date('2025-12-01T12:00:00.000Z'),
      end: new Date('2025-12-01T13:00:00.000Z'),
      ttlExpiresAt: new Date('2025-12-01T11:40:00.000Z'),
      status: 'cancelled',
      idempotencyKey: 'hold-2-key',
      createdBy: currentUser.id,
      createdAt: new Date('2025-11-30T12:00:00.000Z'),
      updatedAt: new Date('2025-11-30T12:00:00.000Z'),
      metadata: {
        overbooking: {
          status: 'rejected',
          riskScore: 55,
          justification: payload.justification,
        },
      },
    };

    processOverbookingUseCase.executeOrThrow.mockResolvedValue(hold);

    const response = await request(app.getHttpServer())
      .put(`/clinics/${FIXTURES.clinic}/holds/${hold.id}/overbooking`)
      .set('x-tenant-id', FIXTURES.tenant)
      .send(payload)
      .expect(200);

    expect(processOverbookingUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      holdId: hold.id,
      tenantId: FIXTURES.tenant,
      approve: payload.approve,
      justification: payload.justification,
      performedBy: currentUser.id,
    });

    expect(response.body.id).toBe(hold.id);
    expect(response.body.status).toBe('cancelled');
    expect(response.body.metadata.overbooking.status).toBe('rejected');
  });
});

describe('ClinicMemberController (integration)', () => {
  let app: INestApplication;
  const useCases = {
    list: createUseCaseMock<any, { data: unknown[]; total: number }>(),
    manage: createUseCaseMock<any, unknown>(),
    financialClearance: createUseCaseMock<
      CheckClinicProfessionalFinancialClearanceInput,
      ClinicProfessionalFinancialClearanceStatus
    >(),
    policy: createUseCaseMock<GetClinicProfessionalPolicyInput, ClinicProfessionalPolicy>(),
    createCoverage: createUseCaseMock<
      CreateClinicProfessionalCoverageInput,
      ClinicProfessionalCoverage
    >(),
    listCoverages: createUseCaseMock<
      ListClinicProfessionalCoveragesQuery,
      { data: ClinicProfessionalCoverage[]; total: number }
    >(),
    cancelCoverage: createUseCaseMock<
      CancelClinicProfessionalCoverageInput,
      ClinicProfessionalCoverage
    >(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicMemberController],
      providers: [
        { provide: IListClinicMembersUseCaseToken, useValue: useCases.list },
        { provide: IManageClinicMemberUseCaseToken, useValue: useCases.manage },
        {
          provide: ICheckClinicProfessionalFinancialClearanceUseCaseToken,
          useValue: useCases.financialClearance,
        },
        {
          provide: IGetClinicProfessionalPolicyUseCaseToken,
          useValue: useCases.policy,
        },
        {
          provide: ICreateClinicProfessionalCoverageUseCaseToken,
          useValue: useCases.createCoverage,
        },
        {
          provide: IListClinicProfessionalCoveragesUseCaseToken,
          useValue: useCases.listCoverages,
        },
        {
          provide: ICancelClinicProfessionalCoverageUseCaseToken,
          useValue: useCases.cancelCoverage,
        },
        ClinicManagementExportService,
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
    Object.values(useCases).forEach((mock) => {
      mock.execute.mockReset();
      mock.executeOrThrow.mockReset();
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clinics/:id/members/professional/:professionalId/financial-clearance retorna status de pendencias', async () => {
    useCases.financialClearance.executeOrThrow.mockResolvedValue({
      requiresClearance: true,
      hasPendencies: false,
      pendingCount: 0,
      statusesEvaluated: ['chargeback', 'failed'],
    });

    const response = await request(app.getHttpServer())
      .get(
        `/clinics/${FIXTURES.clinic}/members/professional/${FIXTURES.professional}/financial-clearance`,
      )
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ tenantId: FIXTURES.tenant })
      .expect(200);

    expect(useCases.financialClearance.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
    });

    expect(response.body).toEqual({
      requiresClearance: true,
      hasPendencies: false,
      pendingCount: 0,
      statusesEvaluated: ['chargeback', 'failed'],
    });
  });

  it('GET /clinics/:id/members/professional/:professionalId/policy retorna politica ativa', async () => {
    const economicSummary: ClinicInvitationEconomicSummary = {
      items: [
        {
          serviceTypeId: 'service-123',
          price: 300,
          currency: 'BRL',
          payoutModel: 'fixed',
          payoutValue: 120,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    };

    const policy: ClinicProfessionalPolicy = {
      id: 'policy-1',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      channelScope: 'both',
      economicSummary,
      effectiveAt: new Date('2025-10-12T10:00:00.000Z'),
      endedAt: null,
      sourceInvitationId: FIXTURES.invitation,
      acceptedBy: currentUser.id,
      createdAt: new Date('2025-10-12T09:00:00.000Z'),
      updatedAt: new Date('2025-10-12T09:30:00.000Z'),
    };

    useCases.policy.executeOrThrow.mockResolvedValue(policy);

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/members/professional/${FIXTURES.professional}/policy`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ tenantId: FIXTURES.tenant })
      .expect(200);

    expect(useCases.policy.executeOrThrow).toHaveBeenCalledWith({
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
    });

    expect(response.body).toEqual({
      id: 'policy-1',
      clinicId: FIXTURES.clinic,
      tenantId: FIXTURES.tenant,
      professionalId: FIXTURES.professional,
      channelScope: 'both',
      economicSummary: {
        items: [
          {
            serviceTypeId: 'service-123',
            price: 300,
            currency: 'BRL',
            payoutModel: 'fixed',
            payoutValue: 120,
          },
        ],
        orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
        roundingStrategy: 'half_even',
        examples: [
          {
            currency: 'BRL',
            patientPays: 300,
            professionalReceives: 120,
            remainder: 180,
          },
        ],
      },
      effectiveAt: policy.effectiveAt.toISOString(),
      endedAt: null,
      sourceInvitationId: FIXTURES.invitation,
      acceptedBy: currentUser.id,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    });
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
      .overrideGuard(ClinicScopeGuard)
      .useClass(guards.ClinicScopeGuard as new () => ClinicScopeGuard)
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

  it('GET /clinics/:id/audit-logs devolve onboarding com detalhes completos', async () => {
    const auditLog: ClinicAuditLog = {
      id: 'log-1',
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      event: 'clinic.invitation.onboarding_completed',
      performedBy: currentUser.id,
      detail: {
        invitationId: 'inv-42',
        userId: currentUser.id,
        email: 'new.pro@example.com',
        acceptedAt: '2025-10-12T12:00:00.000Z',
      },
      createdAt: new Date('2025-10-12T12:00:00.000Z'),
    };
    useCase.executeOrThrow.mockResolvedValue({ data: [auditLog], total: 1 });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/audit-logs`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ events: 'clinic.invitation.onboarding_completed', page: 2, limit: 10 })
      .expect(200);

    expect(useCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      events: ['clinic.invitation.onboarding_completed'],
      page: 2,
      limit: 10,
    });
    expect(response.body.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(auditLog.id);
    expect(response.body.data[0].detail).toEqual(
      expect.objectContaining({
        invitationId: 'inv-42',
        email: 'new.pro@example.com',
        acceptedAt: '2025-10-12T12:00:00.000Z',
      }),
    );
  });

  it('GET /clinics/:id/audit-logs/export retorna CSV com registros auditados', async () => {
    const auditLog: ClinicAuditLog = {
      id: 'audit-export-1',
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      event: 'clinic.config.updated',
      performedBy: currentUser.id,
      detail: { section: 'services', changeId: 'delta-1' },
      createdAt: new Date('2025-10-12T13:00:00.000Z'),
    };
    useCase.executeOrThrow.mockResolvedValue({ data: [auditLog], total: 1 });

    const response = await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/audit-logs/export`)
      .set('x-tenant-id', FIXTURES.tenant)
      .query({ events: 'clinic.config.updated', limit: 50 })
      .expect(200);

    expect(useCase.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURES.tenant,
      clinicId: FIXTURES.clinic,
      events: ['clinic.config.updated'],
      page: 1,
      limit: 50,
    });

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="clinic-audit-.*\.csv"/,
    );
    const lines = response.text.trim().split('\n');
    expect(lines[0]).toBe('id,tenantId,clinicId,event,performedBy,createdAt,detail');
    expect(lines[1]).toContain('"audit-export-1"');
    expect(lines[1]).toContain(FIXTURES.clinic);
    expect(lines[1]).toContain('"clinic.config.updated"');
    expect(lines[1]).toContain(`"${currentUser.id}"`);
    expect(lines[1]).toContain('"{""section"":""services"",""changeId"":""delta-1""}"');
  });

  it('GET /clinics/:id/audit-logs/export retorna 403 quando guard de escopo bloqueia', async () => {
    guardToggles.allowScope = false;

    await request(app.getHttpServer())
      .get(`/clinics/${FIXTURES.clinic}/audit-logs/export`)
      .set('x-tenant-id', FIXTURES.tenant)
      .expect(403);

    expect(useCase.executeOrThrow).not.toHaveBeenCalled();
  });
});
