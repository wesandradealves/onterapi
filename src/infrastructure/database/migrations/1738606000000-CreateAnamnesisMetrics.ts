import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnamnesisMetrics1738606000000 implements MigrationInterface {
  name = 'CreateAnamnesisMetrics1738606000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "anamnesis_metrics" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NULL,
        "metric_date" date NOT NULL,
        "steps_saved" integer NOT NULL DEFAULT 0,
        "auto_saves" integer NOT NULL DEFAULT 0,
        "completed_steps" integer NOT NULL DEFAULT 0,
        "step_completion_rate_sum" numeric(14,6) NOT NULL DEFAULT 0,
        "step_completion_rate_count" integer NOT NULL DEFAULT 0,
        "submissions" integer NOT NULL DEFAULT 0,
        "submission_completion_rate_sum" numeric(14,6) NOT NULL DEFAULT 0,
        "ai_completed" integer NOT NULL DEFAULT 0,
        "ai_failed" integer NOT NULL DEFAULT 0,
        "ai_confidence_sum" numeric(14,6) NOT NULL DEFAULT 0,
        "ai_confidence_count" integer NOT NULL DEFAULT 0,
        "tokens_input_sum" bigint NOT NULL DEFAULT 0,
        "tokens_output_sum" bigint NOT NULL DEFAULT 0,
        "ai_latency_sum" bigint NOT NULL DEFAULT 0,
        "ai_latency_count" integer NOT NULL DEFAULT 0,
        "ai_latency_max" integer NOT NULL DEFAULT 0,
        "ai_cost_sum" numeric(18,8) NOT NULL DEFAULT 0,
        "feedback_total" integer NOT NULL DEFAULT 0,
        "feedback_approvals" integer NOT NULL DEFAULT 0,
        "feedback_modifications" integer NOT NULL DEFAULT 0,
        "feedback_rejections" integer NOT NULL DEFAULT 0,
        "feedback_likes" integer NOT NULL DEFAULT 0,
        "feedback_dislikes" integer NOT NULL DEFAULT 0,
        "last_updated_at" TIMESTAMP WITH TIME ZONE NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_anamnesis_metrics_tenant_date"
        ON "anamnesis_metrics" ("tenant_id", "metric_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_anamnesis_metrics_tenant_date"`);
    await queryRunner.query(`DROP TABLE "anamnesis_metrics"`);
  }
}
