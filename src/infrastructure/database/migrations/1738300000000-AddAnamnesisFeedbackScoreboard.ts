import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnamnesisFeedbackScoreboard1738300000000 implements MigrationInterface {
  name = 'AddAnamnesisFeedbackScoreboard1738300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "analysis_id" uuid NULL',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_plan_analysis" ON "anamnesis_therapeutic_plans" ("analysis_id")',
    );

    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD CONSTRAINT "fk_plan_analysis" FOREIGN KEY ("analysis_id") REFERENCES "anamnesis_ai_analyses"("id") ON DELETE SET NULL',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "anamnesis_ai_feedbacks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "anamnesis_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "analysis_id" uuid NULL,
        "approval_status" VARCHAR(16) NOT NULL,
        "liked" BOOLEAN NULL,
        "feedback_comment" TEXT NULL,
        "feedback_given_by" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_feedback_anamnesis" FOREIGN KEY ("anamnesis_id") REFERENCES "anamneses"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_feedback_plan" FOREIGN KEY ("plan_id") REFERENCES "anamnesis_therapeutic_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_feedback_analysis" FOREIGN KEY ("analysis_id") REFERENCES "anamnesis_ai_analyses"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_feedback_tenant_analysis" ON "anamnesis_ai_feedbacks" ("tenant_id", "analysis_id")',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_feedback_tenant_plan" ON "anamnesis_ai_feedbacks" ("tenant_id", "plan_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_feedback_tenant_plan"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_feedback_tenant_analysis"');
    await queryRunner.query('DROP TABLE IF EXISTS "anamnesis_ai_feedbacks"');
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP CONSTRAINT IF EXISTS "fk_plan_analysis"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "idx_plan_analysis"');
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "analysis_id"',
    );
  }
}
