import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNotificationEventsTable20251014160349 implements MigrationInterface {
  private readonly tableName = 'notification_events';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable(this.tableName);
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: this.tableName,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'event_name', type: 'varchar', length: '150' },
          { name: 'aggregate_id', type: 'varchar', length: '150' },
          { name: 'payload', type: 'jsonb' },
          { name: 'recipients', type: 'jsonb', default: "'[]'" },
          { name: 'channels', type: 'text', isArray: true, default: "'{}'" },
          { name: 'status', type: 'varchar', length: '30', default: "'queued'" },
          { name: 'queued_at', type: 'timestamp with time zone' },
          { name: 'processed_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'error_detail', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName, true);
  }
}
