import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTherapeuticPlanAcceptances1738601000000 implements MigrationInterface {
  name = 'CreateTherapeuticPlanAcceptances1738601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "therapeutic_plan_acceptances" (
        "id" uuid PRIMARY KEY,
        "tenant_id" uuid NOT NULL,
        "therapeutic_plan_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "accepted" boolean NOT NULL DEFAULT true,
        "terms_version" varchar(32) NOT NULL,
        "terms_text_snapshot" text NOT NULL,
        "accepted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "accepted_ip" inet,
        "accepted_user_agent" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      'ALTER TABLE "therapeutic_plan_acceptances" ADD CONSTRAINT "FK_therapeutic_plan_acceptances_plan" FOREIGN KEY ("therapeutic_plan_id") REFERENCES "anamnesis_therapeutic_plans"("id") ON DELETE CASCADE',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_therapeutic_plan_acceptances_tenant" ON "therapeutic_plan_acceptances" ("tenant_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_therapeutic_plan_acceptances_plan" ON "therapeutic_plan_acceptances" ("therapeutic_plan_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_therapeutic_plan_acceptances_professional" ON "therapeutic_plan_acceptances" ("professional_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "therapeutic_plan_acceptances" DROP CONSTRAINT IF EXISTS "FK_therapeutic_plan_acceptances_plan"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "therapeutic_plan_acceptances"');
  }
}
