import { forwardRef, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PatientsModule } from '../patients/patients.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { ClinicConfigurationController } from './api/controllers/clinic-configuration.controller';
import { ClinicHoldController } from './api/controllers/clinic-hold.controller';
import { ClinicDashboardController } from './api/controllers/clinic-dashboard.controller';
import { ClinicServiceTypeController } from './api/controllers/clinic-service-type.controller';
import { ClinicInvitationController } from './api/controllers/clinic-invitation.controller';
import { ClinicInvitationOnboardingController } from './api/controllers/clinic-invitation-onboarding.controller';
import { ClinicMemberController } from './api/controllers/clinic-member.controller';
import { ClinicsController } from './api/controllers/clinics.controller';
import { ClinicAuditController } from './api/controllers/clinic-audit.controller';
import { ClinicPaymentWebhookController } from './api/controllers/clinic-payment-webhook.controller';
import { ClinicPaymentController } from './api/controllers/clinic-payment.controller';
import { ClinicManagementController } from './api/controllers/clinic-management.controller';
import { ClinicGoogleCalendarController } from './api/controllers/clinic-google-calendar.controller';
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
import { ClinicTemplateOverrideEntity } from '../../infrastructure/clinic/entities/clinic-template-override.entity';
import { ClinicFinancialSnapshotEntity } from '../../infrastructure/clinic/entities/clinic-financial-snapshot.entity';
import { ClinicPaymentWebhookEventEntity } from '../../infrastructure/clinic/entities/clinic-payment-webhook-event.entity';
import { ClinicPaymentPayoutRequestEntity } from '../../infrastructure/clinic/entities/clinic-payment-payout-request.entity';
import { ClinicProfessionalPolicyEntity } from '../../infrastructure/clinic/entities/clinic-professional-policy.entity';
import { ClinicRepository } from '../../infrastructure/clinic/repositories/clinic.repository';
import { ClinicConfigurationRepository } from '../../infrastructure/clinic/repositories/clinic-configuration.repository';
import { ClinicServiceTypeRepository } from '../../infrastructure/clinic/repositories/clinic-service-type.repository';
import { ClinicHoldRepository } from '../../infrastructure/clinic/repositories/clinic-hold.repository';
import { ClinicAppointmentRepository } from '../../infrastructure/clinic/repositories/clinic-appointment.repository';
import { ClinicMetricsRepository } from '../../infrastructure/clinic/repositories/clinic-metrics.repository';
import { ClinicInvitationRepository } from '../../infrastructure/clinic/repositories/clinic-invitation.repository';
import { ClinicMemberRepository } from '../../infrastructure/clinic/repositories/clinic-member.repository';
import { ClinicProfessionalPolicyRepository } from '../../infrastructure/clinic/repositories/clinic-professional-policy.repository';
import { ClinicAuditLogRepository } from '../../infrastructure/clinic/repositories/clinic-audit-log.repository';
import { ClinicTemplateOverrideRepository } from '../../infrastructure/clinic/repositories/clinic-template-override.repository';
import { ClinicPaymentWebhookEventRepository } from '../../infrastructure/clinic/repositories/clinic-payment-webhook-event.repository';
import { ClinicPaymentPayoutRequestRepository } from '../../infrastructure/clinic/repositories/clinic-payment-payout-request.repository';
import { ClinicAuditService } from '../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicPaymentCredentialsService } from '../../infrastructure/clinic/services/clinic-payment-credentials.service';
import { ClinicAsaasGatewayService } from '../../infrastructure/clinic/services/clinic-asaas-gateway.service';
import { ClinicScopeGuard } from './guards/clinic-scope.guard';
import { ClinicConfigurationValidator } from './services/clinic-configuration-validator.service';
import { ClinicInvitationTokenService } from './services/clinic-invitation-token.service';
import { ClinicInvitationExpirationWorkerService } from './services/clinic-invitation-expiration-worker.service';
import { ClinicTemplateOverrideService } from './services/clinic-template-override.service';
import { ClinicManagementExportService } from './services/clinic-management-export.service';
import { ClinicConfigurationCacheService } from './services/clinic-configuration-cache.service';
import { ClinicConfigurationTelemetryService } from './services/clinic-configuration-telemetry.service';
import { ClinicAccessService } from './services/clinic-access.service';
import { ClinicAsaasWebhookGuard } from './guards/clinic-asaas-webhook.guard';
import { ClinicGoogleWebhookGuard } from './guards/clinic-google-webhook.guard';
import { ClinicAlertNotificationService } from './services/clinic-alert-notification.service';
import { ClinicAlertEventsSubscriber } from './subscribers/clinic-alert-events.subscriber';
import { ClinicOverbookingEvaluatorService } from './services/clinic-overbooking-evaluator.service';
import { ClinicNotificationContextService } from './services/clinic-notification-context.service';
import { ClinicOverbookingNotificationService } from './services/clinic-overbooking-notification.service';
import { ClinicOverbookingEventsSubscriber } from './subscribers/clinic-overbooking-events.subscriber';
import { ClinicAlertMonitorService } from './services/clinic-alert-monitor.service';
import { UpdateClinicGeneralSettingsUseCase } from './use-cases/update-clinic-general-settings.use-case';
import { UpdateClinicHoldSettingsUseCase } from './use-cases/update-clinic-hold-settings.use-case';
import { UpdateClinicServiceSettingsUseCase } from './use-cases/update-clinic-service-settings.use-case';
import { UpdateClinicPaymentSettingsUseCase } from './use-cases/update-clinic-payment-settings.use-case';
import { UpdateClinicIntegrationSettingsUseCase } from './use-cases/update-clinic-integration-settings.use-case';
import { UpdateClinicNotificationSettingsUseCase } from './use-cases/update-clinic-notification-settings.use-case';
import { UpdateClinicBrandingSettingsUseCase } from './use-cases/update-clinic-branding-settings.use-case';
import { UpdateClinicScheduleSettingsUseCase } from './use-cases/update-clinic-schedule-settings.use-case';
import { UpdateClinicTeamSettingsUseCase } from './use-cases/update-clinic-team-settings.use-case';
import { PropagateClinicTemplateUseCase } from './use-cases/propagate-clinic-template.use-case';
import { ListClinicTemplateOverridesUseCase } from './use-cases/list-clinic-template-overrides.use-case';
import { CreateClinicUseCase } from './use-cases/create-clinic.use-case';
import { CreateClinicHoldUseCase } from './use-cases/create-clinic-hold.use-case';
import { ProcessClinicOverbookingUseCase } from './use-cases/process-clinic-overbooking.use-case';
import { ProcessClinicExternalCalendarEventUseCase } from './use-cases/process-clinic-external-calendar-event.use-case';
import { ConfirmClinicAppointmentUseCase } from './use-cases/confirm-clinic-appointment.use-case';
import { TransferClinicProfessionalUseCase } from './use-cases/transfer-clinic-professional.use-case';
import { CheckClinicProfessionalFinancialClearanceUseCase } from './use-cases/check-clinic-professional-financial-clearance.use-case';
import { GetClinicProfessionalPolicyUseCase } from './use-cases/get-clinic-professional-policy.use-case';
import { GetClinicDashboardUseCase } from './use-cases/get-clinic-dashboard.use-case';
import { GetClinicManagementOverviewUseCase } from './use-cases/get-clinic-management-overview.use-case';
import { ListClinicAlertsUseCase } from './use-cases/list-clinic-alerts.use-case';
import { ResolveClinicAlertUseCase } from './use-cases/resolve-clinic-alert.use-case';
import { EvaluateClinicAlertsUseCase } from './use-cases/evaluate-clinic-alerts.use-case';
import { ProcessClinicPaymentWebhookUseCase } from './use-cases/process-clinic-payment-webhook.use-case';
import { GetClinicPaymentLedgerUseCase } from './use-cases/get-clinic-payment-ledger.use-case';
import { ListClinicPaymentLedgersUseCase } from './use-cases/list-clinic-payment-ledgers.use-case';
import { UpsertClinicServiceTypeUseCase } from './use-cases/upsert-clinic-service-type.use-case';
import { RemoveClinicServiceTypeUseCase } from './use-cases/remove-clinic-service-type.use-case';
import { ListClinicServiceTypesUseCase } from './use-cases/list-clinic-service-types.use-case';
import { InviteClinicProfessionalUseCase } from './use-cases/invite-clinic-professional.use-case';
import { AcceptClinicInvitationUseCase } from './use-cases/accept-clinic-invitation.use-case';
import { RevokeClinicInvitationUseCase } from './use-cases/revoke-clinic-invitation.use-case';
import { ReissueClinicInvitationUseCase } from './use-cases/reissue-clinic-invitation.use-case';
import { CompleteClinicInvitationOnboardingUseCase } from './use-cases/complete-clinic-invitation-onboarding.use-case';
import { DeclineClinicInvitationUseCase } from './use-cases/decline-clinic-invitation.use-case';
import { ListClinicInvitationsUseCase } from './use-cases/list-clinic-invitations.use-case';
import { ListClinicMembersUseCase } from './use-cases/list-clinic-members.use-case';
import { ManageClinicMemberUseCase } from './use-cases/manage-clinic-member.use-case';
import { ListClinicsUseCase } from './use-cases/list-clinics.use-case';
import { TriggerClinicAlertUseCase } from './use-cases/trigger-clinic-alert.use-case';
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
import { ClinicPaymentReconciliationService } from './services/clinic-payment-reconciliation.service';
import { ClinicPaymentNotificationService } from './services/clinic-payment-notification.service';
import { ClinicPaymentPayoutService } from './services/clinic-payment-payout.service';
import { ClinicPaymentPayoutProcessorService } from './services/clinic-payment-payout-processor.service';
import { ClinicPaymentPayoutWorkerService } from './services/clinic-payment-payout-worker.service';
import { ClinicGoogleCalendarSyncService } from './services/clinic-google-calendar-sync.service';
import { IGoogleCalendarService } from '../../domain/integrations/interfaces/services/google-calendar.service.interface';
import { GoogleCalendarService } from '../../infrastructure/integrations/services/google-calendar.service';
import { IWhatsAppService } from '../../domain/integrations/interfaces/services/whatsapp.service.interface';
import { WhatsAppService } from '../../infrastructure/integrations/services/whatsapp.service';
import { IPushNotificationService } from '../../domain/integrations/interfaces/services/push-notification.service.interface';
import { PushNotificationService } from '../../infrastructure/integrations/services/push-notification.service';
import { ClinicInvitationEconomicSummaryValidator } from './services/clinic-invitation-economic-summary.validator';
import { ClinicPaymentEventsSubscriber } from './subscribers/clinic-payment-events.subscriber';
import { ClinicPaymentPayoutEventsSubscriber } from './subscribers/clinic-payment-payout-events.subscriber';
import { IClinicRepository as IClinicRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository as IClinicConfigurationRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicHoldRepository as IClinicHoldRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicAppointmentRepository as IClinicAppointmentRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicMetricsRepository as IClinicMetricsRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { IClinicPaymentWebhookEventRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-payment-webhook-event.repository.interface';
import { IClinicPaymentPayoutRequestRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import { IClinicInvitationRepository as IClinicInvitationRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { IClinicMemberRepository as IClinicMemberRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicAuditLogRepository as IClinicAuditLogRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-audit-log.repository.interface';
import { IClinicTemplateOverrideRepository as IClinicTemplateOverrideRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-template-override.repository.interface';
import { IClinicProfessionalPolicyRepository as IClinicProfessionalPolicyRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import { IClinicPaymentCredentialsService as IClinicPaymentCredentialsServiceToken } from '../../domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { IClinicPaymentGatewayService as IClinicPaymentGatewayServiceToken } from '../../domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import { IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { IUpdateClinicTeamSettingsUseCase as IUpdateClinicTeamSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-team-settings.use-case.interface';
import { IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import { IUpdateClinicServiceSettingsUseCase as IUpdateClinicServiceSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-service-settings.use-case.interface';
import { IUpdateClinicPaymentSettingsUseCase as IUpdateClinicPaymentSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-payment-settings.use-case.interface';
import { IUpdateClinicIntegrationSettingsUseCase as IUpdateClinicIntegrationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-integration-settings.use-case.interface';
import { IUpdateClinicNotificationSettingsUseCase as IUpdateClinicNotificationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-notification-settings.use-case.interface';
import { IUpdateClinicBrandingSettingsUseCase as IUpdateClinicBrandingSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-branding-settings.use-case.interface';
import { IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
import { IPropagateClinicTemplateUseCase as IPropagateClinicTemplateUseCaseToken } from '../../domain/clinic/interfaces/use-cases/propagate-clinic-template.use-case.interface';
import { IGetClinicGeneralSettingsUseCase as IGetClinicGeneralSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-general-settings.use-case.interface';
import { IGetClinicTeamSettingsUseCase as IGetClinicTeamSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-team-settings.use-case.interface';
import { IGetClinicScheduleSettingsUseCase as IGetClinicScheduleSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-schedule-settings.use-case.interface';
import { IGetClinicServiceSettingsUseCase as IGetClinicServiceSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-service-settings.use-case.interface';
import { IGetClinicPaymentSettingsUseCase as IGetClinicPaymentSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-payment-settings.use-case.interface';
import { IGetClinicPaymentLedgerUseCase as IGetClinicPaymentLedgerUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-payment-ledger.use-case.interface';
import { IListClinicPaymentLedgersUseCase as IListClinicPaymentLedgersUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-payment-ledgers.use-case.interface';
import { IGetClinicIntegrationSettingsUseCase as IGetClinicIntegrationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-integration-settings.use-case.interface';
import { IGetClinicNotificationSettingsUseCase as IGetClinicNotificationSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-notification-settings.use-case.interface';
import { IGetClinicProfessionalPolicyUseCase as IGetClinicProfessionalPolicyUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-professional-policy.use-case.interface';
import { IGetClinicBrandingSettingsUseCase as IGetClinicBrandingSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-branding-settings.use-case.interface';
import { ICreateClinicUseCase as ICreateClinicUseCaseToken } from '../../domain/clinic/interfaces/use-cases/create-clinic.use-case.interface';
import { ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken } from '../../domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
import { IProcessClinicOverbookingUseCase as IProcessClinicOverbookingUseCaseToken } from '../../domain/clinic/interfaces/use-cases/process-clinic-overbooking.use-case.interface';
import { IProcessClinicExternalCalendarEventUseCase as IProcessClinicExternalCalendarEventUseCaseToken } from '../../domain/clinic/interfaces/use-cases/process-clinic-external-calendar-event.use-case.interface';
import { IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken } from '../../domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';
import { IProcessClinicPaymentWebhookUseCase as IProcessClinicPaymentWebhookUseCaseToken } from '../../domain/clinic/interfaces/use-cases/process-clinic-payment-webhook.use-case.interface';
import { IGetClinicDashboardUseCase as IGetClinicDashboardUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-dashboard.use-case.interface';
import { IGetClinicManagementOverviewUseCase as IGetClinicManagementOverviewUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic-management-overview.use-case.interface';
import { IListClinicAlertsUseCase as IListClinicAlertsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-alerts.use-case.interface';
import { ITriggerClinicAlertUseCase as ITriggerClinicAlertUseCaseToken } from '../../domain/clinic/interfaces/use-cases/trigger-clinic-alert.use-case.interface';
import { IResolveClinicAlertUseCase as IResolveClinicAlertUseCaseToken } from '../../domain/clinic/interfaces/use-cases/resolve-clinic-alert.use-case.interface';
import { IEvaluateClinicAlertsUseCase as IEvaluateClinicAlertsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/evaluate-clinic-alerts.use-case.interface';
import { IUpsertClinicServiceTypeUseCase as IUpsertClinicServiceTypeUseCaseToken } from '../../domain/clinic/interfaces/use-cases/upsert-clinic-service-type.use-case.interface';
import { IRemoveClinicServiceTypeUseCase as IRemoveClinicServiceTypeUseCaseToken } from '../../domain/clinic/interfaces/use-cases/remove-clinic-service-type.use-case.interface';
import { IListClinicServiceTypesUseCase as IListClinicServiceTypesUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-service-types.use-case.interface';
import { IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken } from '../../domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken } from '../../domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import { IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken } from '../../domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import { IReissueClinicInvitationUseCase as IReissueClinicInvitationUseCaseToken } from '../../domain/clinic/interfaces/use-cases/reissue-clinic-invitation.use-case.interface';
import { ICompleteClinicInvitationOnboardingUseCase as ICompleteClinicInvitationOnboardingUseCaseToken } from '../../domain/clinic/interfaces/use-cases/complete-clinic-invitation-onboarding.use-case.interface';
import { IDeclineClinicInvitationUseCase as IDeclineClinicInvitationUseCaseToken } from '../../domain/clinic/interfaces/use-cases/decline-clinic-invitation.use-case.interface';
import { IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { ITransferClinicProfessionalUseCase as ITransferClinicProfessionalUseCaseToken } from '../../domain/clinic/interfaces/use-cases/transfer-clinic-professional.use-case.interface';
import { ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken } from '../../domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';
import { IListClinicsUseCase as IListClinicsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import { IGetClinicUseCase as IGetClinicUseCaseToken } from '../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import { IUpdateClinicStatusUseCase as IUpdateClinicStatusUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-status.use-case.interface';
import { IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';
import { IListClinicTemplateOverridesUseCase as IListClinicTemplateOverridesUseCaseToken } from '../../domain/clinic/interfaces/use-cases/list-clinic-template-overrides.use-case.interface';

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
    provide: IClinicPaymentWebhookEventRepositoryToken,
    useClass: ClinicPaymentWebhookEventRepository,
  },
  {
    provide: IClinicPaymentPayoutRequestRepositoryToken,
    useClass: ClinicPaymentPayoutRequestRepository,
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
    provide: IClinicProfessionalPolicyRepositoryToken,
    useClass: ClinicProfessionalPolicyRepository,
  },
  {
    provide: IClinicAuditLogRepositoryToken,
    useClass: ClinicAuditLogRepository,
  },
  {
    provide: IClinicTemplateOverrideRepositoryToken,
    useClass: ClinicTemplateOverrideRepository,
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
  {
    provide: IWhatsAppService,
    useClass: WhatsAppService,
  },
  {
    provide: IPushNotificationService,
    useClass: PushNotificationService,
  },
  {
    provide: IGoogleCalendarService,
    useClass: GoogleCalendarService,
  },
  ClinicInvitationTokenService,
  ClinicInvitationEconomicSummaryValidator,
  ClinicConfigurationValidator,
  ClinicAccessService,
  ClinicAsaasWebhookGuard,
  ClinicGoogleWebhookGuard,
  ClinicPaymentReconciliationService,
  ClinicPaymentNotificationService,
  ClinicPaymentPayoutService,
  ClinicPaymentPayoutProcessorService,
  ClinicPaymentPayoutWorkerService,
  ClinicGoogleCalendarSyncService,
  ClinicAlertNotificationService,
  ClinicAlertMonitorService,
  ClinicManagementExportService,
  ClinicTemplateOverrideService,
  ClinicNotificationContextService,
  ClinicInvitationExpirationWorkerService,
  ClinicOverbookingEvaluatorService,
  ClinicOverbookingNotificationService,
  ClinicPaymentEventsSubscriber,
  ClinicPaymentPayoutEventsSubscriber,
  ClinicAlertEventsSubscriber,
  ClinicOverbookingEventsSubscriber,
  ClinicConfigurationCacheService,
  ClinicConfigurationTelemetryService,
];

const useCaseProviders: Provider[] = [
  {
    provide: IUpdateClinicGeneralSettingsUseCaseToken,
    useClass: UpdateClinicGeneralSettingsUseCase,
  },
  {
    provide: IUpdateClinicTeamSettingsUseCaseToken,
    useClass: UpdateClinicTeamSettingsUseCase,
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
    provide: IGetClinicPaymentLedgerUseCaseToken,
    useClass: GetClinicPaymentLedgerUseCase,
  },
  {
    provide: IListClinicPaymentLedgersUseCaseToken,
    useClass: ListClinicPaymentLedgersUseCase,
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
    provide: IPropagateClinicTemplateUseCaseToken,
    useClass: PropagateClinicTemplateUseCase,
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
    provide: IProcessClinicOverbookingUseCaseToken,
    useClass: ProcessClinicOverbookingUseCase,
  },
  {
    provide: IProcessClinicExternalCalendarEventUseCaseToken,
    useClass: ProcessClinicExternalCalendarEventUseCase,
  },
  {
    provide: IConfirmClinicAppointmentUseCaseToken,
    useClass: ConfirmClinicAppointmentUseCase,
  },
  {
    provide: IProcessClinicPaymentWebhookUseCaseToken,
    useClass: ProcessClinicPaymentWebhookUseCase,
  },
  {
    provide: IGetClinicDashboardUseCaseToken,
    useClass: GetClinicDashboardUseCase,
  },
  {
    provide: IGetClinicManagementOverviewUseCaseToken,
    useClass: GetClinicManagementOverviewUseCase,
  },
  {
    provide: IListClinicAlertsUseCaseToken,
    useClass: ListClinicAlertsUseCase,
  },
  {
    provide: ITriggerClinicAlertUseCaseToken,
    useClass: TriggerClinicAlertUseCase,
  },
  {
    provide: IResolveClinicAlertUseCaseToken,
    useClass: ResolveClinicAlertUseCase,
  },
  {
    provide: IEvaluateClinicAlertsUseCaseToken,
    useClass: EvaluateClinicAlertsUseCase,
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
    provide: IReissueClinicInvitationUseCaseToken,
    useClass: ReissueClinicInvitationUseCase,
  },
  {
    provide: IDeclineClinicInvitationUseCaseToken,
    useClass: DeclineClinicInvitationUseCase,
  },
  {
    provide: ICompleteClinicInvitationOnboardingUseCaseToken,
    useClass: CompleteClinicInvitationOnboardingUseCase,
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
    provide: IGetClinicProfessionalPolicyUseCaseToken,
    useClass: GetClinicProfessionalPolicyUseCase,
  },
  {
    provide: ITransferClinicProfessionalUseCaseToken,
    useClass: TransferClinicProfessionalUseCase,
  },
  {
    provide: ICheckClinicProfessionalFinancialClearanceUseCaseToken,
    useClass: CheckClinicProfessionalFinancialClearanceUseCase,
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
  {
    provide: IListClinicTemplateOverridesUseCaseToken,
    useClass: ListClinicTemplateOverridesUseCase,
  },
];

@Module({
  imports: [
    AuthModule,
    forwardRef(() => UsersModule),
    forwardRef(() => PatientsModule),
    SchedulingModule,
    TypeOrmModule.forFeature([
      ClinicEntity,
      ClinicConfigurationVersionEntity,
      ClinicMemberEntity,
      ClinicInvitationEntity,
      ClinicProfessionalPolicyEntity,
      ClinicServiceTypeEntity,
      ClinicAlertEntity,
      ClinicDashboardMetricEntity,
      ClinicForecastProjectionEntity,
      ClinicHoldEntity,
      ClinicAppointmentEntity,
      ClinicAuditLogEntity,
      ClinicTemplateOverrideEntity,
      ClinicFinancialSnapshotEntity,
      ClinicPaymentWebhookEventEntity,
      ClinicPaymentPayoutRequestEntity,
    ]),
  ],
  controllers: [
    ClinicConfigurationController,
    ClinicManagementController,
    ClinicHoldController,
    ClinicDashboardController,
    ClinicServiceTypeController,
    ClinicInvitationController,
    ClinicInvitationOnboardingController,
    ClinicMemberController,
    ClinicsController,
    ClinicAuditController,
    ClinicGoogleCalendarController,
    ClinicPaymentWebhookController,
    ClinicPaymentController,
  ],
  providers: [
    ClinicAuditService,
    ClinicScopeGuard,
    ...repositoryProviders,
    ...serviceProviders,
    ...useCaseProviders,
  ],
  exports: [...serviceProviders, ...useCaseProviders],
})
export class ClinicModule {}
