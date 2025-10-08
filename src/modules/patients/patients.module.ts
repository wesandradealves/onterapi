import { forwardRef, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

import { PatientsController } from './api/controllers/patients.controller';
import { PatientRepository } from '../../infrastructure/patients/repositories/patient.repository';
import { PatientNotificationService } from '../../infrastructure/patients/services/patient-notification.service';
import { PatientAISuggestionsService } from '../../infrastructure/patients/services/patient-ai-suggestions.service';
import { PatientAuditService } from '../../infrastructure/patients/services/patient-audit.service';
import { SupabaseService } from '../../infrastructure/auth/services/supabase.service';
import { PatientEventsSubscriber } from './subscribers/patient-events.subscriber';
import { IPatientRepositoryToken } from '../../domain/patients/interfaces/repositories/patient.repository.interface';
import { ICreatePatientUseCase } from '../../domain/patients/interfaces/use-cases/create-patient.use-case.interface';
import { IUpdatePatientUseCase } from '../../domain/patients/interfaces/use-cases/update-patient.use-case.interface';
import { IListPatientsUseCase } from '../../domain/patients/interfaces/use-cases/list-patients.use-case.interface';
import { IGetPatientUseCase } from '../../domain/patients/interfaces/use-cases/get-patient.use-case.interface';
import { ITransferPatientUseCase } from '../../domain/patients/interfaces/use-cases/transfer-patient.use-case.interface';
import { IArchivePatientUseCase } from '../../domain/patients/interfaces/use-cases/archive-patient.use-case.interface';
import { IExportPatientsUseCase } from '../../domain/patients/interfaces/use-cases/export-patients.use-case.interface';
import { CreatePatientUseCase } from './use-cases/create-patient.use-case';
import { UpdatePatientUseCase } from './use-cases/update-patient.use-case';
import { ListPatientsUseCase } from './use-cases/list-patients.use-case';
import { GetPatientUseCase } from './use-cases/get-patient.use-case';
import { TransferPatientUseCase } from './use-cases/transfer-patient.use-case';
import { ArchivePatientUseCase } from './use-cases/archive-patient.use-case';
import { ExportPatientsUseCase } from './use-cases/export-patients.use-case';

const repositoryProviders: Provider[] = [
  {
    provide: IPatientRepositoryToken,
    useClass: PatientRepository,
  },
];

const useCaseProviders: Provider[] = [
  {
    provide: ICreatePatientUseCase,
    useClass: CreatePatientUseCase,
  },
  {
    provide: IUpdatePatientUseCase,
    useClass: UpdatePatientUseCase,
  },
  {
    provide: IListPatientsUseCase,
    useClass: ListPatientsUseCase,
  },
  {
    provide: IGetPatientUseCase,
    useClass: GetPatientUseCase,
  },
  {
    provide: ITransferPatientUseCase,
    useClass: TransferPatientUseCase,
  },
  {
    provide: IArchivePatientUseCase,
    useClass: ArchivePatientUseCase,
  },
  {
    provide: IExportPatientsUseCase,
    useClass: ExportPatientsUseCase,
  },
];

@Module({
  imports: [ConfigModule, forwardRef(() => AuthModule)],
  controllers: [PatientsController],
  providers: [
    ...repositoryProviders,
    ...useCaseProviders,
    PatientNotificationService,
    PatientAISuggestionsService,
    PatientAuditService,
    SupabaseService,
    PatientEventsSubscriber,
  ],
  exports: [
    ICreatePatientUseCase,
    IUpdatePatientUseCase,
    IListPatientsUseCase,
    IGetPatientUseCase,
    ITransferPatientUseCase,
    IArchivePatientUseCase,
    IExportPatientsUseCase,
    IPatientRepositoryToken,
  ],
})
export class PatientsModule {}
