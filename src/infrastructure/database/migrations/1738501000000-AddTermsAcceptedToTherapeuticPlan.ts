import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermsAcceptedToTherapeuticPlan1738501000000 implements MigrationInterface {
  name = 'AddTermsAcceptedToTherapeuticPlan1738501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = (await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'anamnesis_therapeutic_plans'
        AND column_name = 'terms_accepted'
    `)) as Array<{ column_name: string }>;

    const alreadyExists = columns.some((column) => column.column_name === 'terms_accepted');

    if (!alreadyExists) {
      await queryRunner.query(`
        ALTER TABLE "anamnesis_therapeutic_plans"
        ADD COLUMN "terms_accepted" BOOLEAN NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "anamnesis_therapeutic_plans"
      DROP COLUMN IF EXISTS "terms_accepted"
    `);
  }
}
