import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToAnamnesis1738400000000 implements MigrationInterface {
  name = 'AddSoftDeleteToAnamnesis1738400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'anamneses'
        AND column_name IN ('deleted_at', 'deleted_by', 'deleted_reason')
    `)) as Array<{ column_name: string }>;

    const existing = new Set(rows.map((row) => row.column_name));

    if (!existing.has('deleted_at')) {
      await queryRunner.query(`
        ALTER TABLE "anamneses"
        ADD COLUMN "deleted_at" TIMESTAMP WITH TIME ZONE
      `);
    }

    if (!existing.has('deleted_by')) {
      await queryRunner.query(`
        ALTER TABLE "anamneses"
        ADD COLUMN "deleted_by" UUID
      `);
    }

    if (!existing.has('deleted_reason')) {
      await queryRunner.query(`
        ALTER TABLE "anamneses"
        ADD COLUMN "deleted_reason" TEXT
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anamneses"
      DROP COLUMN IF EXISTS "deleted_reason"
    `);

    await queryRunner.query(`
      ALTER TABLE "anamneses"
      DROP COLUMN IF EXISTS "deleted_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "anamneses"
      DROP COLUMN IF EXISTS "deleted_at"
    `);
  }
}
