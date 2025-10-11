import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES_TO_REMOVE_BEFORE_ANAMNESIS = [
  'anamnesis_attachments',
  'anamnesis_therapeutic_plans',
  'anamnesis_steps',
  'ai_therapeutic_plans',
  'anamnesis_chief_complaint',
  'anamnesis_disease_history',
  'anamnesis_exam_files',
  'anamnesis_family_history',
  'anamnesis_identification',
  'anamnesis_lifestyle',
  'anamnesis_medication',
  'anamnesis_pathological_history',
  'anamnesis_physical_exam',
  'anamnesis_psychosocial',
  'anamnesis_systems_review',
  'patient_evolution',
] as const;

const LEGACY_BACKUP_SUFFIX = '_legacy_backup';

const getRowCount = async (queryRunner: QueryRunner, tableName: string): Promise<number> => {
  const result = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);

  if (!Array.isArray(result) || !result[0]) {
    return 0;
  }

  const record = result[0] as Record<string, unknown>;
  const rawCount = record.count ?? (record as Record<string, unknown>).COUNT;

  if (typeof rawCount === 'number') {
    return rawCount;
  }

  if (typeof rawCount === 'string') {
    const parsed = parseInt(rawCount, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const buildLegacyName = async (queryRunner: QueryRunner, tableName: string): Promise<string> => {
  let suffixIndex = 0;
  let candidate = `${tableName}${LEGACY_BACKUP_SUFFIX}`;

  while (await queryRunner.hasTable(candidate)) {
    suffixIndex += 1;
    candidate = `${tableName}${LEGACY_BACKUP_SUFFIX}_${suffixIndex}`;
  }

  return candidate;
};

const dropOrBackupTable = async (queryRunner: QueryRunner, tableName: string): Promise<void> => {
  const exists = await queryRunner.hasTable(tableName);

  if (!exists) {
    return;
  }

  const rowCount = await getRowCount(queryRunner, tableName);

  if (rowCount === 0) {
    await queryRunner.query(`DROP TABLE "${tableName}" CASCADE`);
    return;
  }

  const legacyName = await buildLegacyName(queryRunner, tableName);
  await queryRunner.query(`ALTER TABLE "${tableName}" RENAME TO "${legacyName}"`);
};

export class CreateAnamnesisTables1738100000000 implements MigrationInterface {
  name = 'CreateAnamnesisTables1738100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of TABLES_TO_REMOVE_BEFORE_ANAMNESIS) {
      await dropOrBackupTable(queryRunner, tableName);
    }

    await dropOrBackupTable(queryRunner, 'anamneses');

    await queryRunner.query(`
      CREATE TABLE "anamneses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "consultation_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "total_steps" SMALLINT NOT NULL DEFAULT 10,
        "current_step" SMALLINT NOT NULL DEFAULT 1,
        "completion_rate" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "is_draft" BOOLEAN NOT NULL DEFAULT true,
        "last_auto_saved_at" TIMESTAMPTZ NULL,
        "submitted_at" TIMESTAMPTZ NULL,
        "completed_at" TIMESTAMPTZ NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uniq_anamnesis_consultation"
        ON "anamneses" ("tenant_id", "consultation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_anamnesis_patient"
        ON "anamneses" ("tenant_id", "patient_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_anamnesis_professional"
        ON "anamneses" ("tenant_id", "professional_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_anamnesis_status"
        ON "anamneses" ("tenant_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "anamnesis_steps" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "anamnesis_id" uuid NOT NULL,
        "step_number" SMALLINT NOT NULL,
        "key" VARCHAR(64) NOT NULL,
        "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "has_errors" BOOLEAN NOT NULL DEFAULT false,
        "validation_score" NUMERIC(5,2) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_anamnesis_steps_anamnesis" FOREIGN KEY ("anamnesis_id") REFERENCES "anamneses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uniq_anamnesis_step_number"
        ON "anamnesis_steps" ("anamnesis_id", "step_number")
    `);

    await queryRunner.query(`
      CREATE TABLE "anamnesis_therapeutic_plans" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "anamnesis_id" uuid NOT NULL,
        "clinical_reasoning" TEXT NULL,
        "summary" TEXT NULL,
        "therapeutic_plan" JSONB NULL,
        "risk_factors" JSONB NULL,
        "recommendations" JSONB NULL,
        "confidence" NUMERIC(5,2) NULL,
        "review_required" BOOLEAN NOT NULL DEFAULT false,
        "approval_status" VARCHAR(16) NOT NULL DEFAULT 'pending',
        "liked" BOOLEAN NULL,
        "feedback_comment" TEXT NULL,
        "feedback_given_by" uuid NULL,
        "feedback_given_at" TIMESTAMPTZ NULL,
        "generated_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_anamnesis_plan_anamnesis" FOREIGN KEY ("anamnesis_id") REFERENCES "anamneses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_anamnesis_plan_anamnesis"
        ON "anamnesis_therapeutic_plans" ("anamnesis_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "anamnesis_attachments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "anamnesis_id" uuid NOT NULL,
        "step_number" SMALLINT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "mime_type" VARCHAR(128) NOT NULL,
        "size" INTEGER NOT NULL,
        "storage_path" VARCHAR(512) NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_anamnesis_attachment_anamnesis" FOREIGN KEY ("anamnesis_id") REFERENCES "anamneses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_anamnesis_attachment_step"
        ON "anamnesis_attachments" ("anamnesis_id", "step_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_anamnesis_attachment_step"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_attachments"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_anamnesis_plan_anamnesis"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_therapeutic_plans"');

    await queryRunner.query('DROP INDEX IF EXISTS "uniq_anamnesis_step_number"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_steps"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_anamnesis_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_anamnesis_professional"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_anamnesis_patient"');
    await queryRunner.query('DROP INDEX IF EXISTS "uniq_anamnesis_consultation"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamneses"');

    await queryRunner.query(`
      CREATE TABLE "anamneses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "patient_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "clinic_id" uuid NOT NULL,
        "appointment_id" uuid NOT NULL,
        "status" VARCHAR(20) NOT NULL,
        "started_at" TIMESTAMPTZ NULL,
        "completed_at" TIMESTAMPTZ NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }
}
