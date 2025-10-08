import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLegalTermsGovernance1738608000000 implements MigrationInterface {
  name = 'UpdateLegalTermsGovernance1738608000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "legal_terms" ADD COLUMN IF NOT EXISTS "status" varchar(16) NOT NULL DEFAULT \'draft\'',
    );
    await queryRunner.query(
      'ALTER TABLE "legal_terms" ADD COLUMN IF NOT EXISTS "created_by" uuid NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "legal_terms" ADD COLUMN IF NOT EXISTS "published_by" uuid NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "legal_terms" ADD COLUMN IF NOT EXISTS "retired_at" TIMESTAMP WITH TIME ZONE NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "legal_terms" ADD COLUMN IF NOT EXISTS "retired_by" uuid NULL',
    );

    await queryRunner.query('ALTER TABLE "legal_terms" ALTER COLUMN "is_active" SET DEFAULT false');

    await queryRunner.query(
      `UPDATE "legal_terms"
        SET "status" = CASE WHEN "is_active" = true THEN 'published' ELSE 'draft' END,
            "is_active" = CASE WHEN "is_active" = true THEN true ELSE false END
      `,
    );

    await queryRunner.query('DROP INDEX IF EXISTS "UQ_legal_terms_active_context"');
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_legal_terms_published_context"
        ON "legal_terms" ("tenant_id", "context")
        WHERE "status" = 'published'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_legal_terms_published_context"');
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_legal_terms_active_context"
        ON "legal_terms" ("tenant_id", "context")
        WHERE "is_active" = true`,
    );
    await queryRunner.query('ALTER TABLE "legal_terms" DROP COLUMN IF EXISTS "retired_by"');
    await queryRunner.query('ALTER TABLE "legal_terms" DROP COLUMN IF EXISTS "retired_at"');
    await queryRunner.query('ALTER TABLE "legal_terms" DROP COLUMN IF EXISTS "published_by"');
    await queryRunner.query('ALTER TABLE "legal_terms" DROP COLUMN IF EXISTS "created_by"');
    await queryRunner.query('ALTER TABLE "legal_terms" DROP COLUMN IF EXISTS "status"');
    await queryRunner.query('ALTER TABLE "legal_terms" ALTER COLUMN "is_active" SET DEFAULT true');
  }
}
