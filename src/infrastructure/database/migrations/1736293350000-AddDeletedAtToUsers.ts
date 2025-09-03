import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1736293350000 implements MigrationInterface {
  name = 'AddDeletedAtToUsers1736293350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasDeletedAt = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'deleted_at'
    `);

    if (!hasDeletedAt || hasDeletedAt.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "deleted_at" TIMESTAMP WITH TIME ZONE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "deleted_at"
    `);
  }
}