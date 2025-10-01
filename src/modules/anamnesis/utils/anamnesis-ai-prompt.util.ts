import {
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
} from '../../../domain/anamnesis/types/anamnesis.types';

type SanitizedRecord = Record<string, unknown>;

interface BuildAnamnesisAIPromptInput {
  request: AnamnesisAIRequestPayload;
  compact: AnamnesisCompactSummary;
  promptVersion: string;
}

export interface AnamnesisAIPrompt {
  version: string;
  system: string;
  user: string;
  compact: SanitizedRecord;
  rollupSummary: string;
}

const SYSTEM_PROMPT =
  'Voce e um agente clinico assistivo. Gere conteudo objetivo, baseado em evidencias, sem linguagem definitiva. Nao substitua o julgamento profissional.';

const MAX_STRING_LENGTH = 360;
const MAX_ARRAY_LENGTH = 25;
const MAX_DEPTH = 4;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const truncateString = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_STRING_LENGTH) {
    return trimmed;
  }
  const clipped = trimmed.slice(0, MAX_STRING_LENGTH);
  return `${clipped}...`;
};

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const sanitized = truncateString(value);
    return sanitized.length > 0 ? sanitized : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return undefined;
    }

    const items = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((entry) => sanitizeValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);

    return items.length ? items : undefined;
  }

  if (isObject(value)) {
    if (depth >= MAX_DEPTH) {
      return undefined;
    }

    const entries = Object.entries(value).reduce<SanitizedRecord>((acc, [key, entryValue]) => {
      const sanitized = sanitizeValue(entryValue, depth + 1);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    }, {});

    return Object.keys(entries).length ? entries : undefined;
  }

  return undefined;
};

const sanitizeProfile = (profile?: unknown): SanitizedRecord | undefined => {
  if (profile === null || profile === undefined) {
    return undefined;
  }

  const sanitized = sanitizeValue(profile);

  if (isObject(sanitized) && Object.keys(sanitized).length) {
    return sanitized;
  }

  return undefined;
};
const sanitizeSteps = (
  compact: AnamnesisCompactSummary,
): Array<{
  key: string;
  completed: boolean;
  payload?: SanitizedRecord;
}> =>
  compact.steps.map((step) => {
    const payload = sanitizeValue(step.payload) as SanitizedRecord | undefined;
    return {
      key: step.key,
      completed: Boolean(step.completed),
      ...(payload && Object.keys(payload).length ? { payload } : {}),
    };
  });

const sanitizeAttachments = (
  compact: AnamnesisCompactSummary,
): Array<{ id: string; fileName: string; stepNumber?: number }> =>
  (compact.attachments ?? []).map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    ...(attachment.stepNumber !== undefined ? { stepNumber: attachment.stepNumber } : {}),
  }));

const buildCompactPayload = (
  request: AnamnesisAIRequestPayload,
  compact: AnamnesisCompactSummary,
): SanitizedRecord => {
  const completionRate =
    typeof request.metadata?.completionRate === 'number'
      ? request.metadata?.completionRate
      : compact.completionRate;

  const visit = {
    anamnesisId: request.anamnesisId,
    consultationId: request.consultationId,
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : undefined,
    status: request.status,
    completionRate,
    attachments: sanitizeAttachments(compact),
  };

  const metadata = sanitizeValue(request.metadata) as SanitizedRecord | undefined;

  return {
    patientProfile: sanitizeProfile(request.patientProfile ?? undefined),
    professionalProfile: sanitizeProfile(request.professionalProfile ?? undefined),
    visit,
    steps: sanitizeSteps(compact),
    metadata,
  };
};

const buildUserPrompt = (rollupSummary: string, compactJson: string): string => {
  const sections: string[] = [];

  sections.push('Dados consolidados anteriores (resumo):');
  sections.push(rollupSummary);
  sections.push('');
  sections.push('Dados da anamnese atual (compact):');
  sections.push(compactJson);
  sections.push('');
  sections.push('Tarefas (obrigatorias):');
  sections.push(
    '1) Compare a anamnese atual com o resumo anterior. Liste mudancas clinicas relevantes (melhoras/pioras/novos achados).',
  );
  sections.push('2) Gere DOIS artefatos:');
  sections.push(
    '   a) THERAPEUTIC_PLAN: recomendacoes claras, com doses sugestivas quando aplicavel, alternativas, red flags e plano de seguimento.',
  );
  sections.push(
    '   b) CLINICAL_REASONING: explique, em linguagem tecnica acessivel, por que cada recomendacao foi feita, citando as evidencias do caso.',
  );
  sections.push(
    '3) Produza tambem um EVIDENCE_MAP (JSON) mapeando cada recomendacao a dados do caso (ex.: campo/achado/medida) e nivel de confianca (0-1).',
  );
  sections.push(
    '4) Seja sucinto (600-900 palavras no total). Nao inclua dados pessoais sensiveis desnecessarios.',
  );
  sections.push('');
  sections.push('Formato de saida (JSON):');
  sections.push('{');
  sections.push('  "plan_text": "...",');
  sections.push('  "reasoning_text": "...",');
  sections.push('  "confidence": 0.78,');
  sections.push('  "evidence_map": [');
  sections.push('    {');
  sections.push('      "recommendation": "Fitoterapico X 200mg a noite",');
  sections.push(
    '      "evidence": ["insonia referida", "estresse elevado", "cefaleia tensional"],',
  );
  sections.push('      "confidence": 0.72');
  sections.push('    }');
  sections.push('  ]');
  sections.push('}');

  return sections.join('\n');
};

export const buildAnamnesisAIPrompt = (input: BuildAnamnesisAIPromptInput): AnamnesisAIPrompt => {
  const rollupSummary =
    input.request.patientRollup?.summaryText?.trim() ?? 'Sem resumo anterior disponivel.';
  const compactPayload = buildCompactPayload(input.request, input.compact);
  const compactJson = JSON.stringify(compactPayload, null, 2);

  return {
    version: input.promptVersion,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(rollupSummary, compactJson),
    compact: compactPayload,
    rollupSummary,
  };
};
