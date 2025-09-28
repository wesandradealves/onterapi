import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_STEP_TEMPLATES = [
  {
    key: 'identification',
    title: 'Identificação',
    description: 'Dados pessoais e de contato do paciente.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'personalInfo',
          title: 'Informações Pessoais',
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
              label: 'Gênero',
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
            { name: 'convenio', type: 'text', label: 'Convênio', required: false },
          ],
        },
      ],
    },
  },
  {
    key: 'chiefComplaint',
    title: 'Queixa Principal',
    description: 'Motivo da consulta e histórico recente.',
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
              label: 'Histórico da queixa',
              required: true,
              minLength: 10,
            },
            { name: 'startDate', type: 'date', label: 'Início dos sintomas' },
            { name: 'duration', type: 'text', label: 'Duração' },
          ],
        },
      ],
    },
  },
  {
    key: 'currentDisease',
    title: 'História da Doença Atual',
    description: 'Tratamentos prévios e evolução da doença atual.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'evolution',
          title: 'Evolução',
          fields: [
            {
              name: 'description',
              type: 'textarea',
              label: 'Descrição',
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
              label: 'Frequência',
              options: ['constant', 'intermittent', 'occasional'],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'pathologicalHistory',
    title: 'Histórico Patológico',
    description: 'Doenças prévias, cirurgias e alergias.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'previousDiseases',
          title: 'Doenças Prévias',
          fields: [
            { name: 'previousDiseases', type: 'array', label: 'Doenças', itemType: 'text' },
            { name: 'allergies', type: 'array', label: 'Alergias', itemType: 'text' },
          ],
        },
      ],
    },
  },
  {
    key: 'familyHistory',
    title: 'Histórico Familiar',
    description: 'Doenças hereditárias e fatores familiares relevantes.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'familyHistory',
          title: 'Histórico Familiar',
          fields: [
            {
              name: 'familyDiseases',
              type: 'array',
              label: 'Doenças na família',
              itemType: 'text',
            },
            {
              name: 'hereditaryDiseases',
              type: 'array',
              label: 'Doenças hereditárias',
              itemType: 'text',
            },
          ],
        },
      ],
    },
  },
  {
    key: 'systemsReview',
    title: 'Revisão de Sistemas',
    description: 'Avaliação de sistemas e sintomas associados.',
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
    description: 'Hábitos diários, alimentação, sono e atividade física.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'habits',
          title: 'Hábitos',
          fields: [
            { name: 'smoker', type: 'boolean', label: 'Fumante?' },
            { name: 'exercicesPerWeek', type: 'number', label: 'Exercícios por semana' },
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
              label: 'Nível de estresse',
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
    title: 'Medicações em Uso',
    description: 'Lista de medicamentos atuais e posologia.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'medications',
          title: 'Medicações',
          fields: [
            { name: 'currentMedications', type: 'array', label: 'Medicações', itemType: 'text' },
          ],
        },
      ],
    },
  },
  {
    key: 'physicalExam',
    title: 'Exame Físico',
    description: 'Dados do exame físico e sinais vitais.',
    specialty: 'default',
    schema: {
      sections: [
        {
          id: 'vitals',
          title: 'Sinais Vitais',
          fields: [
            { name: 'heightCm', type: 'number', label: 'Altura (cm)' },
            { name: 'weightKg', type: 'number', label: 'Peso (kg)' },
            { name: 'bloodPressure', type: 'text', label: 'Pressão arterial' },
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
      CREATE UNIQUE INDEX "uniq_step_template_key_version_tenant"
        ON "anamnesis_step_templates" (COALESCE("tenant_id", '00000000-0000-0000-0000-000000000000'::uuid), "key", "version")
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
    await queryRunner.query('DROP INDEX IF EXISTS "uniq_step_template_key_version_tenant"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_step_templates"');
  }
}
