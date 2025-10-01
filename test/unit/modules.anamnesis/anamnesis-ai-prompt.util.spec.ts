import { buildAnamnesisAIPrompt } from '../../../src/modules/anamnesis/utils/anamnesis-ai-prompt.util';
import {
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
} from '../../../src/domain/anamnesis/types/anamnesis.types';

describe('buildAnamnesisAIPrompt', () => {
  const requestPayload: AnamnesisAIRequestPayload = {
    tenantId: 'tenant-1',
    anamnesisId: 'anam-1',
    consultationId: 'consult-1',
    professionalId: 'prof-1',
    patientId: 'patient-1',
    status: 'submitted',
    submittedAt: new Date('2025-10-01T08:30:00Z'),
    steps: {
      chiefComplaint: {
        description: 'Cefaleia tensional diaria',
        duration: '3 semanas',
      },
      lifestyle: {
        smoking: { status: 'current', cigarettesPerDay: 10, yearsSmoked: 8 },
      },
    } as Record<string, Record<string, unknown>>,
    attachments: [
      {
        id: 'att-1',
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storagePath: 'path/to/exame.pdf',
        uploadedAt: new Date('2025-09-30T12:00:00Z'),
      },
    ],
    patientProfile: {
      id: 'patient-1',
      fullName: 'Paciente Teste',
      age: 42,
    },
    metadata: {
      completionRate: 90,
    },
  };

  const compactSummary: AnamnesisCompactSummary = {
    id: 'anam-1',
    tenantId: 'tenant-1',
    consultationId: 'consult-1',
    patientId: 'patient-1',
    professionalId: 'prof-1',
    status: 'submitted',
    submittedAt: new Date('2025-10-01T08:30:00Z'),
    completionRate: 90,
    steps: [
      {
        key: 'chiefComplaint',
        completed: true,
        payload: { description: 'Cefaleia tensional diaria', duration: '3 semanas' },
      },
    ],
    attachments: [
      {
        id: 'att-1',
        fileName: 'exame.pdf',
      },
    ],
  };

  it('should build prompt with rollup fallback when summary is absent', () => {
    const prompt = buildAnamnesisAIPrompt({
      request: requestPayload,
      compact: compactSummary,
      promptVersion: 'v1-test',
    });

    expect(prompt.version).toBe('v1-test');
    expect(prompt.system).toContain('Voce e um agente clinico assistivo');
    expect(prompt.user).toContain('Dados consolidados anteriores (resumo)');
    expect(prompt.user).toContain('Dados da anamnese atual (compact)');
    expect(prompt.user).toContain('Tarefas (obrigatorias)');
    expect(prompt.rollupSummary).toBe('Sem resumo anterior disponivel.');
    expect(prompt.compact.visit).toMatchObject({
      anamnesisId: 'anam-1',
      consultationId: 'consult-1',
    });
  });

  it('should include provided rollup summary when available', () => {
    const payloadWithRollup: AnamnesisAIRequestPayload = {
      ...requestPayload,
      patientRollup: {
        summaryText: 'Resumo anterior do paciente com foco em cefaleia cronica.',
        summaryVersion: 2,
        lastAnamnesisId: 'anam-0',
        updatedAt: new Date('2025-09-20T12:00:00Z'),
      },
    };

    const prompt = buildAnamnesisAIPrompt({
      request: payloadWithRollup,
      compact: compactSummary,
      promptVersion: 'v1-test',
    });

    expect(prompt.rollupSummary).toBe('Resumo anterior do paciente com foco em cefaleia cronica.');
    expect(prompt.user).toContain('Resumo anterior do paciente com foco em cefaleia cronica.');
  });
});
