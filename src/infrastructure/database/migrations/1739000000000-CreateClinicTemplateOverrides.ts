import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateClinicTemplateOverrides1739000000000 implements MigrationInterface {
  private readonly tableName = 'clinic_template_overrides';

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
            name: 'template_clinic_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'section',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'override_version',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'override_payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'override_hash',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'base_template_version_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'base_template_version_number',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'applied_configuration_version_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
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
          {
            name: 'superseded_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'superseded_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'fk_clinic_template_overrides_clinic',
            columnNames: ['clinic_id'],
            referencedTableName: 'clinic_clinics',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'fk_clinic_template_overrides_template_clinic',
            columnNames: ['template_clinic_id'],
            referencedTableName: 'clinic_clinics',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'idx_clinic_template_overrides_clinic_section_version',
            columnNames: ['clinic_id', 'section', 'override_version'],
            isUnique: true,
          },
          {
            name: 'idx_clinic_template_overrides_active',
            columnNames: ['clinic_id', 'section', 'superseded_at'],
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
