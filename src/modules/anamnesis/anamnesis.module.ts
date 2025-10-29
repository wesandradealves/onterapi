import { forwardRef, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { LegalModule } from '../legal/legal.module';
import { AnamnesisController } from './api/controllers/anamnesis.controller';
import { AnamnesisMetricsController } from './api/controllers/anamnesis-metrics.controller';
import { AnamnesisEntity } from '../../infrastructure/anamnesis/entities/anamnesis.entity';
import { AnamnesisStepEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '../../infrastructure/anamnesis/entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '../../infrastructure/anamnesis/entities/anamnesis-attachment.entity';
import { AnamnesisStepTemplateEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step-template.entity';
import { AnamnesisAIAnalysisEntity } from '../../infrastructure/anamnesis/entities/anamnesis-ai-analysis.entity';
import { AnamnesisAITrainingFeedbackEntity } from '../../infrastructure/anamnesis/entities/anamnesis-ai-feedback.entity';
import { TherapeuticPlanAcceptanceEntity } from '../../infrastructure/anamnesis/entities/therapeutic-plan-acceptance.entity';
import { PatientAnamnesisRollupEntity } from '../../infrastructure/anamnesis/entities/patient-anamnesis-rollup.entity';
import { TherapeuticPlanAccessLogEntity } from '../../infrastructure/anamnesis/entities/therapeutic-plan-access-log.entity';
import { LegalTermEntity } from '../../infrastructure/legal/entities/legal-term.entity';
import { AnamnesisRepository } from '../../infrastructure/anamnesis/repositories/anamnesis.repository';
import { AnamnesisMetricsRepository } from '../../infrastructure/anamnesis/repositories/anamnesis-metrics.repository';
import { AnamnesisAIWebhookRepository } from '../../infrastructure/anamnesis/repositories/anamnesis-ai-webhook.repository';
import { SupabaseService } from '../../infrastructure/auth/services/supabase.service';
import { IAnamnesisRepositoryToken } from '../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { IAnamnesisMetricsRepositoryToken } from '../../domain/anamnesis/interfaces/repositories/anamnesis-metrics.repository.interface';
import { IAnamnesisAIWebhookRepositoryToken } from '../../domain/anamnesis/interfaces/repositories/anamnesis-ai-webhook.repository.interface';
import { IStartAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import { IGetAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import { ISaveAnamnesisStepUseCase } from '../../domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
import { IAutoSaveAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/auto-save-anamnesis.use-case.interface';
import { ISubmitAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '../../domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { IGetAnamnesisHistoryUseCase } from '../../domain/anamnesis/interfaces/use-cases/get-anamnesis-history.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '../../domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { IListAnamnesisStepTemplatesUseCase } from '../../domain/anamnesis/interfaces/use-cases/list-anamnesis-step-templates.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '../../domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '../../domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import { IReceiveAnamnesisAIResultUseCase } from '../../domain/anamnesis/interfaces/use-cases/receive-anamnesis-ai-result.use-case.interface';
import { ICancelAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/cancel-anamnesis.use-case.interface';
import { IAnamnesisAttachmentStorageServiceToken } from '../../domain/anamnesis/interfaces/services/anamnesis-attachment-storage.service.interface';
import { StartAnamnesisUseCase } from './use-cases/start-anamnesis.use-case';
import { GetAnamnesisUseCase } from './use-cases/get-anamnesis.use-case';
import { SaveAnamnesisStepUseCase } from './use-cases/save-anamnesis-step.use-case';
import { AutoSaveAnamnesisUseCase } from './use-cases/auto-save-anamnesis.use-case';
import { SubmitAnamnesisUseCase } from './use-cases/submit-anamnesis.use-case';
import { ListAnamnesesByPatientUseCase } from './use-cases/list-anamneses-by-patient.use-case';
import { GetAnamnesisHistoryUseCase } from './use-cases/get-anamnesis-history.use-case';
import { SaveTherapeuticPlanUseCase } from './use-cases/save-therapeutic-plan.use-case';
import { SavePlanFeedbackUseCase } from './use-cases/save-plan-feedback.use-case';
import { ListAnamnesisStepTemplatesUseCase } from './use-cases/list-anamnesis-step-templates.use-case';
import { CreateAnamnesisAttachmentUseCase } from './use-cases/create-anamnesis-attachment.use-case';
import { RemoveAnamnesisAttachmentUseCase } from './use-cases/remove-anamnesis-attachment.use-case';
import { ReceiveAnamnesisAIResultUseCase } from './use-cases/receive-anamnesis-ai-result.use-case';
import { CancelAnamnesisUseCase } from './use-cases/cancel-anamnesis.use-case';
import { AnamnesisAIWebhookGuard } from './guards/anamnesis-ai-webhook.guard';
import { SupabaseAnamnesisAttachmentStorageService } from '../../infrastructure/anamnesis/services/supabase-anamnesis-attachment-storage.service';
import { AnamnesisMetricsService } from './services/anamnesis-metrics.service';
import { PatientAnamnesisRollupService } from './services/patient-anamnesis-rollup.service';
import { TherapeuticPlanDomainService } from './services/therapeutic-plan-domain.service';
import { AnamnesisAIWorkerService } from './services/anamnesis-ai-worker.service';
import { LocalAIPlanGeneratorService } from './services/local-ai-plan-generator.service';
import { AnamnesisEventsSubscriber } from './subscribers/anamnesis-events.subscriber';
import { AnamnesisMetricEntity } from '../../infrastructure/anamnesis/entities/anamnesis-metric.entity';
import { AnamnesisAIWebhookRequestEntity } from '../../infrastructure/anamnesis/entities/anamnesis-ai-webhook-request.entity';
import { AnamnesisAIWebhookReplayService } from './services/anamnesis-ai-webhook-replay.service';

const repositoryProviders: Provider[] = [
  {
    provide: IAnamnesisRepositoryToken,
    useClass: AnamnesisRepository,
  },
  {
    provide: IAnamnesisMetricsRepositoryToken,
    useClass: AnamnesisMetricsRepository,
  },
  {
    provide: IAnamnesisAIWebhookRepositoryToken,
    useClass: AnamnesisAIWebhookRepository,
  },
];

const useCaseProviders: Provider[] = [
  {
    provide: IStartAnamnesisUseCase,
    useClass: StartAnamnesisUseCase,
  },
  {
    provide: IGetAnamnesisUseCase,
    useClass: GetAnamnesisUseCase,
  },
  {
    provide: ISaveAnamnesisStepUseCase,
    useClass: SaveAnamnesisStepUseCase,
  },
  {
    provide: IAutoSaveAnamnesisUseCase,
    useClass: AutoSaveAnamnesisUseCase,
  },
  {
    provide: ISubmitAnamnesisUseCase,
    useClass: SubmitAnamnesisUseCase,
  },
  {
    provide: IListAnamnesesByPatientUseCase,
    useClass: ListAnamnesesByPatientUseCase,
  },
  {
    provide: IGetAnamnesisHistoryUseCase,
    useClass: GetAnamnesisHistoryUseCase,
  },
  {
    provide: ISaveTherapeuticPlanUseCase,
    useClass: SaveTherapeuticPlanUseCase,
  },
  {
    provide: ISavePlanFeedbackUseCase,
    useClass: SavePlanFeedbackUseCase,
  },
  {
    provide: ICreateAnamnesisAttachmentUseCase,
    useClass: CreateAnamnesisAttachmentUseCase,
  },
  {
    provide: IRemoveAnamnesisAttachmentUseCase,
    useClass: RemoveAnamnesisAttachmentUseCase,
  },
  {
    provide: IReceiveAnamnesisAIResultUseCase,
    useClass: ReceiveAnamnesisAIResultUseCase,
  },
  {
    provide: ICancelAnamnesisUseCase,
    useClass: CancelAnamnesisUseCase,
  },
  {
    provide: IListAnamnesisStepTemplatesUseCase,
    useClass: ListAnamnesisStepTemplatesUseCase,
  },
];

const storageProviders: Provider[] = [
  SupabaseService,
  {
    provide: IAnamnesisAttachmentStorageServiceToken,
    useClass: SupabaseAnamnesisAttachmentStorageService,
  },
];

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AnamnesisEntity,
      AnamnesisStepEntity,
      AnamnesisTherapeuticPlanEntity,
      AnamnesisAttachmentEntity,
      AnamnesisStepTemplateEntity,
      AnamnesisAIAnalysisEntity,
      AnamnesisAITrainingFeedbackEntity,
      LegalTermEntity,
      TherapeuticPlanAcceptanceEntity,
      PatientAnamnesisRollupEntity,
      TherapeuticPlanAccessLogEntity,
      AnamnesisMetricEntity,
      AnamnesisAIWebhookRequestEntity,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => PatientsModule),
    LegalModule,
  ],
  controllers: [AnamnesisMetricsController, AnamnesisController],
  providers: [
    ...repositoryProviders,
    ...useCaseProviders,
    ...storageProviders,
    AnamnesisAIWebhookGuard,
    AnamnesisMetricsService,

    PatientAnamnesisRollupService,
    TherapeuticPlanDomainService,
    LocalAIPlanGeneratorService,
    AnamnesisAIWorkerService,
    AnamnesisAIWebhookReplayService,
    AnamnesisEventsSubscriber,
  ],
  exports: [
    IStartAnamnesisUseCase,
    IGetAnamnesisUseCase,
    ISaveAnamnesisStepUseCase,
    IAutoSaveAnamnesisUseCase,
    ISubmitAnamnesisUseCase,
    IListAnamnesesByPatientUseCase,
    IGetAnamnesisHistoryUseCase,
    ISaveTherapeuticPlanUseCase,
    ISavePlanFeedbackUseCase,
    ICreateAnamnesisAttachmentUseCase,
    IRemoveAnamnesisAttachmentUseCase,
    IReceiveAnamnesisAIResultUseCase,
    ICancelAnamnesisUseCase,
    IListAnamnesisStepTemplatesUseCase,
    IAnamnesisRepositoryToken,
    IAnamnesisMetricsRepositoryToken,
    IAnamnesisAIWebhookRepositoryToken,
    IAnamnesisAttachmentStorageServiceToken,
  ],
})
export class AnamnesisModule {}
