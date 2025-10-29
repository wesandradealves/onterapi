import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTherapeuticPlanAccessLogs1738604000000 implements MigrationInterface {
  name = 'CreateTherapeuticPlanAccessLogs1738604000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS "therapeutic_plan_access_logs" (' +
        '"id" uuid PRIMARY KEY,' +
        '"tenant_id" uuid NOT NULL,' +
        '"anamnesis_id" uuid NOT NULL,' +
        '"plan_id" uuid NOT NULL,' +
        '"professional_id" uuid NOT NULL,' +
        '"viewer_role" varchar(32) NOT NULL,' +
        '"viewed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),' +
        '"ip_address" inet,' +
        '"user_agent" text,' +
        '"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()' +
        ')',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_plan_access_logs_tenant" ON "therapeutic_plan_access_logs" ("tenant_id")',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_plan_access_logs_plan" ON "therapeutic_plan_access_logs" ("plan_id")',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_plan_access_logs_anamnesis" ON "therapeutic_plan_access_logs" ("anamnesis_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_plan_access_logs_anamnesis"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_plan_access_logs_plan"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_plan_access_logs_tenant"');
    await queryRunner.query('DROP TABLE IF EXISTS "therapeutic_plan_access_logs"');
  }
}
