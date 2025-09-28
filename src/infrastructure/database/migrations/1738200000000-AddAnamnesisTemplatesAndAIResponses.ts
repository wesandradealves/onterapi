import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_STEP_TEMPLATES = [
  {
    key: 'identification',
    title: 'Identificacao',
    description: 'Dados pessoais e de contato do paciente.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'personalInfo',
          title: 'Informacoes Pessoais',
          fields: [
            {
              name: 'fullName',
              type: 'text',
              label: 'Nome completo',
              required: true,
              minLength: 3,
            },
            { name: 'birthDate', type: 'date', label: 'Data de nascimento', required: true },
            {
              name: 'gender',
              type: 'select',
              label: 'Genero',
              required: true,
              options: ['male', 'female', 'other', 'prefer_not_to_say'],
            },
          ],
        },
        {
          id: 'contactInfo',
          title: 'Contato',
          fields: [
            { name: 'phone', type: 'tel', label: 'Telefone', pattern: '^[0-9()+\\s-]{8,15}$' },
            { name: 'convenio', type: 'text', label: 'Convenio', required: false },
          ],
        },
      ],
    },
  },
  {
    key: 'chiefComplaint',
    title: 'Queixa Principal',
    description: 'Motivo da consulta e historico recente.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'chiefComplaint',
          title: 'Queixa',
          fields: [
            {
              name: 'history',
              type: 'textarea',
              label: 'Historico da queixa',
              required: true,
              minLength: 10,
            },
            { name: 'startDate', type: 'date', label: 'Inicio dos sintomas' },
            { name: 'duration', type: 'text', label: 'Duracao' },
          ],
        },
      ],
    },
  },
  {
    key: 'currentDisease',
    title: 'Historia da Doenca Atual',
    description: 'Tratamentos previos e evolucao da doenca atual.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'evolution',
          title: 'Evolucao',
          fields: [
            {
              name: 'description',
              type: 'textarea',
              label: 'Descricao',
              required: true,
              minLength: 10,
            },
            {
              name: 'intensity',
              type: 'select',
              label: 'Intensidade',
              options: [1, 2, 3, 4, 5],
            },
            {
              name: 'frequency',
              type: 'select',
              label: 'Frequencia',
              options: ['constant', 'intermittent', 'occasional'],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'pathologicalHistory',
    title: 'Historico Patologico',
    description: 'Doencas previas, cirurgias e alergias.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'previousDiseases',
          title: 'Doencas Previas',
          fields: [
            { name: 'previousDiseases', type: 'array', label: 'Doencas', itemType: 'text' },
            { name: 'allergies', type: 'array', label: 'Alergias', itemType: 'text' },
          ],
        },
      ],
    },
  },
  {
    key: 'familyHistory',
    title: 'Historico Familiar',
    description: 'Doencas hereditarias e fatores familiares relevantes.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'familyHistory',
          title: 'Historico Familiar',
          fields: [
            {
              name: 'familyDiseases',
              type: 'array',
              label: 'Doencas na familia',
              itemType: 'text',
            },
            {
              name: 'hereditaryDiseases',
              type: 'array',
              label: 'Doencas hereditarias',
              itemType: 'text',
            },
          ],
        },
      ],
    },
  },
  {
    key: 'systemsReview',
    title: 'Revisao de Sistemas',
    description: 'Avaliacao de sistemas e sintomas associados.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'systemsReview',
          title: 'Sistemas',
          fields: [
            { name: 'hasSymptoms', type: 'boolean', label: 'Apresenta sintomas?' },
            { name: 'symptoms', type: 'array', label: 'Sintomas', itemType: 'text' },
          ],
        },
      ],
    },
  },
  {
    key: 'lifestyle',
    title: 'Estilo de Vida',
    description: 'Habitos diarios, alimentacao, sono e atividade fisica.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'habits',
          title: 'Habitos',
          fields: [
            { name: 'smoker', type: 'boolean', label: 'Fumante?' },
            { name: 'exercicesPerWeek', type: 'number', label: 'Exercicios por semana' },
            {
              name: 'sleepQuality',
              type: 'select',
              label: 'Qualidade do sono',
              options: ['good', 'regular', 'poor'],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'psychosocial',
    title: 'Psicossocial',
    description: 'Aspectos emocionais, sociais e ocupacionais.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'psychosocial',
          title: 'Psicossocial',
          fields: [
            {
              name: 'stressLevel',
              type: 'select',
              label: 'Nivel de estresse',
              options: ['low', 'medium', 'high'],
            },
            { name: 'supportNetwork', type: 'textarea', label: 'Rede de apoio' },
          ],
        },
      ],
    },
  },
  {
    key: 'medication',
    title: 'Medicacoes em Uso',
    description: 'Lista de medicamentos atuais e posologia.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'medications',
          title: 'Medicacoes',
          fields: [
            { name: 'currentMedications', type: 'array', label: 'Medicacoes', itemType: 'text' },
          ],
        },
      ],
    },
  },
  {
    key: 'physicalExam',
    title: 'Exame Fisico',
    description: 'Dados do exame fisico e sinais vitais.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'vitals',
          title: 'Sinais Vitais',
          fields: [
            { name: 'heightCm', type: 'number', label: 'Altura (cm)' },
            { name: 'weightKg', type: 'number', label: 'Peso (kg)' },
            { name: 'bloodPressure', type: 'text', label: 'Pressao arterial' },
          ],
        },
      ],
    },
  },
];

const SPECIALTY_STEP_TEMPLATES = [
  {
    key: 'lifestyle',
    title: 'Habitos Alimentares',
    description: 'Campos adicionais para avaliacao nutricional.',
    specialty: 'nutrition',
    version: 1,
    schema: {
      sections: [
        {
          id: 'nutritionProfile',
          title: 'Perfil nutricional',
          fields: [
            {
              name: 'dietType',
              type: 'select',
              label: 'Tipo de dieta',
              options: ['balanced', 'low_carb', 'vegetarian', 'vegan', 'ketogenic', 'other'],
            },
            {
              name: 'foodRestrictions',
              type: 'array',
              label: 'Restricoes ou intolerancias',
              itemType: 'text',
            },
            {
              name: 'hydrationHabits',
              type: 'text',
              label: 'Habitos de hidratacao',
            },
          ],
        },
      ],
    },
  },
  {
    key: 'physicalExam',
    title: 'Exame Fisico - Fisioterapia',
    description: 'Itens funcionais para fisioterapia.',
    specialty: 'physiotherapy',
    version: 1,
    schema: {
      sections: [
        {
          id: 'functionalAssessment',
          title: 'Avaliacao funcional',
          fields: [
            {
              name: 'rangeOfMotion',
              type: 'textarea',
              label: 'Amplitude de movimento',
            },
            {
              name: 'painScale',
              type: 'select',
              label: 'Escala de dor',
              options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            },
            {
              name: 'mobilityNotes',
              type: 'textarea',
              label: 'Observacoes de mobilidade',
            },
          ],
        },
      ],
    },
  },
  {
    key: 'psychosocial',
    title: 'Aspectos Psicossociais',
    description: 'Campos especificos para acompanhamento psicologico.',
    specialty: 'psychology',
    version: 1,
    schema: {
      sections: [
        {
          id: 'mentalHealth',
          title: 'Saude mental',
          fields: [
            {
              name: 'mood',
              type: 'select',
              label: 'Humor atual',
              options: ['estavel', 'ansioso', 'deprimido', 'irritado', 'outro'],
            },
            {
              name: 'stressLevel',
              type: 'select',
              label: 'Nivel de estresse',
              options: ['baixo', 'moderado', 'alto'],
            },
            {
              name: 'sleepQuality',
              type: 'select',
              label: 'Qualidade do sono',
              options: ['boa', 'regular', 'ruim'],
            },
            {
              name: 'supportNetwork',
              type: 'textarea',
              label: 'Rede de apoio',
            },
          ],
        },
      ],
    },
  },
];

export class AddAnamnesisTemplatesAndAIResponses1738200000000 implements MigrationInterface {
  name = 'AddAnamnesisTemplatesAndAIResponses1738200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "anamnesis_step_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" VARCHAR(64) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NULL,
        "schema" JSONB NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "specialty" VARCHAR(128) NULL,
        "tenant_id" uuid NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uniq_step_template_scope"
        ON "anamnesis_step_templates" (
          COALESCE("tenant_id", '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE("specialty", 'default'),
          "key",
          "version"
        )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_step_template_key"
        ON "anamnesis_step_templates" ("key")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_step_template_specialty"
        ON "anamnesis_step_templates" (COALESCE("specialty", 'default'))
    `);

    for (const template of DEFAULT_STEP_TEMPLATES) {
      await queryRunner.query(
        `INSERT INTO "anamnesis_step_templates" ("key", "title", "description", "schema", "version", "specialty", "is_active")
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, true)`,
        [
          template.key,
          template.title,
          template.description,
          JSON.stringify(template.schema),
          1,
          template.specialty,
        ],
      );
    }

    for (const template of SPECIALTY_STEP_TEMPLATES) {
      await queryRunner.query(
        `INSERT INTO "anamnesis_step_templates" ("key", "title", "description", "schema", "version", "specialty", "is_active")
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, true)`,
        [
          template.key,
          template.title,
          template.description,
          JSON.stringify(template.schema),
          template.version ?? 1,
          template.specialty,
        ],
      );
    }

    await queryRunner.query(`
      CREATE TABLE "anamnesis_ai_analyses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "anamnesis_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
        "payload" JSONB NULL,
        "clinical_reasoning" TEXT NULL,
        "summary" TEXT NULL,
        "risk_factors" JSONB NULL,
        "recommendations" JSONB NULL,
        "confidence" NUMERIC(5,2) NULL,
        "generated_at" TIMESTAMPTZ NULL,
        "responded_at" TIMESTAMPTZ NULL,
        "error_message" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ai_analysis_anamnesis" FOREIGN KEY ("anamnesis_id") REFERENCES "anamneses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ai_analysis_tenant_anamnesis"
        ON "anamnesis_ai_analyses" ("tenant_id", "anamnesis_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ai_analysis_status"
        ON "anamnesis_ai_analyses" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_ai_analysis_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_ai_analysis_tenant_anamnesis"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_ai_analyses"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_step_template_specialty"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_step_template_key"');
    await queryRunner.query('DROP INDEX IF EXISTS "uniq_step_template_scope"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_step_templates"');
  }
}
