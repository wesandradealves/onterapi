import { forwardRef, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AnamnesisController } from './api/controllers/anamnesis.controller';
import { AnamnesisEntity } from '../../infrastructure/anamnesis/entities/anamnesis.entity';
import { AnamnesisStepEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '../../infrastructure/anamnesis/entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '../../infrastructure/anamnesis/entities/anamnesis-attachment.entity';
import { AnamnesisRepository } from '../../infrastructure/anamnesis/repositories/anamnesis.repository';
import { IAnamnesisRepositoryToken } from '../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { StartAnamnesisUseCase } from './use-cases/start-anamnesis.use-case';
import { GetAnamnesisUseCase } from './use-cases/get-anamnesis.use-case';
import { SaveAnamnesisStepUseCase } from './use-cases/save-anamnesis-step.use-case';
import { SubmitAnamnesisUseCase } from './use-cases/submit-anamnesis.use-case';
import { ListAnamnesesByPatientUseCase } from './use-cases/list-anamneses-by-patient.use-case';
import { SaveTherapeuticPlanUseCase } from './use-cases/save-therapeutic-plan.use-case';
import { SavePlanFeedbackUseCase } from './use-cases/save-plan-feedback.use-case';
import { CreateAnamnesisAttachmentUseCase } from './use-cases/create-anamnesis-attachment.use-case';
import { RemoveAnamnesisAttachmentUseCase } from './use-cases/remove-anamnesis-attachment.use-case';
import { IStartAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import { IGetAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import { ISaveAnamnesisStepUseCase } from '../../domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
import { ISubmitAnamnesisUseCase } from '../../domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '../../domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '../../domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '../../domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '../../domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import { MessageBus } from '../../shared/messaging/message-bus';

const repositoryProviders: Provider[] = [
  {
    provide: IAnamnesisRepositoryToken,
    useClass: AnamnesisRepository,
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
    provide: ISubmitAnamnesisUseCase,
    useClass: SubmitAnamnesisUseCase,
  },
  {
    provide: IListAnamnesesByPatientUseCase,
    useClass: ListAnamnesesByPatientUseCase,
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
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnamnesisEntity,
      AnamnesisStepEntity,
      AnamnesisTherapeuticPlanEntity,
      AnamnesisAttachmentEntity,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AnamnesisController],
  providers: [...repositoryProviders, ...useCaseProviders, MessageBus],
  exports: [
    IStartAnamnesisUseCase,
    IGetAnamnesisUseCase,
    ISaveAnamnesisStepUseCase,
    ISubmitAnamnesisUseCase,
    IListAnamnesesByPatientUseCase,
    ISaveTherapeuticPlanUseCase,
    ISavePlanFeedbackUseCase,
    ICreateAnamnesisAttachmentUseCase,
    IRemoveAnamnesisAttachmentUseCase,
    IAnamnesisRepositoryToken,
  ],
})
export class AnamnesisModule {}
