import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTherapeuticPlanTerms1738605000000 implements MigrationInterface {
  name = 'SeedTherapeuticPlanTerms1738605000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO legal_terms (id, tenant_id, context, version, content, status, is_active, created_by, published_at, published_by, retired_at, retired_by, created_at, updated_at)
       VALUES (uuid_generate_v4(), NULL, 'therapeutic_plan', 'v1.0',
               'Declaro estar ciente de que o plano terapeutico e uma assistencia de IA e que a responsabilidade clinica permanece comigo.',
               'published', true, NULL, NOW(), NULL, NULL, NULL, NOW(), NOW())
       ON CONFLICT (tenant_id, context, version) DO NOTHING;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM legal_terms WHERE tenant_id IS NULL AND context = 'therapeutic_plan' AND version = 'v1.0';`,
    );
  }
}
