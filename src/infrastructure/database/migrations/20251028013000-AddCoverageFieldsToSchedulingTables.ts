import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverageFieldsToSchedulingTables20251028013000 implements MigrationInterface {
  name = 'AddCoverageFieldsToSchedulingTables20251028013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scheduling_booking_holds" ADD "original_professional_id" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "scheduling_booking_holds" ADD "coverage_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "scheduling_bookings" ADD "original_professional_id" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "scheduling_bookings" ADD "coverage_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "scheduling_bookings" DROP COLUMN "coverage_id"`);
    await queryRunner.query(
      `ALTER TABLE "scheduling_bookings" DROP COLUMN "original_professional_id"`,
    );
    await queryRunner.query(`ALTER TABLE "scheduling_booking_holds" DROP COLUMN "coverage_id"`);
    await queryRunner.query(
      `ALTER TABLE "scheduling_booking_holds" DROP COLUMN "original_professional_id"`,
    );
  }
}
