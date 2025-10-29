import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceTypeIdToSchedulingBookingHolds20251022123000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scheduling_booking_holds"
      ADD COLUMN IF NOT EXISTS "service_type_id" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_booking_holds_tenant_service"
        ON "scheduling_booking_holds" ("tenant_id", "service_type_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_scheduling_booking_holds_tenant_service"
    `);

    await queryRunner.query(`
      ALTER TABLE "scheduling_booking_holds"
      DROP COLUMN IF EXISTS "service_type_id"
    `);
  }
}
