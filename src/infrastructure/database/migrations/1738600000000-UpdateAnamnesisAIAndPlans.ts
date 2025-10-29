import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAnamnesisAIAndPlans1738600000000 implements MigrationInterface {
  name = 'UpdateAnamnesisAIAndPlans1738600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "model" text',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "prompt_version" text',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "plan_text" text',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "reasoning_text" text',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "evidence_map" jsonb',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "tokens_input" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "tokens_output" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "latency_ms" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" ADD COLUMN IF NOT EXISTS "raw_response" jsonb',
    );

    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "plan_text" text',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "reasoning_text" text',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "evidence_map" jsonb',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "status" varchar(16) NOT NULL DEFAULT \'generated\'',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP WITH TIME ZONE',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "accepted_by" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" ADD COLUMN IF NOT EXISTS "terms_version" varchar(32)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "terms_version"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "accepted_by"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "accepted_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "status"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "evidence_map"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "reasoning_text"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_therapeutic_plans" DROP COLUMN IF EXISTS "plan_text"',
    );

    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "raw_response"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "latency_ms"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "tokens_output"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "tokens_input"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "evidence_map"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "reasoning_text"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "plan_text"',
    );
    await queryRunner.query(
      'ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "prompt_version"',
    );
    await queryRunner.query('ALTER TABLE "anamnesis_ai_analyses" DROP COLUMN IF EXISTS "model"');
  }
}
