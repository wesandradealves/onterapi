import { StartAnamnesisUseCase } from '@modules/anamnesis/use-cases/start-anamnesis.use-case';
import { GetAnamnesisUseCase } from '@modules/anamnesis/use-cases/get-anamnesis.use-case';
import { SaveAnamnesisStepUseCase } from '@modules/anamnesis/use-cases/save-anamnesis-step.use-case';
import { SubmitAnamnesisUseCase } from '@modules/anamnesis/use-cases/submit-anamnesis.use-case';
import { ListAnamnesesByPatientUseCase } from '@modules/anamnesis/use-cases/list-anamneses-by-patient.use-case';
import { SaveTherapeuticPlanUseCase } from '@modules/anamnesis/use-cases/save-therapeutic-plan.use-case';
import { SavePlanFeedbackUseCase } from '@modules/anamnesis/use-cases/save-plan-feedback.use-case';
import { CreateAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/create-anamnesis-attachment.use-case';
import { RemoveAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/remove-anamnesis-attachment.use-case';
import { IAnamnesisRepository } from '@domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListItem,
  AnamnesisStep,
  TherapeuticPlanData,
} from '@domain/anamnesis/types/anamnesis.types';
import { MessageBus } from '@shared/messaging/message-bus';
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

const createPlan = (overrides: Partial<TherapeuticPlanData> = {}): TherapeuticPlanData => ({
  id: overrides.id ?? 'plan-1',
  anamnesisId: overrides.anamnesisId ?? 'anamnesis-1',
  clinicalReasoning: overrides.clinicalReasoning ?? 'Raciocinio',
  summary: overrides.summary ?? 'Resumo',
  therapeuticPlan: overrides.therapeuticPlan ?? {},
  riskFactors: overrides.riskFactors ?? [],
  recommendations: overrides.recommendations ?? [],
  confidence: overrides.confidence ?? 0.9,
  reviewRequired: overrides.reviewRequired ?? false,
  approvalStatus: overrides.approvalStatus ?? 'pending',
  liked: overrides.liked,
  feedbackComment: overrides.feedbackComment,
  feedbackGivenBy: overrides.feedbackGivenBy,
  feedbackGivenAt: overrides.feedbackGivenAt,
  generatedAt: overrides.generatedAt ?? new Date('2025-09-26T01:00:00Z'),
  createdAt: overrides.createdAt ?? new Date('2025-09-26T01:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2025-09-26T01:00:00Z'),
});

describe('Anamnesis use cases', () => {
  let repository: jest.Mocked<IAnamnesisRepository>;
  let messageBus: jest.Mocked<MessageBus>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByConsultation: jest.fn(),
      saveStep: jest.fn(),
      listByPatient: jest.fn(),
      submit: jest.fn(),
      saveTherapeuticPlan: jest.fn(),
      savePlanFeedback: jest.fn(),
      createAttachment: jest.fn(),
      removeAttachment: jest.fn(),
    } as unknown as jest.Mocked<IAnamnesisRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishMany: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;
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
        steps: [createStep({ stepNumber: 1, completed: true })],
      });
      repository.findById.mockResolvedValue(anamnesis);
      const useCase = new GetAnamnesisUseCase(repository);

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

      expect(repository.findById).toHaveBeenCalledWith('tenant-1', 'anamnesis-1', {
        steps: true,
        latestPlan: false,
        attachments: false,
      });
      expect(result).toEqual(anamnesis);
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
        useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          stepNumber: 1,
          key: 'identification',
          payload: {},
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      ).rejects.toThrow('Apenas anamneses em rascunho podem ser editadas');
    });
  });

  describe('SubmitAnamnesisUseCase', () => {
    it('should submit anamnesis and emit event', async () => {
      const draft = createAnamnesis({
        steps: [createStep({ stepNumber: 1, completed: true })],
      });
      repository.findById.mockResolvedValueOnce(draft).mockResolvedValueOnce(
        createAnamnesis({
          ...draft,
          status: 'submitted',
          isDraft: false,
          completionRate: 50,
          submittedAt: new Date('2025-09-26T02:00:00Z'),
        }),
      );
      repository.submit.mockResolvedValue(createAnamnesis({ status: 'submitted', isDraft: false }));

      const useCase = new SubmitAnamnesisUseCase(repository, messageBus);
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
      expect(result.status).toBe('submitted');
      expect(messageBus.publish).toHaveBeenCalled();
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
      repository.findById.mockResolvedValue(createAnamnesis());
      const plan = createPlan();
      repository.saveTherapeuticPlan.mockResolvedValue(plan);

      const useCase = new SaveTherapeuticPlanUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          generatedAt: new Date('2025-09-26T01:00:00Z'),
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(result).toEqual(plan);
      expect(messageBus.publish).toHaveBeenCalled();
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
        useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          approvalStatus: 'rejected',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      ).rejects.toThrow('Plano terapeutico nao encontrado');
    });
  });

  describe('CreateAnamnesisAttachmentUseCase', () => {
    it('should create attachment and emit event', async () => {
      repository.findById.mockResolvedValue(createAnamnesis());
      const attachment: AnamnesisAttachment = {
        id: 'attachment-1',
        anamnesisId: 'anamnesis-1',
        stepNumber: 2,
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        size: 1234,
        storagePath: 'path/exame.pdf',
        uploadedBy: 'professional-1',
        uploadedAt: new Date('2025-09-26T02:10:00Z'),
      };
      repository.createAttachment.mockResolvedValue(attachment);

      const useCase = new CreateAnamnesisAttachmentUseCase(repository, messageBus);
      const result = unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          fileName: 'exame.pdf',
          mimeType: 'application/pdf',
          size: 1234,
          storagePath: 'path/exame.pdf',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(result).toEqual(attachment);
      expect(messageBus.publish).toHaveBeenCalled();
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

      const useCase = new RemoveAnamnesisAttachmentUseCase(repository, messageBus);
      unwrapResult(
        await useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          attachmentId: 'attachment-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      );

      expect(repository.removeAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ attachmentId: 'attachment-1' }),
      );
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should throw when attachment does not belong to anamnesis', async () => {
      repository.findById.mockResolvedValue(createAnamnesis({ attachments: [] }));

      const useCase = new RemoveAnamnesisAttachmentUseCase(repository, messageBus);

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          anamnesisId: 'anamnesis-1',
          attachmentId: 'attachment-1',
          requesterId: 'professional-1',
          requesterRole: RolesEnum.PROFESSIONAL,
        }),
      ).rejects.toThrow('Anexo informado nao pertence a esta anamnese');
    });
  });
});
