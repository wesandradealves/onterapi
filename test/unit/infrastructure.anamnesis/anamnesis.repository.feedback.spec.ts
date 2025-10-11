import { DataSource } from 'typeorm';

import { AnamnesisRepository } from '@infrastructure/anamnesis/repositories/anamnesis.repository';
import { AnamnesisAITrainingFeedbackEntity } from '@infrastructure/anamnesis/entities/anamnesis-ai-feedback.entity';

describe('AnamnesisRepository.recordAITrainingFeedback', () => {
  it('normaliza e persiste dados de feedback para treinamento da IA', async () => {
    const feedbackRepoMock = {
      create: jest.fn((entity) => ({ ...entity })),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: 'feedback-1',
        createdAt: new Date('2025-09-26T12:00:00.000Z'),
      })),
    };

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === AnamnesisAITrainingFeedbackEntity) {
          return feedbackRepoMock;
        }
        return {};
      }),
    } as unknown as DataSource;

    const repository = new AnamnesisRepository(dataSource);

    const result = await repository.recordAITrainingFeedback({
      tenantId: 'tenant-1',
      anamnesisId: 'anamnesis-1',
      planId: 'plan-1',
      analysisId: 'analysis-1',
      approvalStatus: 'approved',
      liked: true,
      feedbackComment: 'Plano adequado',
      feedbackGivenBy: 'professional-1',
    });

    expect(feedbackRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        analysisId: 'analysis-1',
        liked: true,
      }),
    );
    expect(feedbackRepoMock.save).toHaveBeenCalled();
    expect(result.id).toBe('feedback-1');
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});
