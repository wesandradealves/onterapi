import { clonePlain } from '../../../shared/utils/clone.util';
import { z } from 'zod';

import { AnamnesisStepKey } from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';

export type StepValidationMode = 'strict' | 'relaxed';

export type ValidationOptions = {
  patientAge?: number;
};

const PHONE_REGEX = /^(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4})-?\d{4}$/;
const WORD_SEPARATOR_REGEX = /\s+/;
const MIN_FULL_NAME_WORDS = 3;
const MIN_ALLOWED_AGE = 0;
const MAX_ALLOWED_AGE = 120;

const BMI_CATEGORIES = [
  { max: 18.5, label: 'underweight' },
  { max: 25, label: 'normal' },
  { max: 30, label: 'overweight' },
  { max: Number.POSITIVE_INFINITY, label: 'obesity' },
] as const;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const calculateAgeFromIso = (iso: string): number | undefined => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
};

const pruneUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const sanitized = value
      .map((item) => pruneUndefined(item))
      .filter((item) => item !== undefined);
    return sanitized;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    Object.entries(record).forEach(([key, entryValue]) => {
      const sanitizedValue = pruneUndefined(entryValue);
      if (sanitizedValue !== undefined) {
        result[key] = sanitizedValue;
      }
    });
    return result;
  }

  if (value === null) {
    return undefined;
  }

  return value;
};

const requiredText = (min = 1, message?: string) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        return normalizeWhitespace(value);
      }
      return value;
    },
    z
      .string({ required_error: message ?? 'Campo obrigatorio' })
      .min(min, { message: message ?? `Deve possuir pelo menos ${min} caracteres` }),
  );

const optionalText = (min = 1, message?: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      if (typeof value !== 'string') {
        return value;
      }
      const normalized = normalizeWhitespace(value);
      return normalized.length === 0 ? undefined : normalized;
    },
    z
      .string()
      .min(min, { message: message ?? `Deve possuir pelo menos ${min} caracteres` })
      .optional(),
  );

interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

const optionalNumber = (options: NumberOptions = {}) => {
  let schema = z.number();

  if (typeof options.min === 'number') {
    schema = schema.min(options.min, {
      message: `Valor deve ser maior ou igual a ${options.min}`,
    });
  }
  if (typeof options.max === 'number') {
    schema = schema.max(options.max, {
      message: `Valor deve ser menor ou igual a ${options.max}`,
    });
  }

  let effectiveSchema: z.ZodType<number> = schema;

  if (options.integer) {
    effectiveSchema = schema.refine((value) => Number.isInteger(value), {
      message: 'Valor deve ser um numero inteiro',
    });
  }

  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      if (!normalized) {
        return undefined;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, effectiveSchema.optional());
};

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'nao'].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean().optional());

const optionalDate = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? value : value.toISOString();
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return undefined;
      }
      const parsed = new Date(normalized);
      return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
    }
    return value;
  },
  z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: 'Data invalida',
    })
    .optional(),
);

const optionalPhone = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value !== 'string') {
      return value;
    }
    const normalized = value.trim();
    const digits = normalized.replace(/[^\d]/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      return digits;
    }
    return normalized;
  },
  z
    .string()
    .refine((val) => PHONE_REGEX.test(val) || /^\d{10,11}$/.test(val), 'Telefone invalido')
    .optional(),
);

const optionalStringArray = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      const items = value
        .map((item) => (typeof item === 'string' ? normalizeWhitespace(item) : undefined))
        .filter((item): item is string => !!item && item.length > 0);
      return items.length > 0 ? items : undefined;
    }
    if (typeof value === 'string') {
      const items = value
        .split(',')
        .map((item) => normalizeWhitespace(item))
        .filter((item) => item.length > 0);
      return items.length > 0 ? items : undefined;
    }
    return undefined;
  },
  z.array(z.string().min(1)).optional(),
);

const optionalId = () =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      if (typeof value === 'string') {
        const normalized = normalizeWhitespace(value);
        return normalized.length === 0 ? undefined : normalized;
      }
      return value;
    },
    z.string().min(1, { message: 'Identificador obrigatorio' }),
  );

const computePackYears = (
  smoking:
    | {
        status?: 'never' | 'former' | 'current';
        startAge?: number;
        quitAge?: number;
        cigarettesPerDay?: number;
        yearsSmoked?: number;
        packYears?: number;
      }
    | undefined,
  patientAge?: number,
): number | undefined => {
  if (!smoking) {
    return undefined;
  }

  if (typeof smoking.packYears === 'number' && Number.isFinite(smoking.packYears)) {
    return Number(smoking.packYears.toFixed(2));
  }

  const cigarettesPerDay = smoking.cigarettesPerDay;
  if (!cigarettesPerDay || cigarettesPerDay <= 0) {
    return undefined;
  }

  let yearsSmoked = smoking.yearsSmoked;
  if (!yearsSmoked || yearsSmoked <= 0) {
    if (smoking.startAge !== undefined) {
      if (smoking.status === 'former' && smoking.quitAge !== undefined) {
        yearsSmoked = smoking.quitAge - smoking.startAge;
      } else if (smoking.status === 'current' && patientAge !== undefined) {
        yearsSmoked = patientAge - smoking.startAge;
      }
    }
  }

  if (!yearsSmoked || yearsSmoked <= 0) {
    return undefined;
  }

  const packYears = (cigarettesPerDay / 20) * yearsSmoked;
  return Number.isFinite(packYears) ? Number(packYears.toFixed(2)) : undefined;
};

const computeBmi = (
  heightCm?: number,
  weightKg?: number,
): { bmi: number; category: string } | undefined => {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return undefined;
  }
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  if (!Number.isFinite(bmi)) {
    return undefined;
  }
  const rounded = Number(bmi.toFixed(2));
  const category = BMI_CATEGORIES.find((item) => rounded < item.max)?.label ?? 'unknown';
  return { bmi: rounded, category };
};

const ensureRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const cloned = clonePlain(value) as Record<string, unknown>;
  return pruneUndefined(cloned) as Record<string, unknown>;
};

type StepValidator = (
  payload: unknown,
  mode: StepValidationMode,
  options: ValidationOptions,
) => Record<string, unknown>;

const createStepValidator = <T extends z.ZodTypeAny>(
  key: AnamnesisStepKey,
  schemaFactory: (mode: StepValidationMode, options: ValidationOptions) => T,
  postProcess?: (payload: z.infer<T>, options: ValidationOptions) => Record<string, unknown>,
): StepValidator => {
  return (payload, mode, options) => {
    const schema = schemaFactory(mode, options);
    const parsed = schema.safeParse(payload ?? {});
    if (!parsed.success) {
      throw AnamnesisErrorFactory.invalidPayload('Dados da etapa sao invalidos', {
        key,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const processed = postProcess
      ? postProcess(parsed.data, options)
      : (parsed.data as unknown as Record<string, unknown>);
    const sanitized = pruneUndefined(processed);
    return (
      sanitized && typeof sanitized === 'object' ? (sanitized as Record<string, unknown>) : {}
    ) as Record<string, unknown>;
  };
};

const identificationSchemaFactory = (mode: StepValidationMode) =>
  z
    .object({
      personalInfo: z
        .object({
          fullName: optionalText(3, 'Nome completo deve possuir pelo menos 3 caracteres'),
          birthDate: optionalDate,
          gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
          maritalStatus: optionalText(),
          profession: optionalText(),
          city: optionalText(),
          state: optionalText(),
        })
        .default({}),
      contactInfo: z
        .object({
          phone: optionalPhone,
          convenio: optionalText(),
        })
        .partial()
        .optional(),
      demographics: z
        .object({
          raceEthnicity: optionalText(),
        })
        .partial()
        .optional(),
    })
    .superRefine((data, ctx) => {
      const fullName = data.personalInfo?.fullName;
      if (mode === 'strict') {
        if (!fullName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['personalInfo', 'fullName'],
            message: 'Nome completo obrigatorio',
          });
        }
        if (!data.personalInfo?.birthDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['personalInfo', 'birthDate'],
            message: 'Data de nascimento obrigatoria',
          });
        }
      }

      if (fullName) {
        const wordCount = fullName.split(WORD_SEPARATOR_REGEX).filter(Boolean).length;
        if (mode === 'strict' && wordCount < MIN_FULL_NAME_WORDS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['personalInfo', 'fullName'],
            message: `Nome completo deve possuir pelo menos ${MIN_FULL_NAME_WORDS} palavras`,
          });
        }
      }

      if (data.personalInfo?.birthDate) {
        const age = calculateAgeFromIso(data.personalInfo.birthDate);
        if (age === undefined || age < MIN_ALLOWED_AGE || age > MAX_ALLOWED_AGE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['personalInfo', 'birthDate'],
            message: 'Idade fora do intervalo permitido',
          });
        }
      }
    });

const chiefComplaintSchemaFactory = (mode: StepValidationMode) =>
  z
    .object({
      complaint: z
        .object({
          history: optionalText(10, 'Historico da queixa deve possuir pelo menos 10 caracteres'),
          startDate: optionalDate,
          duration: optionalText(),
          relatedFactors: optionalStringArray,
          otherFactors: optionalText(),
        })
        .default({}),
      attachments: z
        .object({
          exams: optionalStringArray,
        })
        .partial()
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (mode === 'strict' && !data.complaint?.history) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['complaint', 'history'],
          message: 'Descricao da queixa e obrigatoria',
        });
      }
    });

const treatmentHistorySchema = z.object({
  id: optionalId(),
  type: z.enum(['medication', 'therapy', 'surgery', 'alternative']),
  name: requiredText(1, 'Nome obrigatorio'),
  result: z.enum(['improved', 'worsened', 'no_change']).optional(),
  date: optionalDate,
  duration: optionalText(),
  notes: optionalText(),
});

const examHistorySchema = z.object({
  id: optionalId(),
  name: requiredText(1, 'Nome do exame obrigatorio'),
  date: optionalDate,
  resultSummary: optionalText(),
  attachments: optionalStringArray,
});

const currentDiseaseSchemaFactory = (mode: StepValidationMode) =>
  z
    .object({
      evolution: z
        .object({
          description: optionalText(
            10,
            'Descricao da evolucao deve possuir pelo menos 10 caracteres',
          ),
          intensity: optionalNumber({ min: 1, max: 5, integer: true }),
          frequency: z.enum(['constant', 'intermittent', 'occasional']).optional(),
          triggers: optionalStringArray,
          reliefFactors: optionalStringArray,
        })
        .default({}),
      previousTreatments: z.array(treatmentHistorySchema).optional(),
      examsPerformed: z.array(examHistorySchema).optional(),
    })
    .superRefine((data, ctx) => {
      if (mode === 'strict' && !data.evolution?.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evolution', 'description'],
          message: 'Descricao da evolucao e obrigatoria',
        });
      }
    });

const surgerySchema = z.object({
  id: optionalId(),
  description: requiredText(1, 'Descricao obrigatoria'),
  date: optionalDate,
  notes: optionalText(),
});

const hospitalizationSchema = z
  .object({
    id: optionalId(),
    reason: requiredText(1, 'Motivo obrigatorio'),
    startDate: optionalDate,
    endDate: optionalDate,
    notes: optionalText(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Data de alta deve ser posterior a data de inicio',
        });
      }
    }
  });

const allergySchema = z.object({
  id: optionalId(),
  allergen: requiredText(1, 'Alergeno obrigatorio'),
  reaction: requiredText(1, 'Reacao obrigatoria'),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
});

const pathologicalHistorySchemaFactory = () =>
  z.object({
    previousDiseases: optionalStringArray,
    otherDiseases: optionalText(),
    surgeries: z.array(surgerySchema).optional(),
    hospitalizations: z.array(hospitalizationSchema).optional(),
    allergiesReactions: z.array(allergySchema).optional(),
  });

const familyDiseaseSchema = z
  .object({
    id: optionalId(),
    relationship: z.enum(['father', 'mother', 'sibling', 'grandparent', 'child', 'other']),
    disease: requiredText(1, 'Doenca obrigatoria'),
    ageAtDiagnosis: optionalNumber({ min: 0, max: MAX_ALLOWED_AGE, integer: true }),
    currentAge: optionalNumber({ min: 0, max: 130, integer: true }),
    deceased: optionalBoolean,
  })
  .superRefine((value, ctx) => {
    if (
      value.ageAtDiagnosis !== undefined &&
      value.currentAge !== undefined &&
      value.currentAge < value.ageAtDiagnosis
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentAge'],
        message: 'Idade atual deve ser maior ou igual a idade de diagnostico',
      });
    }
  });

const familyHistorySchemaFactory = () =>
  z.object({
    familyDiseases: z.array(familyDiseaseSchema).optional(),
    hereditaryDiseases: optionalStringArray,
    otherHereditary: optionalText(),
    familyObservations: optionalText(),
  });

const systemSymptomsSchema = z.object({
  symptoms: optionalStringArray,
  otherSymptoms: optionalText(),
  noChanges: optionalBoolean,
});

const systemsReviewSchemaFactory = () =>
  z.object({
    cardiovascular: systemSymptomsSchema.optional(),
    respiratory: systemSymptomsSchema.optional(),
    gastrointestinal: systemSymptomsSchema.optional(),
    genitourinary: systemSymptomsSchema.optional(),
    neurological: systemSymptomsSchema.optional(),
    endocrine: systemSymptomsSchema.optional(),
    musculoskeletal: systemSymptomsSchema.optional(),
    integumentary: systemSymptomsSchema.optional(),
    otherObservations: optionalText(),
  });

const lifestyleSchemaFactory = (mode: StepValidationMode) => {
  const smokingSchema = z
    .object({
      status: z.enum(['never', 'former', 'current']).optional(),
      startAge: optionalNumber({ min: 5, max: MAX_ALLOWED_AGE, integer: true }),
      quitAge: optionalNumber({ min: 5, max: MAX_ALLOWED_AGE, integer: true }),
      cigarettesPerDay: optionalNumber({ min: 1, max: 200 }),
      yearsSmoked: optionalNumber({ min: 0, max: MAX_ALLOWED_AGE }),
      packYears: optionalNumber({ min: 0, max: 200 }),
      notes: optionalText(),
    })
    .superRefine((value, ctx) => {
      if (
        value.quitAge !== undefined &&
        value.startAge !== undefined &&
        value.quitAge < value.startAge
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['quitAge'],
          message: 'Idade ao parar deve ser maior ou igual a idade de inicio',
        });
      }
      if (mode === 'strict' && value.status === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['status'],
          message: 'Status do tabagismo obrigatorio',
        });
      }
    });

  const alcoholSchema = z
    .object({
      frequency: z.enum(['never', 'social', 'weekly', 'daily']).optional(),
      quantity: optionalText(),
      bingeEpisodes: optionalBoolean,
      notes: optionalText(),
    })
    .superRefine((value, ctx) => {
      if (mode === 'strict' && value && value.frequency === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['frequency'],
          message: 'Frequencia de consumo de alcool obrigatoria',
        });
      }
    });

  const drugSchema = z.object({
    usesDrugs: optionalBoolean,
    substances: optionalStringArray,
    frequency: optionalText(),
    lastUse: optionalDate,
    notes: optionalText(),
  });

  const physicalActivitySchema = z.object({
    level: z.enum(['sedentary', 'light', 'moderate', 'intense']).optional(),
    type: optionalText(),
    frequency: optionalNumber({ min: 0, max: 14 }),
    duration: optionalNumber({ min: 0, max: 600 }),
    limitations: optionalText(),
  });

  const nutritionSchema = z.object({
    mealsPerDay: optionalNumber({ min: 0, max: 10, integer: true }),
    waterIntakeLiters: optionalNumber({ min: 0, max: 10 }),
    dietaryRestrictions: optionalStringArray,
    observations: optionalText(),
  });

  const sleepSchema = z.object({
    hoursPerNight: optionalNumber({ min: 0, max: 24 }),
    quality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
    disturbances: optionalStringArray,
    usesSleepMedication: optionalBoolean,
    notes: optionalText(),
  });

  return z.object({
    smoking: smokingSchema.optional(),
    alcohol: alcoholSchema.optional(),
    drugs: drugSchema.optional(),
    physicalActivity: physicalActivitySchema.optional(),
    nutrition: nutritionSchema.optional(),
    sleep: sleepSchema.optional(),
  });
};

type LifestyleSchema = ReturnType<typeof lifestyleSchemaFactory>;
type LifestylePayload = z.infer<LifestyleSchema>;

const lifestylePostProcess = (
  payload: LifestylePayload,
  options: ValidationOptions,
): Record<string, unknown> => {
  const clone = clonePlain(payload) as Record<string, unknown>;
  const smoking = clone.smoking as Record<string, unknown> | undefined;
  if (smoking) {
    const computedPackYears = computePackYears(
      {
        status: smoking.status as 'never' | 'former' | 'current' | undefined,
        startAge: typeof smoking.startAge === 'number' ? smoking.startAge : undefined,
        quitAge: typeof smoking.quitAge === 'number' ? smoking.quitAge : undefined,
        cigarettesPerDay:
          typeof smoking.cigarettesPerDay === 'number' ? smoking.cigarettesPerDay : undefined,
        yearsSmoked: typeof smoking.yearsSmoked === 'number' ? smoking.yearsSmoked : undefined,
        packYears: typeof smoking.packYears === 'number' ? smoking.packYears : undefined,
      },
      options.patientAge,
    );
    if (computedPackYears !== undefined) {
      smoking.packYears = computedPackYears;
    } else if ('packYears' in smoking) {
      delete smoking.packYears;
    }
  }
  return clone;
};

const psychosocialSchemaFactory = (mode: StepValidationMode) =>
  z
    .object({
      emotional: z
        .object({
          currentMood: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
          stressLevel: optionalNumber({ min: 0, max: 10 }),
          symptoms: optionalStringArray,
          support: z
            .object({
              livesWith: optionalText(),
              hasSupportNetwork: optionalBoolean,
              primarySupport: optionalText(),
              observations: optionalText(),
            })
            .optional(),
        })
        .default({}),
      work: z
        .object({
          employmentStatus: z
            .enum(['employed', 'self_employed', 'student', 'unemployed', 'retired'])
            .optional(),
          occupation: optionalText(),
          workingHours: optionalText(),
          workStressLevel: optionalNumber({ min: 0, max: 10 }),
          observations: optionalText(),
        })
        .optional(),
      goals: optionalText(),
    })
    .superRefine((data, ctx) => {
      if (mode === 'strict' && !data.emotional?.currentMood) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['emotional', 'currentMood'],
          message: 'Humor atual obrigatorio',
        });
      }
      if (
        data.emotional?.stressLevel !== undefined &&
        (data.emotional.stressLevel < 0 || data.emotional.stressLevel > 10)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['emotional', 'stressLevel'],
          message: 'Nivel de estresse deve estar entre 0 e 10',
        });
      }
    });

const medicationItemSchema = z.object({
  id: optionalId(),
  name: requiredText(1, 'Nome do medicamento obrigatorio'),
  dosage: requiredText(1, 'Dosagem obrigatoria'),
  frequency: requiredText(1, 'Frequencia obrigatoria'),
  indication: optionalText(),
  startDate: optionalDate,
  prescribedBy: optionalText(),
});

const phytotherapyItemSchema = z.object({
  id: optionalId(),
  name: requiredText(1, 'Nome obrigatorio'),
  purpose: optionalText(),
  frequency: optionalText(),
});

const supplementItemSchema = z.object({
  id: optionalId(),
  name: requiredText(1, 'Nome obrigatorio'),
  dosage: optionalText(),
  frequency: optionalText(),
});

const adverseReactionItemSchema = z.object({
  id: optionalId(),
  description: requiredText(1, 'Descricao obrigatoria'),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  occurredAt: optionalDate,
});

const medicationSchemaFactory = () =>
  z.object({
    currentMedications: z.array(medicationItemSchema).optional(),
    phytotherapy: z.array(phytotherapyItemSchema).optional(),
    supplements: z.array(supplementItemSchema).optional(),
    adverseReactions: z.array(adverseReactionItemSchema).optional(),
    adherence: z.enum(['always', 'mostly', 'sometimes', 'rarely', 'never']).optional(),
  });

const physicalExamSchemaFactory = () =>
  z
    .object({
      anthropometry: z
        .object({
          height: optionalNumber({ min: 90, max: 250 }),
          weight: optionalNumber({ min: 2, max: 400 }),
          bmi: optionalNumber({ min: 5, max: 100 }),
          bmiCategory: optionalText(),
        })
        .optional(),
      vitalSigns: z
        .object({
          bloodPressure: z
            .object({
              systolic: optionalNumber({ min: 40, max: 300 }),
              diastolic: optionalNumber({ min: 30, max: 200 }),
            })
            .optional(),
          heartRate: optionalNumber({ min: 20, max: 220 }),
          temperature: optionalNumber({ min: 30, max: 45 }),
          respiratoryRate: optionalNumber({ min: 5, max: 60 }),
          oxygenSaturation: optionalNumber({ min: 50, max: 100 }),
        })
        .optional(),
      generalExam: z
        .array(
          z.object({
            id: optionalId(),
            description: requiredText(1, 'Descricao obrigatoria'),
            relevant: optionalBoolean,
          }),
        )
        .optional(),
      observations: optionalText(),
    })
    .superRefine((data, ctx) => {
      const anthropometry = data.anthropometry;
      if (anthropometry) {
        if (
          (anthropometry.height !== undefined && anthropometry.weight === undefined) ||
          (anthropometry.weight !== undefined && anthropometry.height === undefined)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['anthropometry'],
            message: 'Altura e peso devem ser informados juntos para calcular o IMC',
          });
        }
      }

      const bloodPressure = data.vitalSigns?.bloodPressure;
      if (
        bloodPressure &&
        ((bloodPressure.systolic !== undefined && bloodPressure.diastolic === undefined) ||
          (bloodPressure.diastolic !== undefined && bloodPressure.systolic === undefined))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['vitalSigns', 'bloodPressure'],
          message: 'Pressao arterial requer valores sistolico e diastolico',
        });
      }
    });

type PhysicalExamSchema = ReturnType<typeof physicalExamSchemaFactory>;
type PhysicalExamPayload = z.infer<PhysicalExamSchema>;

const physicalExamPostProcess = (payload: PhysicalExamPayload): Record<string, unknown> => {
  const clone = clonePlain(payload) as Record<string, unknown>;
  const anthropometry = clone.anthropometry as Record<string, unknown> | undefined;
  if (anthropometry) {
    const height = typeof anthropometry.height === 'number' ? anthropometry.height : undefined;
    const weight = typeof anthropometry.weight === 'number' ? anthropometry.weight : undefined;
    const bmiResult = computeBmi(height, weight);
    if (bmiResult) {
      anthropometry.bmi = bmiResult.bmi;
      anthropometry.bmiCategory = bmiResult.category;
    } else {
      delete anthropometry.bmi;
      delete anthropometry.bmiCategory;
    }
  }
  return clone;
};

const stepValidators: Record<AnamnesisStepKey, StepValidator> = {
  identification: createStepValidator('identification', (mode) =>
    identificationSchemaFactory(mode),
  ),
  chiefComplaint: createStepValidator('chiefComplaint', (mode) =>
    chiefComplaintSchemaFactory(mode),
  ),
  currentDisease: createStepValidator('currentDisease', (mode) =>
    currentDiseaseSchemaFactory(mode),
  ),
  pathologicalHistory: createStepValidator('pathologicalHistory', () =>
    pathologicalHistorySchemaFactory(),
  ),
  familyHistory: createStepValidator('familyHistory', () => familyHistorySchemaFactory()),
  systemsReview: createStepValidator('systemsReview', () => systemsReviewSchemaFactory()),
  lifestyle: createStepValidator(
    'lifestyle',
    (mode, _options) => lifestyleSchemaFactory(mode),
    (payload, options) => lifestylePostProcess(payload, options),
  ),
  psychosocial: createStepValidator('psychosocial', (mode) => psychosocialSchemaFactory(mode)),
  medication: createStepValidator('medication', () => medicationSchemaFactory()),
  physicalExam: createStepValidator(
    'physicalExam',
    () => physicalExamSchemaFactory(),
    (payload) => physicalExamPostProcess(payload),
  ),
};

export const validateAnamnesisStepPayload = (
  key: AnamnesisStepKey,
  payload: unknown,
  mode: StepValidationMode = 'strict',
  options: ValidationOptions = {},
): Record<string, unknown> => {
  const validator = stepValidators[key];
  if (!validator) {
    return ensureRecord(payload);
  }
  return validator(payload, mode, options);
};
