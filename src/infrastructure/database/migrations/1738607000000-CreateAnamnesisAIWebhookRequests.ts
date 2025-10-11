import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnamnesisAIWebhookRequests1738607000000 implements MigrationInterface {
  name = 'CreateAnamnesisAIWebhookRequests1738607000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "anamnesis_ai_webhook_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NULL,
        "analysis_id" uuid NULL,
        "signature_hash" varchar(128) NOT NULL UNIQUE,
        "payload_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "received_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_ai_webhook_requests_analysis"
        ON "anamnesis_ai_webhook_requests" ("analysis_id")
        WHERE "analysis_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_webhook_requests_analysis"`);
    await queryRunner.query(`DROP TABLE "anamnesis_ai_webhook_requests"`);
  }
}
