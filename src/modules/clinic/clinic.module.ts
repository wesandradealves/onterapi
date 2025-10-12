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
import { ClinicEntity } from '../../infrastructure/clinic/entities/clinic.entity';
import { ClinicConfigurationVersionEntity } from '../../infrastructure/clinic/entities/clinic-configuration-version.entity';
import { ClinicMemberEntity } from '../../infrastructure/clinic/entities/clinic-member.entity';
import { ClinicInvitationEntity } from '../../infrastructure/clinic/entities/clinic-invitation.entity';
import { ClinicServiceTypeEntity } from '../../infrastructure/clinic/entities/clinic-service-type.entity';
import { ClinicAlertEntity } from '../../infrastructure/clinic/entities/clinic-alert.entity';
import { ClinicDashboardMetricEntity } from '../../infrastructure/clinic/entities/clinic-dashboard-metric.entity';
import { ClinicForecastProjectionEntity } from '../../infrastructure/clinic/entities/clinic-forecast-projection.entity';
import { ClinicHoldEntity } from '../../infrastructure/clinic/entities/clinic-hold.entity';
import { ClinicRepository } from '../../infrastructure/clinic/repositories/clinic.repository';
import { ClinicConfigurationRepository } from '../../infrastructure/clinic/repositories/clinic-configuration.repository';
import { ClinicServiceTypeRepository } from '../../infrastructure/clinic/repositories/clinic-service-type.repository';
import { ClinicHoldRepository } from '../../infrastructure/clinic/repositories/clinic-hold.repository';
import { ClinicMetricsRepository } from '../../infrastructure/clinic/repositories/clinic-metrics.repository';
import { ClinicInvitationRepository } from '../../infrastructure/clinic/repositories/clinic-invitation.repository';
import { ClinicMemberRepository } from '../../infrastructure/clinic/repositories/clinic-member.repository';
import { UpdateClinicGeneralSettingsUseCase } from './use-cases/update-clinic-general-settings.use-case';
import { UpdateClinicHoldSettingsUseCase } from './use-cases/update-clinic-hold-settings.use-case';
import { CreateClinicHoldUseCase } from './use-cases/create-clinic-hold.use-case';
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
import { IClinicRepository as IClinicRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository as IClinicConfigurationRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicHoldRepository as IClinicHoldRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicMetricsRepository as IClinicMetricsRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { IClinicInvitationRepository as IClinicInvitationRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { IClinicMemberRepository as IClinicMemberRepositoryToken } from '../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken } from '../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import { ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken } from '../../domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
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
];

const useCaseProviders: Provider[] = [
  {
    provide: IUpdateClinicGeneralSettingsUseCaseToken,
    useClass: UpdateClinicGeneralSettingsUseCase,
  },
  {
    provide: IUpdateClinicHoldSettingsUseCaseToken,
    useClass: UpdateClinicHoldSettingsUseCase,
  },
  {
    provide: ICreateClinicHoldUseCaseToken,
    useClass: CreateClinicHoldUseCase,
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
  ],
  providers: [...repositoryProviders, ...useCaseProviders],
  exports: [...useCaseProviders],
})
export class ClinicModule {}
