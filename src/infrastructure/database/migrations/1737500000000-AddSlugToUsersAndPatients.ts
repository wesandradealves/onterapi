import { MigrationInterface, QueryRunner } from 'typeorm';
import { appendSlugSuffix, slugify } from '../../../shared/utils/slug.util';

export class AddSlugToUsersAndPatients1737500000000 implements MigrationInterface {
  name = 'AddSlugToUsersAndPatients1737500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "slug" VARCHAR(160)
    `);

    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "slug" VARCHAR(160)
    `);

    await this.backfillUserSlugs(queryRunner);
    await this.backfillPatientSlugs(queryRunner);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "slug" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "patients"
      ALTER COLUMN "slug" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_users_slug" ON "users" ("slug")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_patients_clinic_slug" ON "patients" ("clinic_id", "slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_patients_clinic_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_users_slug"`);

    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "slug"`);
  }

  private async backfillUserSlugs(queryRunner: QueryRunner) {
    const users: Array<{ id: string; name: string | null; slug?: string | null }> = await queryRunner.query(
      `SELECT id, name, slug FROM "users"`
    );

    const usedSlugs = new Set<string>();

    for (const user of users) {
      if (user.slug && user.slug.trim().length) {
        usedSlugs.add(user.slug.trim());
        continue;
      }

      const base = slugify(user.name || user.id);
      let slug = base;
      let counter = 1;

      while (usedSlugs.has(slug)) {
        slug = appendSlugSuffix(base, ++counter);
      }

      usedSlugs.add(slug);

      await queryRunner.query(
        `UPDATE "users" SET slug = $1 WHERE id = $2`,
        [slug, user.id],
      );
    }
  }

  private async backfillPatientSlugs(queryRunner: QueryRunner) {
    const patients: Array<{ id: string; clinic_id: string; slug?: string | null; full_name: string | null }> =
      await queryRunner.query(
        `
          SELECT id, clinic_id, slug, medical_history->>'fullName' AS full_name
          FROM "patients"
        `,
      );

    const clinicSlugMap = new Map<string, Set<string>>();

    for (const patient of patients) {
      const clinicId = patient.clinic_id ?? 'global';
      const used = clinicSlugMap.get(clinicId) ?? new Set<string>();

      if (patient.slug && patient.slug.trim().length) {
        used.add(patient.slug.trim());
        clinicSlugMap.set(clinicId, used);
        continue;
      }

      const base = slugify(patient.full_name || patient.id);
      let slug = base;
      let counter = 1;

      while (used.has(slug)) {
        slug = appendSlugSuffix(base, ++counter);
      }

      used.add(slug);
      clinicSlugMap.set(clinicId, used);

      await queryRunner.query(
        `UPDATE "patients" SET slug = $1 WHERE id = $2`,
        [slug, patient.id],
      );
    }
  }
}
