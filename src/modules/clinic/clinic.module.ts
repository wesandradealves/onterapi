import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { ClinicConfigurationController } from './api/controllers/clinic-configuration.controller';
import { ClinicHoldController } from './api/controllers/clinic-hold.controller';
import { ClinicDashboardController } from './api/controllers/clinic-dashboard.controller';
import { ClinicServiceTypeController } from './api/controllers/clinic-service-type.controller';
import { ClinicInvitationController } from './api/controllers/clinic-invitation.controller';
import { ClinicMemberController } from './api/controllers/clinic-member.controller';
import { ClinicsController } from './api/controllers/clinics.controller';
import { ClinicAuditController } from './api/controllers/clinic-audit.controller';
import { ClinicEntity } from '../../infrastructure/clinic/entities/clinic.entity';
import { ClinicConfigurationVersionEntity } from '../../infrastructure/clinic/entities/clinic-configuration-version.entity';
import { ClinicMemberEntity } from '../../infrastructure/clinic/entities/clinic-member.entity';
import { ClinicInvitationEntity } from '../../infrastructure/clinic/entities/clinic-invitation.entity';
import { ClinicServiceTypeEntity } from '../../infrastructure/clinic/entities/clinic-service-type.entity';
import { ClinicAlertEntity } from '../../infrastructure/clinic/entities/clinic-alert.entity';
import { ClinicDashboardMetricEntity } from '../../infrastructure/clinic/entities/clinic-dashboard-metric.entity';
import { ClinicForecastProjectionEntity } from '../../infrastructure/clinic/entities/clinic-forecast-projection.entity';
import { ClinicHoldEntity } from '../../infrastructure/clinic/entities/clinic-hold.entity';
import { ClinicAppointmentEntity } from '../../infrastructure/clinic/entities/clinic-appointment.entity';
import { ClinicAuditLogEntity } from '../../infrastructure/clinic/entities/clinic-audit-log.entity';
import { ClinicRepository } from '../../infrastructure/clinic/repositories/clinic.repository';
import { ClinicConfigurationRepository } from '../../infrastructure/clinic/repositories/clinic-configuration.repository';
import { ClinicServiceTypeRepository } from '../../infrastructure/clinic/repositories/clinic-service-type.repository';
import { ClinicHoldRepository } from '../../infrastructure/clinic/repositories/clinic-hold.repository';
import { ClinicAppointmentRepository } from '../../infrastructure/clinic/repositories/clinic-appointment.repository';
import { ClinicMetricsRepository } from '../../infrastructure/clinic/repositories/clinic-metrics.repository';
import { ClinicInvitationRepository } from '../../infrastructure/clinic/repositories/clinic-invitation.repository';
import { ClinicMemberRepository } from '../../infrastructure/clinic/repositories/clinic-member.repository';
import { ClinicAuditLogRepository } from '../../infrastructure/clinic/repositories/clinic-audit-log.repository';
import { ClinicAuditService } from '../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicPaymentCredentialsService } from '../../infrastructure/clinic/services/clinic-payment-credentials.service';
import { ClinicAsaasGatewayService } from '../../infrastructure/clinic/services/clinic-asaas-gateway.service';
import { UpdateClinicGeneralSettingsUseCase } from './use-cases/update-clinic-general-settings.use-case';
import { UpdateClinicHoldSettingsUseCase } from './use-cases/update-clinic-hold-settings.use-case';
import { UpdateClinicServiceSettingsUseCase } from './use-cases/update-clinic-service-settings.use-case';
import { UpdateClinicPaymentSettingsUseCase } from './use-cases/update-clinic-payment-settings.use-case';
import { UpdateClinicIntegrationSettingsUseCase } from './use-cases/update-clinic-integration-settings.use-case';
import { UpdateClinicNotificationSettingsUseCase } from './use-cases/update-clinic-notification-settings.use-case';
import { UpdateClinicBrandingSettingsUseCase } from './use-cases/update-clinic-branding-settings.use-case';
import { UpdateClinicScheduleSettingsUseCase } from './use-cases/update-clinic-schedule-settings.use-case';
import { CreateClinicUseCase } from './use-cases/create-clinic.use-case';
import { CreateClinicHoldUseCase } from './use-cases/create-clinic-hold.use-case';
import { ConfirmClinicAppointmentUseCase } from './use-cases/confirm-clinic-appointment.use-case';
import { GetClinicDashboardUseCase } from './use-cases/get-clinic-dashboard.use-case';
import { UpsertClinicServiceTypeUseCase } from './use-cases/upsert-clinic-service-type.use-case';
import { RemoveClinicServiceTypeUseCase } from './use-cases/remove-clinic-service-type.use-case';
import { ListClinicServiceTypesUseCase } from './use-cases/list-clinic-service-types.use-case';
import { InviteClinicProfessionalUseCase } from './use-cases/invite-clinic-professional.use-case';
import { AcceptClinicInvitationUseCase } from './use-cases/accept-clinic-invitation.use-case';
import { RevokeClinicInvitationUseCase } from './use-cases/revoke-clinic-invitation.use-case';
import { ListClinicInvitationsUseCase } from './use-cases/list-clinic-invitations.use-case';
import { ListClinicMembersUseCase } from './use-cases/list-clinic-members.use-case';
import { ManageClinicMemberUseCase } from './use-cases/manage-clinic-member.use-case';
import { ListClinicsUseCase } from './use-cases/list-clinics.use-case';
import { GetClinicUseCase } from './use-cases/get-clinic.use-case';
import { UpdateClinicStatusUseCase } from './use-cases/update-clinic-status.use-case';
import { GetClinicGeneralSettingsUseCase } from './use-cases/get-clinic-general-settings.use-case';
import { GetClinicTeamSettingsUseCase } from './use-cases/get-clinic-team-settings.use-case';
import { GetClinicScheduleSettingsUseCase } from './use-cases/get-clinic-schedule-settings.use-case';
import { GetClinicServiceSettingsUseCase } from './use-cases/get-clinic-service-settings.use-case';
import { GetClinicPaymentSettingsUseCase } from './use-cases/get-clinic-payment-settings.use-case';
import { GetClinicIntegrationSettingsUseCase } from './use-cases/get-clinic-integration-settings.use-case';
import { GetClinicNotificationSettingsUseCase } from './use-cases/get-clinic-notification-settings.use-case';
import { GetClinicBrandingSettingsUseCase } from './use-cases/get-clinic-branding-settings.use-case';
import { ListClinicAuditLogsUseCase } from './use-cases/list-clinic-audit-logs.use-case';
import { IClinicRepository as IClinicRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository as IClinicConfigurationRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicHoldRepository as IClinicHoldRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicAppointmentRepository as IClinicAppointmentRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicMetricsRepository as IClinicMetricsRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { IClinicInvitationRepository as IClinicInvitationRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { IClinicMemberRepository as IClinicMemberRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicAuditLogRepository as IClinicAuditLogRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-audit-log.repository.interface';
import { IClinicPaymentCredentialsService as IClinicPaymentCredentialsServiceToken } from '../../domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { IClinicPaymentGatewayService as IClinicPaymentGatewayServiceToken } from '../../domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import { IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import { IUpdateClinicServiceSettingsUseCase as IUpdateClinicServiceSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-service-settings.use-case.interface';
import { IUpdateClinicPaymentSettingsUseCase as IUpdateClinicPaymentSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-payment-settings.use-case.interface';
import { IUpdateClinicIntegrationSettingsUseCase as IUpdateClinicIntegrationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-integration-settings.use-case.interface';
import { IUpdateClinicNotificationSettingsUseCase as IUpdateClinicNotificationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-notification-settings.use-case.interface';
import { IUpdateClinicBrandingSettingsUseCase as IUpdateClinicBrandingSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-branding-settings.use-case.interface';
import { IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
import { IGetClinicGeneralSettingsUseCase as IGetClinicGeneralSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-general-settings.use-case.interface';
import { IGetClinicTeamSettingsUseCase as IGetClinicTeamSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-team-settings.use-case.interface';
import { IGetClinicScheduleSettingsUseCase as IGetClinicScheduleSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-schedule-settings.use-case.interface';
import { IGetClinicServiceSettingsUseCase as IGetClinicServiceSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-service-settings.use-case.interface';
import { IGetClinicPaymentSettingsUseCase as IGetClinicPaymentSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-payment-settings.use-case.interface';
import { IGetClinicIntegrationSettingsUseCase as IGetClinicIntegrationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-integration-settings.use-case.interface';
import { IGetClinicNotificationSettingsUseCase as IGetClinicNotificationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-notification-settings.use-case.interface';
import { IGetClinicBrandingSettingsUseCase as IGetClinicBrandingSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-branding-settings.use-case.interface';
import { ICreateClinicUseCase as ICreateClinicUseCaseToken } from '../../domain/clinic/interfaces/use-cases/create-clinic.use-case.interface';
import { ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken } from '../../domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
import { IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken } from '../../domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';
import { IGetClinicDashboardUseCase as IGetClinicDashboardUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-dashboard.use-case.interface';
import { IUpsertClinicServiceTypeUseCase as IUpsertClinicServiceTypeUseCaseToken } from '../../domain/clinic/interfaces/use-cases/upsert-clinic-service-type.use-case.interface';
import { IRemoveClinicServiceTypeUseCase as IRemoveClinicServiceTypeUseCaseToken } from '../../domain/clinic/interfaces/use-cases/remove-clinic-service-type.use-case.interface';
import { IListClinicServiceTypesUseCase as IListClinicServiceTypesUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-service-types.use-case.interface';
import { IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken } from '../../domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken } from '../../domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import { IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken } from '../../domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import { IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { IListClinicsUseCase as IListClinicsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import { IGetClinicUseCase as IGetClinicUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import { IUpdateClinicStatusUseCase as IUpdateClinicStatusUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-status.use-case.interface';
import { IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';

const repositoryProviders: Provider[] = [
  {
    provide: IClinicRepositoryToken,
    useClass: ClinicRepository,
  },
  {
    provide: IClinicConfigurationRepositoryToken,
    useClass: ClinicConfigurationRepository,
  },
  {
    provide: IClinicServiceTypeRepositoryToken,
    useClass: ClinicServiceTypeRepository,
  },
  {
    provide: IClinicHoldRepositoryToken,
    useClass: ClinicHoldRepository,
  },
  {
    provide: IClinicAppointmentRepositoryToken,
    useClass: ClinicAppointmentRepository,
  },
  {
    provide: IClinicMetricsRepositoryToken,
    useClass: ClinicMetricsRepository,
  },
  {
    provide: IClinicInvitationRepositoryToken,
    useClass: ClinicInvitationRepository,
  },
  {
    provide: IClinicMemberRepositoryToken,
    useClass: ClinicMemberRepository,
  },
  {
    provide: IClinicAuditLogRepositoryToken,
    useClass: ClinicAuditLogRepository,
  },
];

const serviceProviders: Provider[] = [
  {
    provide: IClinicPaymentCredentialsServiceToken,
    useClass: ClinicPaymentCredentialsService,
  },
  {
    provide: IClinicPaymentGatewayServiceToken,
    useClass: ClinicAsaasGatewayService,
  },
];

const useCaseProviders: Provider[] = [
  {
    provide: IUpdateClinicGeneralSettingsUseCaseToken,
    useClass: UpdateClinicGeneralSettingsUseCase,
  },
  {
    provide: IGetClinicGeneralSettingsUseCaseToken,
    useClass: GetClinicGeneralSettingsUseCase,
  },
  {
    provide: IGetClinicTeamSettingsUseCaseToken,
    useClass: GetClinicTeamSettingsUseCase,
  },
  {
    provide: IGetClinicScheduleSettingsUseCaseToken,
    useClass: GetClinicScheduleSettingsUseCase,
  },
  {
    provide: IGetClinicServiceSettingsUseCaseToken,
    useClass: GetClinicServiceSettingsUseCase,
  },
  {
    provide: IUpdateClinicServiceSettingsUseCaseToken,
    useClass: UpdateClinicServiceSettingsUseCase,
  },
  {
    provide: IGetClinicPaymentSettingsUseCaseToken,
    useClass: GetClinicPaymentSettingsUseCase,
  },
  {
    provide: IUpdateClinicPaymentSettingsUseCaseToken,
    useClass: UpdateClinicPaymentSettingsUseCase,
  },
  {
    provide: IGetClinicIntegrationSettingsUseCaseToken,
    useClass: GetClinicIntegrationSettingsUseCase,
  },
  {
    provide: IUpdateClinicIntegrationSettingsUseCaseToken,
    useClass: UpdateClinicIntegrationSettingsUseCase,
  },
  {
    provide: IGetClinicNotificationSettingsUseCaseToken,
    useClass: GetClinicNotificationSettingsUseCase,
  },
  {
    provide: IUpdateClinicNotificationSettingsUseCaseToken,
    useClass: UpdateClinicNotificationSettingsUseCase,
  },
  {
    provide: IGetClinicBrandingSettingsUseCaseToken,
    useClass: GetClinicBrandingSettingsUseCase,
  },
  {
    provide: IUpdateClinicBrandingSettingsUseCaseToken,
    useClass: UpdateClinicBrandingSettingsUseCase,
  },
  {
    provide: IUpdateClinicHoldSettingsUseCaseToken,
    useClass: UpdateClinicHoldSettingsUseCase,
  },
  {
    provide: IUpdateClinicScheduleSettingsUseCaseToken,
    useClass: UpdateClinicScheduleSettingsUseCase,
  },
  {
    provide: ICreateClinicUseCaseToken,
    useClass: CreateClinicUseCase,
  },
  {
    provide: ICreateClinicHoldUseCaseToken,
    useClass: CreateClinicHoldUseCase,
  },
  {
    provide: IConfirmClinicAppointmentUseCaseToken,
    useClass: ConfirmClinicAppointmentUseCase,
  },
  {
    provide: IGetClinicDashboardUseCaseToken,
    useClass: GetClinicDashboardUseCase,
  },
  {
    provide: IUpsertClinicServiceTypeUseCaseToken,
    useClass: UpsertClinicServiceTypeUseCase,
  },
  {
    provide: IRemoveClinicServiceTypeUseCaseToken,
    useClass: RemoveClinicServiceTypeUseCase,
  },
  {
    provide: IListClinicServiceTypesUseCaseToken,
    useClass: ListClinicServiceTypesUseCase,
  },
  {
    provide: IInviteClinicProfessionalUseCaseToken,
    useClass: InviteClinicProfessionalUseCase,
  },
  {
    provide: IAcceptClinicInvitationUseCaseToken,
    useClass: AcceptClinicInvitationUseCase,
  },
  {
    provide: IRevokeClinicInvitationUseCaseToken,
    useClass: RevokeClinicInvitationUseCase,
  },
  {
    provide: IListClinicInvitationsUseCaseToken,
    useClass: ListClinicInvitationsUseCase,
  },
  {
    provide: IListClinicMembersUseCaseToken,
    useClass: ListClinicMembersUseCase,
  },
  {
    provide: IManageClinicMemberUseCaseToken,
    useClass: ManageClinicMemberUseCase,
  },
  {
    provide: IListClinicsUseCaseToken,
    useClass: ListClinicsUseCase,
  },
  {
    provide: IGetClinicUseCaseToken,
    useClass: GetClinicUseCase,
  },
  {
    provide: IUpdateClinicStatusUseCaseToken,
    useClass: UpdateClinicStatusUseCase,
  },
  {
    provide: IListClinicAuditLogsUseCaseToken,
    useClass: ListClinicAuditLogsUseCase,
  },
];

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      ClinicEntity,
      ClinicConfigurationVersionEntity,
      ClinicMemberEntity,
      ClinicInvitationEntity,
      ClinicServiceTypeEntity,
      ClinicAlertEntity,
      ClinicDashboardMetricEntity,
      ClinicForecastProjectionEntity,
      ClinicHoldEntity,
      ClinicAppointmentEntity,
      ClinicAuditLogEntity,
    ]),
  ],
  controllers: [
    ClinicConfigurationController,
    ClinicHoldController,
    ClinicDashboardController,
    ClinicServiceTypeController,
    ClinicInvitationController,
    ClinicMemberController,
    ClinicsController,
    ClinicAuditController,
  ],
  providers: [ClinicAuditService, ...repositoryProviders, ...serviceProviders, ...useCaseProviders],
  exports: [...serviceProviders, ...useCaseProviders],
})
export class ClinicModule {}
