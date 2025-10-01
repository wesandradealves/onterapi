import { StartAnamnesisUseCase } from '@modules/anamnesis/use-cases/start-anamnesis.use-case';
import { GetAnamnesisUseCase } from '@modules/anamnesis/use-cases/get-anamnesis.use-case';
import { SaveAnamnesisStepUseCase } from '@modules/anamnesis/use-cases/save-anamnesis-step.use-case';
import { AutoSaveAnamnesisUseCase } from '@modules/anamnesis/use-cases/auto-save-anamnesis.use-case';
import { SubmitAnamnesisUseCase } from '@modules/anamnesis/use-cases/submit-anamnesis.use-case';
import { ListAnamnesesByPatientUseCase } from '@modules/anamnesis/use-cases/list-anamneses-by-patient.use-case';
import { GetAnamnesisHistoryUseCase } from '@modules/anamnesis/use-cases/get-anamnesis-history.use-case';
import { SaveTherapeuticPlanUseCase } from '@modules/anamnesis/use-cases/save-therapeutic-plan.use-case';
import { SavePlanFeedbackUseCase } from '@modules/anamnesis/use-cases/save-plan-feedback.use-case';
import { PatientAnamnesisRollupService } from '@modules/anamnesis/services/patient-anamnesis-rollup.service';
import { LegalTermsService } from '@modules/legal/legal-terms.service';
import { CreateAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/create-anamnesis-attachment.use-case';
import { RemoveAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/remove-anamnesis-attachment.use-case';
import { ReceiveAnamnesisAIResultUseCase } from '@modules/anamnesis/use-cases/receive-anamnesis-ai-result.use-case';
import { CancelAnamnesisUseCase } from '@modules/anamnesis/use-cases/cancel-anamnesis.use-case';
import { ListAnamnesisStepTemplatesUseCase } from '@modules/anamnesis/use-cases/list-anamnesis-step-templates.use-case';
import { IAnamnesisRepository } from '@domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { IAnamnesisAttachmentStorageService } from '@domain/anamnesis/interfaces/services/anamnesis-attachment-storage.service.interface';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAttachment,
  AnamnesisHistoryEntry,
  AnamnesisListItem,
  AnamnesisStep,
  AnamnesisStepTemplate,
  TherapeuticPlanData,
} from '@domain/anamnesis/types/anamnesis.types';
import { Patient } from '@domain/patients/types/patient.types';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';
import { unwrapResult } from '@shared/types/result.type';
import { RolesEnum } from '@domain/auth/enums/roles.enum';

const createAnamnesis = (overrides: Partial<Anamnesis> = {}): Anamnesis => ({
  id: overrides.id ?? 'anamnesis-1',
  consultationId: overrides.consultationId ?? 'consult-1',
  patientId: overrides.patientId ?? 'patient-1',
  professionalId: overrides.professionalId ?? 'professional-1',
  tenantId: overrides.tenantId ?? 'tenant-1',
  status: overrides.status ?? 'draft',
  totalSteps: overrides.totalSteps ?? 3,
  currentStep: overrides.currentStep ?? 1,
  completionRate: overrides.completionRate ?? 0,
  isDraft: overrides.isDraft ?? true,
  lastAutoSavedAt: overrides.lastAutoSavedAt,
  submittedAt: overrides.submittedAt,
  completedAt: overrides.completedAt,
  createdAt: overrides.createdAt ?? new Date('2025-09-26T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-09-26T00:00:00Z'),
  steps: overrides.steps ?? [],
  latestPlan: overrides.latestPlan ?? null,
  attachments: overrides.attachments ?? [],
  deletedAt: overrides.deletedAt,
  deletedBy: overrides.deletedBy,
  deletedReason: overrides.deletedReason,
});

const createStep = (overrides: Partial<AnamnesisStep> = {}): AnamnesisStep => ({
  id: overrides.id ?? 'step-1',
  anamnesisId: overrides.anamnesisId ?? 'anamnesis-1',
  stepNumber: overrides.stepNumber ?? 1,
  key: overrides.key ?? 'identification',
  payload: overrides.payload ?? {},
  completed: overrides.completed ?? false,
  hasErrors: overrides.hasErrors ?? false,
  validationScore: overrides.validationScore,
  updatedAt: overrides.updatedAt ?? new Date('2025-09-26T00:00:00Z'),
  createdAt: overrides.createdAt ?? new Date('2025-09-26T00:00:00Z'),
});

const createAIAnalysis = (overrides: Partial<AnamnesisAIAnalysis> = {}): AnamnesisAIAnalysis => ({
  id: overrides.id ?? 'analysis-1',
  anamnesisId: overrides.anamnesisId ?? 'anamnesis-1',
  tenantId: overrides.tenantId ?? 'tenant-1',
  status: overrides.status ?? 'pending',
  payload: overrides.payload ?? {},
  clinicalReasoning: overrides.clinicalReasoning,
  summary: overrides.summary,
  riskFactors: overrides.riskFactors,
  recommendations: overrides.recommendations,
  confidence: overrides.confidence,
  generatedAt: overrides.generatedAt ?? new Date('2025-09-26T02:00:00Z'),
  respondedAt: overrides.respondedAt,
  errorMessage: overrides.errorMessage,
  createdAt: overrides.createdAt ?? new Date('2025-09-26T02:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-09-26T02:00:00Z'),
});

const createPlan = (overrides: Partial<TherapeuticPlanData> = {}): TherapeuticPlanData => ({
  id: overrides.id ?? 'plan-1',
  anamnesisId: overrides.anamnesisId ?? 'anamnesis-1',
  clinicalReasoning: overrides.clinicalReasoning ?? 'Raciocinio baseline',
  summary: overrides.summary ?? 'Resumo baseline',
  therapeuticPlan: overrides.therapeuticPlan ?? {},
  riskFactors: overrides.riskFactors ?? [],
  recommendations: overrides.recommendations ?? [],
  planText: overrides.planText,
  reasoningText: overrides.reasoningText,
  evidenceMap: overrides.evidenceMap,
  confidence: overrides.confidence ?? 0.8,
  status: overrides.status ?? 'generated',
  reviewRequired: overrides.reviewRequired ?? false,
  termsAccepted: overrides.termsAccepted ?? true,
  approvalStatus: overrides.approvalStatus ?? 'pending',
  liked: overrides.liked,
  feedbackComment: overrides.feedbackComment,
  feedbackGivenBy: overrides.feedbackGivenBy,
  feedbackGivenAt: overrides.feedbackGivenAt,
  acceptedAt: overrides.acceptedAt,
  acceptedBy: overrides.acceptedBy,
  termsVersion: overrides.termsVersion,
  acceptances: overrides.acceptances,
  generatedAt: overrides.generatedAt ?? new Date('2025-09-26T02:00:00Z'),
  createdAt: overrides.createdAt ?? new Date('2025-09-26T02:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-09-26T02:00:00Z'),
});

const createHistoryEntry = (
  overrides: Partial<AnamnesisHistoryEntry> = {},
): AnamnesisHistoryEntry => ({
  id: overrides.id ?? 'history-anamnesis-1',
  consultationId: overrides.consultationId ?? 'consult-1',
  professionalId: overrides.professionalId ?? 'professional-1',
  status: overrides.status ?? 'submitted',
  completionRate: overrides.completionRate ?? 100,
  submittedAt: overrides.submittedAt ?? new Date('2025-09-26T04:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-09-26T04:10:00Z'),
  steps: overrides.steps ?? [
    {
      stepNumber: 1,
      key: 'identification',
      payload: { fullName: 'Paciente Historico' },
      completed: true,
      hasErrors: false,
      validationScore: 100,
      updatedAt: new Date('2025-09-26T04:05:00Z'),
    },
  ],
  attachments: overrides.attachments ?? [],
  latestPlan: overrides.latestPlan ?? null,
});

const createPatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: overrides.id ?? 'patient-1',
  slug: overrides.slug ?? 'patient-1',
  tenantId: overrides.tenantId ?? 'tenant-1',
  professionalId: overrides.professionalId,
  fullName: overrides.fullName ?? 'Paciente Teste',
  shortName: overrides.shortName,
  cpf: overrides.cpf ?? '12345678901',
  birthDate: overrides.birthDate ?? new Date('1990-01-01T00:00:00Z'),
  gender: overrides.gender ?? 'female',
  maritalStatus: overrides.maritalStatus,
  status: overrides.status ?? 'active',
  emailVerified: overrides.emailVerified ?? true,
  preferredLanguage: overrides.preferredLanguage,
  contact: overrides.contact ?? {},
  address: overrides.address,
  medical: overrides.medical,
  tags: overrides.tags,
  riskLevel: overrides.riskLevel,
  lastAppointmentAt: overrides.lastAppointmentAt,
  nextAppointmentAt: overrides.nextAppointmentAt,
  acceptedTerms: overrides.acceptedTerms ?? true,
  acceptedTermsAt: overrides.acceptedTermsAt ?? new Date('2025-09-01T00:00:00Z'),
  createdAt: overrides.createdAt ?? new Date('2025-09-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-09-01T00:00:00Z'),
  archivedAt: overrides.archivedAt,
});

describe('Anamnesis use cases', () => {
  let repository: jest.Mocked<IAnamnesisRepository>;
  let attachmentStorage: jest.Mocked<IAnamnesisAttachmentStorageService>;
  let patientRepository: jest.Mocked<IPatientRepository>;
  let authRepository: jest.Mocked<IAuthRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let rollupService: jest.Mocked<PatientAnamnesisRollupService>;

  let legalTermsService: jest.Mocked<LegalTermsService>;
  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByConsultation: jest.fn(),
      saveStep: jest.fn(),
      autoSaveStep: jest.fn(),
      listByPatient: jest.fn(),
      getHistoryByPatient: jest.fn(),
      submit: jest.fn(),
      saveTherapeuticPlan: jest.fn(),
      savePlanFeedback: jest.fn(),
      createPlanAcceptance: jest.fn(),
      createPlanAccessLog: jest.fn(),
      listPlanAcceptances: jest.fn(),
      getPatientRollup: jest.fn(),
      savePatientRollup: jest.fn(),
      createAttachment: jest.fn(),
      removeAttachment: jest.fn(),
      cancel: jest.fn(),
      getStepTemplates: jest.fn(),
      getStepTemplateByKey: jest.fn(),
      createAIAnalysis: jest.fn(),
      completeAIAnalysis: jest.fn(),
      getLatestAIAnalysis: jest.fn(),
    } as unknown as jest.Mocked<IAnamnesisRepository>;

    repository.getPatientRollup.mockResolvedValue(null);
    repository.savePatientRollup.mockResolvedValue({
      id: 'rollup-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      summaryText: 'Resumo placeholder',
      summaryVersion: 1,
      lastAnamnesisId: 'anamnesis-1',
      updatedBy: 'professional-1',
      createdAt: new Date('2025-09-26T00:00:00Z'),
      updatedAt: new Date('2025-09-26T00:00:00Z'),
    });
    repository.listPlanAcceptances.mockResolvedValue([]);
    repository.createPlanAcceptance.mockResolvedValue({
      id: 'acceptance-1',
      tenantId: 'tenant-1',
      therapeuticPlanId: 'plan-1',
      professionalId: 'professional-1',
      accepted: true,
      termsVersion: 'v1',
      termsTextSnapshot: 'Termos de teste',
      acceptedAt: new Date('2025-09-26T00:00:00Z'),
      acceptedIp: null,
      acceptedUserAgent: null,
      createdAt: new Date('2025-09-26T00:00:00Z'),
      updatedAt: new Date('2025-09-26T00:00:00Z'),
    });

    repository.createPlanAccessLog.mockResolvedValue(undefined);
    rollupService = {
      buildSummary: jest.fn().mockReturnValue({
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        summaryText: 'Resumo placeholder',
        summaryVersion: 1,
        lastAnamnesisId: 'anamnesis-1',
        updatedBy: 'professional-1',
      }),
    } as unknown as jest.Mocked<PatientAnamnesisRollupService>;

    legalTermsService = { getActiveTerm: jest.fn() } as unknown as jest.Mocked<LegalTermsService>;
    patientRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findSummary: jest.fn(),
      findTimeline: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      transfer: jest.fn(),
      archive: jest.fn(),
      restore: jest.fn(),
      existsByCpf: jest.fn(),
      findDuplicates: jest.fn(),
      export: jest.fn(),
    } as unknown as jest.Mocked<IPatientRepository>;

    authRepository = {
      findByEmail: jest.fn(),
      findByCpf: jest.fn(),
      findById: jest.fn(),
      findBySupabaseId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      saveRefreshToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      removeRefreshToken: jest.fn(),
      saveTwoFactorCode: jest.fn(),
      validateTwoFactorCode: jest.fn(),
      findValidTwoFactorCode: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      resetFailedAttempts: jest.fn(),
      isUserLocked: jest.fn(),
    } as unknown as jest.Mocked<IAuthRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishMany: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    attachmentStorage = {
      upload: jest.fn().mockResolvedValue({ storagePath: 'storage/path.pdf', size: 1024 }),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IAnamnesisAttachmentStorageService>;
  });

  describe('StartAnamnesisUseCase', () => {
    it('should create new anamnesis when not exists', async () => {
      const created = createAnamnesis();
      repository.findByConsultation.mockResolvedValue(null);
      repository.create.mockResolvedValue(created);

      const useCase = new StartAnamnesisUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          consultationId: 'consult-1',
          patientId: 'patient-1',
          professionalId: 'professional-1',
          totalSteps: 5,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ consultationId: 'consult-1', totalSteps: 5 }),
      );
      expect(messageBus.publish).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('should return existing anamnesis when already created', async () => {
      const existing = createAnamnesis();
      repository.findByConsultation.mockResolvedValue(existing);

      const useCase = new StartAnamnesisUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          consultationId: 'consult-1',
          patientId: 'patient-1',
          professionalId: 'professional-1',
          totalSteps: 5,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  describe('GetAnamnesisUseCase', () => {
    it('should resolve anamnesis with included relations', async () => {
      const anamnesis = createAnamnesis({
        steps: [
          createStep({
            stepNumber: 1,
            key: 'identification',
            completed: true,
            payload: {
              personalInfo: {
                fullName: 'Paciente Teste Completo',
                birthDate: '1990-01-10',
                gender: 'female',
              },
            },
          }),
        ],
      });
      repository.findById.mockResolvedValue(anamnesis);
      const useCase = new GetAnamnesisUseCase(repository, legalTermsService);

      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          includeSteps: true,
          includeLatestPlan: false,
          includeAttachments: false,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.createPlanAccessLog).not.toHaveBeenCalled();
      expect(repository.findById).toHaveBeenCalledWith('tenant-1', 'anamnesis-1', {
        steps: true,
        latestPlan: false,
        attachments: false,
      });
      expect(result).toEqual(anamnesis);
    });

    it('should hydrate plan terms and log access when latest plan is requested', async () => {
      const plan = createPlan({
        id: 'plan-1',
        status: 'generated',
        termsAccepted: false,
        termsVersion: undefined,
        termsTextSnapshot: undefined,
      });
      const anamnesis = createAnamnesis({
        id: 'anamnesis-1',
        tenantId: 'tenant-1',
        latestPlan: plan,
      });

      repository.findById.mockResolvedValue(anamnesis);
      legalTermsService.getActiveTerm.mockResolvedValue({
        id: 'term-1',
        tenantId: null,
        context: 'therapeutic_plan',
        version: 'v1-termo',
        content: 'Termo vigente',
        isActive: true,
        publishedAt: new Date('2025-09-01T00:00:00Z'),
        createdAt: new Date('2025-09-01T00:00:00Z'),
        updatedAt: new Date('2025-09-01T00:00:00Z'),
      });

      const useCase = new GetAnamnesisUseCase(repository, legalTermsService);

      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          includeLatestPlan: true,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
          requesterIp: '203.0.113.10',
          requesterUserAgent: 'jest',
        }),
      );

      expect(legalTermsService.getActiveTerm).toHaveBeenCalledWith('therapeutic_plan', 'tenant-1');
      expect(repository.createPlanAccessLog).toHaveBeenCalledTimes(1);
      expect(repository.createPlanAccessLog).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        anamnesisId: 'anamnesis-1',
        planId: 'plan-1',
        professionalId: 'professional-1',
        viewerRole: RolesEnum.PROFESSIONAL,
        viewedAt: expect.any(Date),
        ipAddress: '203.0.113.10',
        userAgent: 'jest',
      });
      expect(result.latestPlan?.termsVersion).toBe('v1-termo');
      expect(result.latestPlan?.termsTextSnapshot).toBe('Termo vigente');
    });
  });

  describe('SaveAnamnesisStepUseCase', () => {
    it('should update step and recompute progress', async () => {
      const existing = createAnamnesis({
        steps: [
          createStep({ stepNumber: 1, completed: true }),
          createStep({ stepNumber: 2, completed: false }),
        ],
        currentStep: 2,
        completionRate: 33,
      });
      repository.findById.mockResolvedValueOnce(existing).mockResolvedValueOnce(
        createAnamnesis({
          ...existing,
          steps: [
            createStep({ stepNumber: 1, completed: true }),
            createStep({ stepNumber: 2, completed: true }),
          ],
          completionRate: 67,
          currentStep: 3,
        }),
      );
      repository.saveStep.mockImplementation(async () =>
        createStep({ stepNumber: 2, completed: true }),
      );

      const useCase = new SaveAnamnesisStepUseCase(repository, messageBus);

      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          stepNumber: 2,
          key: 'lifestyle',
          payload: { field: 'value' },
          completed: true,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.saveStep).toHaveBeenCalledWith(
        expect.objectContaining({ completionRate: 67, currentStep: 3 }),
      );
      expect(result.currentStep).toBe(3);
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should throw when anamnese is not draft', async () => {
      const submitted = createAnamnesis({ status: 'submitted' });
      repository.findById.mockResolvedValue(submitted);

      const useCase = new SaveAnamnesisStepUseCase(repository, messageBus);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            stepNumber: 1,
            key: 'identification',
            payload: {},
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Apenas anamneses em rascunho podem ser editadas');
    });
  });

  describe('AutoSaveAnamnesisUseCase', () => {
    it('should auto save step and return updated anamnesis', async () => {
      const autoSavedAt = new Date('2025-09-27T10:00:00Z');
      const existing = createAnamnesis({
        steps: [createStep({ stepNumber: 2, key: 'lifestyle' })],
      });
      const savedStep = createStep({
        stepNumber: 2,
        key: 'lifestyle',
        payload: { field: 'value' },
        hasErrors: true,
        validationScore: 80,
        updatedAt: autoSavedAt,
      });
      const updated = createAnamnesis({
        lastAutoSavedAt: autoSavedAt,
        steps: [savedStep],
      });

      repository.findById.mockResolvedValueOnce(existing);
      repository.autoSaveStep.mockResolvedValue(savedStep);
      repository.findById.mockResolvedValueOnce(updated);

      const useCase = new AutoSaveAnamnesisUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          stepNumber: 2,
          key: 'lifestyle',
          payload: { field: 'value' },
          hasErrors: true,
          validationScore: 80,
          autoSavedAt,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(result).toEqual(updated);
      expect(repository.autoSaveStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepNumber: 2,
          autoSavedAt,
        }),
      );
      expect(messageBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: expect.stringContaining('anamnesis.step_saved'),
          payload: expect.objectContaining({
            autoSave: true,
            stepNumber: 2,
            hasErrors: true,
            autoSavedAt,
          }),
        }),
      );
    });

    it('should preserve newer snapshot when request is stale', async () => {
      const staleRequest = new Date('2025-09-27T09:00:00Z');
      const latestTimestamp = new Date('2025-09-27T10:15:00Z');

      const latestStep = createStep({
        stepNumber: 2,
        key: 'lifestyle',
        payload: { latest: true },
        hasErrors: false,
        validationScore: 88,
        updatedAt: latestTimestamp,
      });

      const draft = createAnamnesis({
        lastAutoSavedAt: latestTimestamp,
        steps: [latestStep],
      });

      repository.findById.mockResolvedValueOnce(draft);
      repository.autoSaveStep.mockResolvedValue(latestStep);
      repository.findById.mockResolvedValueOnce(draft);

      const useCase = new AutoSaveAnamnesisUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          stepNumber: 2,
          key: 'lifestyle',
          payload: { older: 'value' },
          autoSavedAt: staleRequest,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.autoSaveStep).toHaveBeenCalledWith(
        expect.objectContaining({ autoSavedAt: staleRequest }),
      );
      expect(result.lastAutoSavedAt?.toISOString()).toBe(latestTimestamp.toISOString());
      expect(result.steps?.[0].payload).toEqual({ latest: true });
      expect(messageBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            autoSave: true,
            autoSavedAt: latestTimestamp,
          }),
        }),
      );
    });

    it('should generate autoSavedAt when not provided', async () => {
      const existing = createAnamnesis();
      repository.findById.mockResolvedValueOnce(existing);

      const generatedStep = createStep({
        stepNumber: 3,
        key: 'psychosocial',
      });

      repository.autoSaveStep.mockImplementation(async (input) => {
        expect(input.autoSavedAt).toBeInstanceOf(Date);
        generatedStep.updatedAt = input.autoSavedAt ?? new Date();
        return generatedStep;
      });

      repository.findById.mockResolvedValueOnce(createAnamnesis({ steps: [generatedStep] }));

      const useCase = new AutoSaveAnamnesisUseCase(repository, messageBus);

      await useCase.execute({
        tenantId: 'tenant-1',
        anamnesisId: 'anamnesis-1',
        stepNumber: 3,
        key: 'psychosocial',
        payload: { field: 'value' },
        requesterId: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
      });

      expect(repository.autoSaveStep).toHaveBeenCalledWith(
        expect.objectContaining({ autoSavedAt: expect.any(Date) }),
      );
    });

    it('should throw when anamnesis is not found', async () => {
      repository.findById.mockResolvedValueOnce(null);

      const useCase = new AutoSaveAnamnesisUseCase(repository, messageBus);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            stepNumber: 1,
            key: 'identification',
            payload: {},
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Anamnese nao encontrada');
    });

    it('should throw when anamnesis is not in draft status', async () => {
      repository.findById.mockResolvedValueOnce(createAnamnesis({ status: 'submitted' }));

      const useCase = new AutoSaveAnamnesisUseCase(repository, messageBus);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            stepNumber: 1,
            key: 'identification',
            payload: {},
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Apenas anamneses em rascunho podem ser editadas');
    });

    it('should throw when requester cannot modify anamnesis', async () => {
      repository.findById.mockResolvedValueOnce(
        createAnamnesis({ professionalId: 'another-professional' }),
      );

      const useCase = new AutoSaveAnamnesisUseCase(repository, messageBus);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            stepNumber: 1,
            key: 'identification',
            payload: {},
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Operacao nao autorizada para esta anamnese');
    });
  });

  describe('SubmitAnamnesisUseCase', () => {
    it('should submit anamnesis and emitir eventos de submissao e requisicao de IA', async () => {
      const draft = createAnamnesis({
        steps: [
          createStep({
            stepNumber: 1,
            key: 'identification',
            completed: true,
            payload: {
              personalInfo: {
                fullName: 'Paciente Teste Completo',
                birthDate: '1990-01-10',
                gender: 'female',
              },
            },
          }),
        ],
      });
      const submitted = createAnamnesis({
        ...draft,
        status: 'submitted',
        isDraft: false,
        completionRate: 100,
        submittedAt: new Date('2025-09-26T02:00:00Z'),
      });

      repository.findById.mockResolvedValue(draft);
      repository.submit.mockResolvedValue(submitted);
      repository.createAIAnalysis.mockResolvedValue(createAIAnalysis());
      patientRepository.findById.mockResolvedValue(createPatient());
      authRepository.findById.mockResolvedValue({
        id: 'professional-1',
        email: 'prof@example.com',
        name: 'Profissional',
        role: RolesEnum.PROFESSIONAL,
        metadata: { specialty: 'physiotherapy' },
      } as unknown as any);

      const useCase = new SubmitAnamnesisUseCase(
        repository,
        patientRepository,
        authRepository,
        messageBus,
      );
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.submit).toHaveBeenCalledWith(
        expect.objectContaining({ completionRate: expect.any(Number) }),
      );
      expect(repository.createAIAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          anamnesisId: 'anamnesis-1',
          tenantId: 'tenant-1',
          status: 'pending',
        }),
      );
      expect(messageBus.publishMany).toHaveBeenCalledTimes(1);
      const [events] = messageBus.publishMany.mock.calls[0];
      expect(events).toHaveLength(2);
      expect(events[0].eventName).toBe(DomainEvents.ANAMNESIS_SUBMITTED);
      expect(events[1].eventName).toBe(DomainEvents.ANAMNESIS_AI_REQUESTED);
      expect(result.status).toBe('submitted');
    });
  });

  describe('CancelAnamnesisUseCase', () => {
    it('should cancel anamnesis and publish domain event', async () => {
      const anamnesis = createAnamnesis({ status: 'submitted', isDraft: false });
      repository.findById.mockResolvedValue(anamnesis);
      repository.cancel.mockResolvedValue(undefined);

      const useCase = new CancelAnamnesisUseCase(repository, messageBus);

      await useCase.executeOrThrow({
        tenantId: 'tenant-1',
        anamnesisId: 'anamnesis-1',
        requestedBy: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        reason: 'Paciente reagendou a consulta',
      });

      expect(repository.cancel).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        anamnesisId: 'anamnesis-1',
        requestedBy: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        reason: 'Paciente reagendou a consulta',
      });
      expect(messageBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: DomainEvents.ANAMNESIS_CANCELLED,
          aggregateId: 'anamnesis-1',
          payload: expect.objectContaining({
            cancelledBy: 'professional-1',
            reason: 'Paciente reagendou a consulta',
          }),
        }),
      );
    });

    it('should trim reason and persist null when only whitespace is provided', async () => {
      const anamnesis = createAnamnesis({ status: 'submitted', isDraft: false });
      repository.findById.mockResolvedValue(anamnesis);
      repository.cancel.mockResolvedValue(undefined);

      const useCase = new CancelAnamnesisUseCase(repository, messageBus);

      await useCase.executeOrThrow({
        tenantId: 'tenant-1',
        anamnesisId: 'anamnesis-1',
        requestedBy: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        reason: '   ',
      });

      expect(repository.cancel).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        anamnesisId: 'anamnesis-1',
        requestedBy: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        reason: undefined,
      });
    });

    it('should block cancellation when already cancelled', async () => {
      const anamnesis = createAnamnesis({ status: 'cancelled', deletedAt: new Date() });
      repository.findById.mockResolvedValue(anamnesis);

      const useCase = new CancelAnamnesisUseCase(repository, messageBus);

      await expect(
        useCase.executeOrThrow({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          requestedBy: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      ).rejects.toThrow('Anamnese ja foi cancelada anteriormente');
      expect(repository.cancel).not.toHaveBeenCalled();
    });

    it('should propagate not found error when anamnesis is missing', async () => {
      repository.findById.mockResolvedValue(null);

      const useCase = new CancelAnamnesisUseCase(repository, messageBus);

      await expect(
        useCase.executeOrThrow({
          tenantId: 'tenant-1',
          anamnesisId: 'missing',
          requestedBy: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      ).rejects.toThrow('Anamnese nao encontrada');
      expect(repository.cancel).not.toHaveBeenCalled();
    });
  });

  describe('ReceiveAnamnesisAIResultUseCase', () => {
    it('should persist analysis result and therapeutic plan when completed', async () => {
      const anamnesis = createAnamnesis({ status: 'submitted', isDraft: false });
      repository.findById.mockResolvedValue(anamnesis);
      const analysis = createAIAnalysis({
        status: 'completed',
        respondedAt: new Date('2025-09-27T10:00:00Z'),
        confidence: 0.92,
      });
      repository.completeAIAnalysis.mockResolvedValue(analysis);
      const plan = createPlan({ id: 'plan-ai-1' });
      repository.saveTherapeuticPlan.mockResolvedValue(plan);

      const useCase = new ReceiveAnamnesisAIResultUseCase(
        repository,
        messageBus,
        legalTermsService,
      );
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          analysisId: 'analysis-1',
          status: 'completed',
          clinicalReasoning: 'Raciocinio IA',
          summary: 'Resumo IA',
          riskFactors: [],
          recommendations: [],
          confidence: 0.92,
          therapeuticPlan: { plan: true },
          payload: { raw: true },
          respondedAt: new Date('2025-09-27T10:00:00Z'),
        }),
      );

      expect(result.status).toBe('completed');
      expect(repository.completeAIAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ analysisId: 'analysis-1' }),
      );
      expect(repository.saveTherapeuticPlan).toHaveBeenCalledWith(
        expect.objectContaining({ anamnesisId: 'anamnesis-1' }),
      );
      expect(messageBus.publish).toHaveBeenCalledTimes(2);
      expect(messageBus.publish.mock.calls[0][0].eventName).toBe(
        DomainEvents.ANAMNESIS_PLAN_GENERATED,
      );
      expect(messageBus.publish.mock.calls[1][0].eventName).toBe(
        DomainEvents.ANAMNESIS_AI_COMPLETED,
      );
    });

    it('should emit completion event without creating plan on failure', async () => {
      repository.findById.mockResolvedValue(
        createAnamnesis({ status: 'submitted', isDraft: false }),
      );
      repository.completeAIAnalysis.mockResolvedValue(
        createAIAnalysis({ status: 'failed', errorMessage: 'timeout' }),
      );

      const useCase = new ReceiveAnamnesisAIResultUseCase(
        repository,
        messageBus,
        legalTermsService,
      );
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          analysisId: 'analysis-1',
          status: 'failed',
          respondedAt: new Date('2025-09-27T10:00:00Z'),
          payload: { raw: true },
          errorMessage: 'timeout',
        }),
      );

      expect(result.status).toBe('failed');
      expect(repository.saveTherapeuticPlan).not.toHaveBeenCalled();
      expect(messageBus.publish).toHaveBeenCalledTimes(1);
      expect(messageBus.publish.mock.calls[0][0].eventName).toBe(
        DomainEvents.ANAMNESIS_AI_COMPLETED,
      );
    });

    it('should throw not found when analysis record is missing', async () => {
      repository.findById.mockResolvedValue(
        createAnamnesis({ status: 'submitted', isDraft: false }),
      );
      repository.completeAIAnalysis.mockRejectedValue(new Error('AI analysis not found'));

      const useCase = new ReceiveAnamnesisAIResultUseCase(
        repository,
        messageBus,
        legalTermsService,
      );

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            analysisId: 'analysis-1',
            status: 'completed',
            respondedAt: new Date('2025-09-27T10:00:00Z'),
          })
          .then(unwrapResult),
      ).rejects.toThrow('Analise de IA nao encontrada');
      expect(messageBus.publish).not.toHaveBeenCalled();
    });

    it('should throw not found when anamnesis does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const useCase = new ReceiveAnamnesisAIResultUseCase(
        repository,
        messageBus,
        legalTermsService,
      );

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-inexistente',
            analysisId: 'analysis-1',
            status: 'completed',
            respondedAt: new Date('2025-09-27T10:00:00Z'),
          })
          .then(unwrapResult),
      ).rejects.toThrow('Anamnese nao encontrada');
    });
  });

  describe('ListAnamnesesByPatientUseCase', () => {
    it('should filter by professional for professionals', async () => {
      const items: AnamnesisListItem[] = [
        {
          id: 'anamnesis-1',
          consultationId: 'consult-1',
          patientId: 'patient-1',
          professionalId: 'professional-1',
          status: 'draft',
          completionRate: 0,
          updatedAt: new Date('2025-09-26T00:00:00Z'),
        },
      ];
      repository.listByPatient.mockResolvedValue(items);

      const useCase = new ListAnamnesesByPatientUseCase(repository);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
          filters: {},
        }),
      );

      expect(repository.listByPatient).toHaveBeenCalledWith(
        'tenant-1',
        'patient-1',
        expect.objectContaining({ professionalId: 'professional-1' }),
      );
      expect(result).toEqual(items);
    });
  });

  describe('SaveTherapeuticPlanUseCase', () => {
    it('should persist plan and emit event', async () => {
      const anamnesis = createAnamnesis();
      repository.findById.mockResolvedValue(anamnesis);

      const plan = createPlan({
        id: 'plan-1',
        status: 'generated',
        termsAccepted: false,
        generatedAt: new Date('2025-09-26T01:00:00Z'),
      });
      repository.saveTherapeuticPlan.mockResolvedValue({ ...plan });

      const acceptance = {
        id: 'acceptance-1',
        tenantId: 'tenant-1',
        therapeuticPlanId: 'plan-1',
        professionalId: 'professional-1',
        accepted: true,
        termsVersion: 'v1',
        termsTextSnapshot: 'Termos de teste',
        acceptedAt: new Date('2025-09-26T02:00:00Z'),
        acceptedIp: null,
        acceptedUserAgent: null,
        createdAt: new Date('2025-09-26T02:00:00Z'),
        updatedAt: new Date('2025-09-26T02:00:00Z'),
      };
      repository.createPlanAcceptance.mockResolvedValue(acceptance);
      repository.listPlanAcceptances.mockResolvedValue([acceptance]);
      repository.savePatientRollup.mockResolvedValue({
        tenantId: 'tenant-1',
        patientId: anamnesis.patientId,
        summaryText: 'Resumo placeholder',
        summaryVersion: 1,
        lastAnamnesisId: anamnesis.id,
        updatedBy: 'professional-1',
      });

      const useCase = new SaveTherapeuticPlanUseCase(repository, messageBus, rollupService);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: anamnesis.id,
          termsAccepted: true,
          termsVersion: 'v1',
          termsTextSnapshot: 'Termos de teste',
          planText: 'Plano IA',
          reasoningText: 'Raciocínio IA',
          analysisId: 'analysis-1',
          generatedAt: plan.generatedAt,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.createPlanAcceptance).toHaveBeenCalled();
      expect(repository.listPlanAcceptances).toHaveBeenCalledWith('tenant-1', plan.id);
      expect(repository.savePatientRollup).toHaveBeenCalled();
      expect(rollupService.buildSummary).toHaveBeenCalled();
      expect(result.status).toBe('accepted');
      expect(result.termsAccepted).toBe(true);
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should reject plan persistence when terms are not accepted', async () => {
      repository.findById.mockResolvedValue(createAnamnesis());

      const useCase = new SaveTherapeuticPlanUseCase(repository, messageBus, rollupService);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            termsAccepted: false,
            termsVersion: 'v1',
            termsTextSnapshot: 'Termos de teste',
            generatedAt: new Date('2025-09-26T01:00:00Z'),
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow(
        'Termo de responsabilidade deve ser aceito para registrar o plano terapeutico.',
      );
    });
  });

  describe('SavePlanFeedbackUseCase', () => {
    it('should store feedback and emit event', async () => {
      repository.findById.mockResolvedValue(createAnamnesis());
      const plan = createPlan({ approvalStatus: 'approved', liked: true });
      repository.savePlanFeedback.mockResolvedValue(plan);

      const useCase = new SavePlanFeedbackUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          approvalStatus: 'approved',
          liked: true,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(result.approvalStatus).toBe('approved');
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should throw invalid state when plan not found', async () => {
      repository.findById.mockResolvedValue(createAnamnesis());
      repository.savePlanFeedback.mockRejectedValue(new Error('not-found'));

      const useCase = new SavePlanFeedbackUseCase(repository, messageBus);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            approvalStatus: 'rejected',
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Plano terapeutico nao encontrado');
    });
  });

  describe('GetAnamnesisHistoryUseCase', () => {
    it('should return history with prefill for professional', async () => {
      const historyEntries = [
        createHistoryEntry({
          id: 'anamnesis-2',
          steps: [
            {
              stepNumber: 1,
              key: 'identification',
              payload: { fullName: 'Paciente Historico', birthDate: '1990-01-01' },
              completed: true,
              hasErrors: false,
              validationScore: 100,
              updatedAt: new Date('2025-09-26T04:05:00Z'),
            },
          ],
          attachments: [
            {
              id: 'attachment-1',
              anamnesisId: 'anamnesis-2',
              stepNumber: 1,
              fileName: 'exame.pdf',
              mimeType: 'application/pdf',
              size: 5120,
              storagePath: 'path/exame.pdf',
              uploadedBy: 'professional-1',
              uploadedAt: new Date('2025-09-26T04:06:00Z'),
            },
          ],
        }),
        createHistoryEntry({
          id: 'anamnesis-1',
          submittedAt: new Date('2025-09-25T03:00:00Z'),
          updatedAt: new Date('2025-09-25T03:10:00Z'),
          steps: [
            {
              stepNumber: 2,
              key: 'chiefComplaint',
              payload: { history: 'Queixa antiga' },
              completed: true,
              hasErrors: false,
              validationScore: 80,
              updatedAt: new Date('2025-09-25T03:10:00Z'),
            },
          ],
        }),
      ];

      (repository.getHistoryByPatient as jest.Mock).mockResolvedValue(historyEntries);

      const useCase = new GetAnamnesisHistoryUseCase(repository);

      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
          filters: { limit: 5 },
        }),
      );

      expect(repository.getHistoryByPatient).toHaveBeenCalledWith(
        'tenant-1',
        'patient-1',
        expect.objectContaining({ limit: 5, professionalId: 'professional-1' }),
      );
      expect(result.entries).toHaveLength(2);
      expect(result.prefill.steps.identification).toBeDefined();
      expect(result.prefill.steps.identification?.fullName).toBe('Paciente Historico');
      expect(result.prefill.attachments).toHaveLength(1);
    });

    it('should block patient requesting history for another patient', async () => {
      const useCase = new GetAnamnesisHistoryUseCase(repository);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            patientId: 'patient-1',
            requesterId: 'patient-2',
            requesterRole: RolesEnum.PATIENT,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Operacao nao autorizada para esta anamnese');
    });

    it('should block roles without permission', async () => {
      const useCase = new GetAnamnesisHistoryUseCase(repository);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            patientId: 'patient-1',
            requesterId: 'secretary-1',
            requesterRole: RolesEnum.SECRETARY,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Operacao nao autorizada para esta anamnese');
    });
  });

  describe('CreateAnamnesisAttachmentUseCase', () => {
    it('should upload file, persist metadata and emit event', async () => {
      repository.findById.mockResolvedValue(createAnamnesis());
      const uploadResult = { storagePath: 'storage/tenant-1/anamnesis-1/exame.pdf', size: 2048 };
      attachmentStorage.upload.mockResolvedValue(uploadResult);
      const fileBuffer = Buffer.from('fake-pdf');
      const attachment: AnamnesisAttachment = {
        id: 'attachment-1',
        anamnesisId: 'anamnesis-1',
        stepNumber: 2,
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        size: uploadResult.size,
        storagePath: uploadResult.storagePath,
        uploadedBy: 'professional-1',
        uploadedAt: new Date('2025-09-26T02:10:00Z'),
      };
      repository.createAttachment.mockResolvedValue(attachment);

      const useCase = new CreateAnamnesisAttachmentUseCase(
        repository,
        attachmentStorage,
        messageBus,
      );
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          stepNumber: 2,
          fileName: 'exame.pdf',
          mimeType: 'application/pdf',
          size: uploadResult.size,
          fileBuffer: fileBuffer,
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(result).toEqual(attachment);
      expect(attachmentStorage.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          fileName: 'exame.pdf',
          buffer: fileBuffer,
        }),
      );
      expect(repository.createAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          storagePath: uploadResult.storagePath,
          size: uploadResult.size,
        }),
      );
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should propagate error when storage upload fails', async () => {
      repository.findById.mockResolvedValue(createAnamnesis());
      attachmentStorage.upload.mockRejectedValue(new Error('upload failed'));

      const useCase = new CreateAnamnesisAttachmentUseCase(
        repository,
        attachmentStorage,
        messageBus,
      );

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            stepNumber: 1,
            fileName: 'exame.pdf',
            mimeType: 'application/pdf',
            size: 512,
            fileBuffer: Buffer.from('pdf'),
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Nao foi possivel salvar o anexo no storage');

      expect(repository.createAttachment).not.toHaveBeenCalled();
    });
  });

  describe('RemoveAnamnesisAttachmentUseCase', () => {
    it('should remove attachment when it belongs to anamnesis', async () => {
      repository.findById.mockResolvedValue(
        createAnamnesis({
          attachments: [
            {
              id: 'attachment-1',
              anamnesisId: 'anamnesis-1',
              stepNumber: 1,
              fileName: 'exame.pdf',
              mimeType: 'application/pdf',
              size: 100,
              storagePath: 'path',
              uploadedBy: 'professional-1',
              uploadedAt: new Date('2025-09-26T00:00:00Z'),
            },
          ],
        }),
      );

      const useCase = new RemoveAnamnesisAttachmentUseCase(
        repository,
        attachmentStorage,
        messageBus,
      );
      unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          attachmentId: 'attachment-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(attachmentStorage.delete).toHaveBeenCalledWith({ storagePath: 'path' });
      expect(repository.removeAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ attachmentId: 'attachment-1' }),
      );
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should throw when attachment does not belong to anamnesis', async () => {
      repository.findById.mockResolvedValue(createAnamnesis({ attachments: [] }));

      const useCase = new RemoveAnamnesisAttachmentUseCase(
        repository,
        attachmentStorage,
        messageBus,
      );

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            attachmentId: 'attachment-1',
            requesterId: 'professional-1',
            requesterRole: RolesEnum.PROFESSIONAL,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Anexo informado nao pertence a esta anamnese');

      expect(attachmentStorage.delete).not.toHaveBeenCalled();
    });

    it('should throw when requester is unauthorized', async () => {
      repository.findById.mockResolvedValue(
        createAnamnesis({
          attachments: [
            {
              id: 'attachment-1',
              anamnesisId: 'anamnesis-1',
              stepNumber: 1,
              fileName: 'exame.pdf',
              mimeType: 'application/pdf',
              size: 100,
              storagePath: 'path',
              uploadedBy: 'professional-1',
              uploadedAt: new Date('2025-09-26T00:00:00Z'),
            },
          ],
        }),
      );

      const useCase = new RemoveAnamnesisAttachmentUseCase(
        repository,
        attachmentStorage,
        messageBus,
      );

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            anamnesisId: 'anamnesis-1',
            attachmentId: 'attachment-1',
            requesterId: 'patient-2',
            requesterRole: RolesEnum.PATIENT,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Operacao nao autorizada para esta anamnese');

      expect(attachmentStorage.delete).not.toHaveBeenCalled();
      expect(repository.removeAttachment).not.toHaveBeenCalled();
    });
  });

  describe('ListAnamnesisStepTemplatesUseCase', () => {
    it('retorna templates ativos para roles permitidos', async () => {
      const templates: AnamnesisStepTemplate[] = [
        {
          id: 'template-1',
          key: 'identification',
          title: 'Identificacao',
          description: 'Dados basicos',
          version: 1,
          schema: { sections: [] },
          specialty: 'default',
          tenantId: null,
          isActive: true,
          createdAt: new Date('2025-09-26T00:00:00Z'),
          updatedAt: new Date('2025-09-26T00:00:00Z'),
        },
      ];

      repository.getStepTemplates.mockResolvedValue(templates);

      const useCase = new ListAnamnesisStepTemplatesUseCase(repository);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
          filters: { includeInactive: true },
        }),
      );

      expect(repository.getStepTemplates).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        specialty: undefined,
        includeInactive: false,
      });
      expect(result).toEqual(templates);
    });

    it('permite incluir inativos apenas para super admin', async () => {
      repository.getStepTemplates.mockResolvedValue([]);
      const useCase = new ListAnamnesisStepTemplatesUseCase(repository);

      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'admin',
        requesterRole: RolesEnum.SUPER_ADMIN,
        filters: { includeInactive: true, specialty: 'default' },
      });

      expect(repository.getStepTemplates).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        specialty: 'default',
        includeInactive: true,
      });
    });

    it('bloqueia roles nao autorizadas', async () => {
      const useCase = new ListAnamnesisStepTemplatesUseCase(repository);

      await expect(
        useCase
          .execute({
            tenantId: 'tenant-1',
            requesterId: 'user',
            requesterRole: 'SECRETARY' as RolesEnum,
          })
          .then(unwrapResult),
      ).rejects.toThrow('Operacao nao autorizada para esta anamnese');
    });
  });
});
