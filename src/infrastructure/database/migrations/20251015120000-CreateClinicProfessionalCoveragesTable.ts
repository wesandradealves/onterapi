import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClinicProfessionalCoveragesTable20251015120000 implements MigrationInterface {
  private readonly tableName = 'clinic_professional_coverages';

  private readonly clinicForeignKey = new TableForeignKey({
    columnNames: ['clinic_id'],
    referencedTableName: 'clinic_clinics',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
  });

  private readonly indexes = [
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_tenant_clinic',
      columnNames: ['tenant_id', 'clinic_id'],
    }),
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_clinic_professional',
      columnNames: ['clinic_id', 'professional_id'],
    }),
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_clinic_coverage_professional',
      columnNames: ['clinic_id', 'coverage_professional_id'],
    }),
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_tenant_professional',
      columnNames: ['tenant_id', 'professional_id'],
    }),
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_tenant_coverage_professional',
      columnNames: ['tenant_id', 'coverage_professional_id'],
    }),
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_clinic_status',
      columnNames: ['clinic_id', 'status'],
    }),
    new TableIndex({
      name: 'IDX_clinic_professional_coverages_clinic_start_at',
      columnNames: ['clinic_id', 'start_at'],
    }),
  ];

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
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'clinic_id', type: 'uuid', isNullable: false },
          { name: 'professional_id', type: 'uuid', isNullable: false },
          { name: 'coverage_professional_id', type: 'uuid', isNullable: false },
          { name: 'start_at', type: 'timestamp with time zone', isNullable: false },
          { name: 'end_at', type: 'timestamp with time zone', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: `'scheduled'`,
          },
          { name: 'reason', type: 'varchar', length: '255', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          { name: 'created_by', type: 'uuid', isNullable: false },
          { name: 'updated_by', type: 'uuid', isNullable: true },
          { name: 'cancelled_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'cancelled_by', type: 'uuid', isNullable: true },
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
      }),
      true,
    );

    await queryRunner.createForeignKey(this.tableName, this.clinicForeignKey);
    for (const index of this.indexes) {
      await queryRunner.createIndex(this.tableName, index);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of this.indexes) {
      await queryRunner.dropIndex(this.tableName, index);
    }
    await queryRunner.dropForeignKey(this.tableName, this.clinicForeignKey);
    await queryRunner.dropTable(this.tableName);
  }
}
