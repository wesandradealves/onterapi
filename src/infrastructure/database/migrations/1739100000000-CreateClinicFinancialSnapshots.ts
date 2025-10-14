import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateClinicFinancialSnapshots1739100000000 implements MigrationInterface {
  private readonly tableName = 'clinic_financial_snapshots';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: this.tableName,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'clinic_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'month',
            type: 'varchar',
            length: '7',
            isNullable: false,
          },
          {
            name: 'revenue',
            type: 'numeric',
            precision: 14,
            scale: 2,
            default: '0',
          },
          {
            name: 'expenses',
            type: 'numeric',
            precision: 14,
            scale: 2,
            default: '0',
          },
          {
            name: 'profit',
            type: 'numeric',
            precision: 14,
            scale: 2,
            default: '0',
          },
          {
            name: 'margin',
            type: 'numeric',
            precision: 5,
            scale: 2,
            default: '0',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            name: 'fk_clinic_financial_snapshots_clinic',
            columnNames: ['clinic_id'],
            referencedTableName: 'clinic_clinics',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'idx_clinic_financial_snapshots_clinic_month',
            columnNames: ['clinic_id', 'month'],
            isUnique: true,
          },
          {
            name: 'idx_clinic_financial_snapshots_tenant_month',
            columnNames: ['tenant_id', 'month'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName, true);
  }
}
