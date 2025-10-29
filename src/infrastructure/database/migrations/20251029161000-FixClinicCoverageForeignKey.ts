import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class FixClinicCoverageForeignKey20251029161000 implements MigrationInterface {
  private readonly tableName = 'clinic_professional_coverages';
  private readonly legacyConstraintName = 'FK_21b387a546cab82411979a682d7';
  private readonly newConstraintName = 'FK_clinic_professional_coverages_clinic';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.tableName);
    if (!table) {
      return;
    }

    const legacyConstraint = table.foreignKeys.find((fk) => fk.name === this.legacyConstraintName);
    if (legacyConstraint) {
      await queryRunner.dropForeignKey(this.tableName, legacyConstraint);
    }

    const existingNewConstraint = table.foreignKeys.find(
      (fk) => fk.name === this.newConstraintName,
    );

    if (!existingNewConstraint) {
      const newForeignKey = new TableForeignKey({
        name: this.newConstraintName,
        columnNames: ['clinic_id'],
        referencedTableName: 'clinic_clinics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      });

      await queryRunner.createForeignKey(this.tableName, newForeignKey);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(this.tableName);
    if (!table) {
      return;
    }

    const currentConstraint = table.foreignKeys.find((fk) => fk.name === this.newConstraintName);
    if (currentConstraint) {
      await queryRunner.dropForeignKey(this.tableName, currentConstraint);
    }

    const legacyConstraint = table.foreignKeys.find((fk) => fk.name === this.legacyConstraintName);
    if (!legacyConstraint) {
      const legacyForeignKey = new TableForeignKey({
        name: this.legacyConstraintName,
        columnNames: ['clinic_id'],
        referencedTableName: 'clinics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      });

      await queryRunner.createForeignKey(this.tableName, legacyForeignKey);
    }
  }
}
