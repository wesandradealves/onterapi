import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddClinicAppointmentsTable1738900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureClinicHoldsTable(queryRunner);

    await queryRunner.createTable(
      new Table({
        name: 'clinic_appointments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'hold_id', type: 'uuid', isUnique: true },
          { name: 'professional_id', type: 'uuid' },
          { name: 'patient_id', type: 'uuid' },
          { name: 'service_type_id', type: 'uuid' },
          { name: 'start_at', type: 'timestamp with time zone' },
          { name: 'end_at', type: 'timestamp with time zone' },
          { name: 'status', type: 'varchar', length: '20' },
          { name: 'payment_status', type: 'varchar', length: '20' },
          { name: 'payment_transaction_id', type: 'varchar', length: '120' },
          { name: 'confirmed_at', type: 'timestamp with time zone' },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'now()' },
          { name: 'version', type: 'integer', default: '1' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_appointments',
      new TableForeignKey({
        name: 'fk_clinic_appointments_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_appointments',
      new TableForeignKey({
        name: 'fk_clinic_appointments_hold',
        columnNames: ['hold_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_holds',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_appointments',
      new TableIndex({
        name: 'idx_clinic_appointments_professional_status',
        columnNames: ['tenant_id', 'professional_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_appointments',
      new TableIndex({
        name: 'idx_clinic_appointments_clinic_start',
        columnNames: ['clinic_id', 'start_at'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_appointments',
      new TableIndex({
        name: 'idx_clinic_appointments_payment_status',
        columnNames: ['clinic_id', 'payment_status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('clinic_appointments', 'idx_clinic_appointments_payment_status');
    await queryRunner.dropIndex('clinic_appointments', 'idx_clinic_appointments_clinic_start');
    await queryRunner.dropIndex(
      'clinic_appointments',
      'idx_clinic_appointments_professional_status',
    );
    await queryRunner.dropForeignKey('clinic_appointments', 'fk_clinic_appointments_hold');
    await queryRunner.dropForeignKey('clinic_appointments', 'fk_clinic_appointments_clinic');
    await queryRunner.dropTable('clinic_appointments');
  }

  private async ensureClinicHoldsTable(queryRunner: QueryRunner): Promise<void> {
    const hasClinicHolds = await queryRunner.hasTable('clinic_holds');

    if (hasClinicHolds) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'clinic_holds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'professional_id', type: 'uuid' },
          { name: 'patient_id', type: 'uuid' },
          { name: 'service_type_id', type: 'uuid' },
          { name: 'start_at', type: 'timestamp with time zone' },
          { name: 'end_at', type: 'timestamp with time zone' },
          { name: 'ttl_expires_at', type: 'timestamp with time zone' },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'location_id', type: 'uuid', isNullable: true },
          { name: 'resources', type: 'jsonb', default: "'[]'" },
          { name: 'idempotency_key', type: 'varchar', length: '120' },
          { name: 'created_by', type: 'uuid' },
          { name: 'confirmed_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'confirmed_by', type: 'uuid', isNullable: true },
          { name: 'cancelled_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'cancelled_by', type: 'uuid', isNullable: true },
          { name: 'cancellation_reason', type: 'text', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'now()' },
          { name: 'version', type: 'integer', default: '1' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_holds',
      new TableForeignKey({
        name: 'fk_clinic_holds_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_holds',
      new TableIndex({
        name: 'idx_clinic_holds_status',
        columnNames: ['clinic_id', 'tenant_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_holds',
      new TableIndex({
        name: 'idx_clinic_holds_expiry',
        columnNames: ['clinic_id', 'tenant_id', 'ttl_expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_holds',
      new TableIndex({
        name: 'idx_clinic_holds_professional',
        columnNames: ['tenant_id', 'professional_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_holds',
      new TableIndex({
        name: 'uq_clinic_holds_idempotency',
        columnNames: ['clinic_id', 'tenant_id', 'idempotency_key'],
        isUnique: true,
      }),
    );
  }
}
