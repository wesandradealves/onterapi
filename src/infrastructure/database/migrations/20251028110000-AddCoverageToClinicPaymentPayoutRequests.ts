import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCoverageToClinicPaymentPayoutRequests20251028110000 implements MigrationInterface {
  private readonly tableName = 'clinic_payment_payout_requests';

  private readonly originalProfessionalColumn = new TableColumn({
    name: 'original_professional_id',
    type: 'uuid',
    isNullable: true,
  });

  private readonly coverageColumn = new TableColumn({
    name: 'coverage_id',
    type: 'uuid',
    isNullable: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(this.tableName, this.originalProfessionalColumn);
    await queryRunner.addColumn(this.tableName, this.coverageColumn);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(this.tableName, this.coverageColumn);
    await queryRunner.dropColumn(this.tableName, this.originalProfessionalColumn);
  }
}
