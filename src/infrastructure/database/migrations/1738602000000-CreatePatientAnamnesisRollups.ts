import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePatientAnamnesisRollups1738602000000 implements MigrationInterface {
  name = 'CreatePatientAnamnesisRollups1738602000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_anamnesis_rollups" (
        "id" uuid PRIMARY KEY,
        "tenant_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "summary_text" text NOT NULL,
        "summary_version" integer NOT NULL DEFAULT 1,
        "last_anamnesis_id" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_patient_anamnesis_rollups_patient" ON "patient_anamnesis_rollups" ("tenant_id", "patient_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "patient_anamnesis_rollups"');
  }
}
