import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClinicAuditLogs1738900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinic_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'clinic_id', type: 'uuid', isNullable: true },
          { name: 'event', type: 'varchar', length: '150' },
          { name: 'performed_by', type: 'uuid', isNullable: true },
          { name: 'detail', type: 'jsonb', default: "'{}'" },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'clinic_audit_logs',
      new TableIndex({
        name: 'IDX_clinic_audit_logs_tenant_clinic',
        columnNames: ['tenant_id', 'clinic_id'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_audit_logs',
      new TableIndex({
        name: 'IDX_clinic_audit_logs_tenant_event',
        columnNames: ['tenant_id', 'event'],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_audit_logs',
      new TableForeignKey({
        columnNames: ['clinic_id'],
        referencedTableName: 'clinic_clinics',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinic_audit_logs');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.includes('clinic_id'));
      if (foreignKey) {
        await queryRunner.dropForeignKey('clinic_audit_logs', foreignKey);
      }
    }

    await queryRunner.dropTable('clinic_audit_logs');
  }
}
