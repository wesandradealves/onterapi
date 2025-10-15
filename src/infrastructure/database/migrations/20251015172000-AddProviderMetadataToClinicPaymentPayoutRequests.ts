import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProviderMetadataToClinicPaymentPayoutRequests20251015172000
  implements MigrationInterface
{
  private readonly tableName = 'clinic_payment_payout_requests';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: TableColumn[] = [
      new TableColumn({
        name: 'provider_payout_id',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
      new TableColumn({
        name: 'provider_status',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
      new TableColumn({
        name: 'provider_payload',
        type: 'jsonb',
        isNullable: true,
      }),
      new TableColumn({
        name: 'executed_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      const exists = await queryRunner.hasColumn(this.tableName, column.name);
      if (!exists) {
        await queryRunner.addColumn(this.tableName, column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnNames = [
      'executed_at',
      'provider_payload',
      'provider_status',
      'provider_payout_id',
    ];

    for (const columnName of columnNames) {
      const exists = await queryRunner.hasColumn(this.tableName, columnName);
      if (exists) {
        await queryRunner.dropColumn(this.tableName, columnName);
      }
    }
  }
}
