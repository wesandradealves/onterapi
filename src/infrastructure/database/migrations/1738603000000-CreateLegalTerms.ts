import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLegalTerms1738603000000 implements MigrationInterface {
  name = 'CreateLegalTerms1738603000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS "legal_terms" (' +
        '"id" uuid PRIMARY KEY,' +
        '"tenant_id" uuid,' +
        '"context" varchar(64) NOT NULL,' +
        '"version" varchar(32) NOT NULL,' +
        '"content" text NOT NULL,' +
        '"is_active" boolean NOT NULL DEFAULT true,' +
        '"published_at" TIMESTAMP WITH TIME ZONE,' +
        '"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),' +
        '"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()' +
        ')',
    );

    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_legal_terms_context_version"' +
        ' ON "legal_terms" ("tenant_id", "context", "version")',
    );

    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_legal_terms_active_context"' +
        ' ON "legal_terms" ("tenant_id", "context") WHERE "is_active" = true',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_legal_terms_active_context"');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_legal_terms_context_version"');
    await queryRunner.query('DROP TABLE IF EXISTS "legal_terms"');
  }
}
