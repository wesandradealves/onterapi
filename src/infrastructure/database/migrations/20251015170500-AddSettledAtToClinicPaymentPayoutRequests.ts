import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSettledAtToClinicPaymentPayoutRequests20251015170500 implements MigrationInterface {
  private readonly tableName = 'clinic_payment_payout_requests';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasColumn(this.tableName, 'settled_at');

    if (!exists) {
      await queryRunner.addColumn(
        this.tableName,
        new TableColumn({
          name: 'settled_at',
          type: 'timestamp with time zone',
          isNullable: false,
          default: `now()`,
        }),
      );

      await queryRunner.query(`UPDATE ${this.tableName} SET settled_at = requested_at`);

      await queryRunner.query(`ALTER TABLE ${this.tableName} ALTER COLUMN settled_at DROP DEFAULT`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasColumn(this.tableName, 'settled_at');

    if (exists) {
      await queryRunner.dropColumn(this.tableName, 'settled_at');
    }
  }
}
