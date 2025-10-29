import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedulingTables1738700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling_booking_holds" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "clinic_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "start_at_utc" TIMESTAMPTZ NOT NULL,
        "end_at_utc" TIMESTAMPTZ NOT NULL,
        "ttl_expires_at_utc" TIMESTAMPTZ NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "version" INTEGER NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_booking_holds_tenant_professional_start"
        ON "scheduling_booking_holds" ("tenant_id", "professional_id", "start_at_utc")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling_bookings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "clinic_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "source" VARCHAR(40) NOT NULL,
        "status" VARCHAR(30) NOT NULL,
        "payment_status" VARCHAR(30) NOT NULL,
        "hold_id" uuid NULL,
        "hold_expires_at" TIMESTAMPTZ NULL,
        "start_at_utc" TIMESTAMPTZ NOT NULL,
        "end_at_utc" TIMESTAMPTZ NOT NULL,
        "timezone" VARCHAR(64) NOT NULL,
        "late_tolerance_minutes" INTEGER NOT NULL DEFAULT 15,
        "recurrence_series_id" uuid NULL,
        "cancellation_reason" VARCHAR(40) NULL,
        "pricing_split" JSONB NULL,
        "preconditions_passed" BOOLEAN NOT NULL DEFAULT false,
        "anamnese_required" BOOLEAN NOT NULL DEFAULT false,
        "anamnese_override_reason" TEXT NULL,
        "no_show_marked_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "version" INTEGER NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_bookings_tenant_professional_start"
        ON "scheduling_bookings" ("tenant_id", "professional_id", "start_at_utc")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_bookings_tenant_clinic_start"
        ON "scheduling_bookings" ("tenant_id", "clinic_id", "start_at_utc")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_bookings_tenant_patient"
        ON "scheduling_bookings" ("tenant_id", "patient_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_bookings_tenant_status"
        ON "scheduling_bookings" ("tenant_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling_clinic_invitation_policies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "clinic_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "pricing_mode" VARCHAR(20) NOT NULL,
        "repasse_mode" VARCHAR(20) NOT NULL,
        "channel" VARCHAR(20) NOT NULL,
        "rounding_policy" VARCHAR(20) NOT NULL DEFAULT 'half_even',
        "valid_from" TIMESTAMPTZ NOT NULL,
        "valid_to" TIMESTAMPTZ NULL,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "tax_schema_ref" VARCHAR(64) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_clinic_invitation_policy_lookup"
        ON "scheduling_clinic_invitation_policies" ("tenant_id", "clinic_id", "professional_id", "channel")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling_recurrence_series" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "clinic_id" uuid NOT NULL,
        "pattern" VARCHAR(30) NOT NULL,
        "pattern_value" VARCHAR(100) NOT NULL,
        "start_date_utc" TIMESTAMPTZ NOT NULL,
        "end_date_utc" TIMESTAMPTZ NULL,
        "skip_holidays" BOOLEAN NOT NULL DEFAULT true,
        "holiday_policy" VARCHAR(10) NOT NULL DEFAULT 'skip',
        "max_reschedules_per_occurrence" INTEGER NOT NULL DEFAULT 1,
        "max_reschedules_per_series" INTEGER NOT NULL DEFAULT 3,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scheduling_recurrence_series_professional"
        ON "scheduling_recurrence_series" ("tenant_id", "professional_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling_recurrence_occurrences" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "series_id" uuid NOT NULL,
        "booking_id" uuid NOT NULL,
        "start_at_utc" TIMESTAMPTZ NOT NULL,
        "end_at_utc" TIMESTAMPTZ NOT NULL,
        "reschedules_count" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_scheduling_recurrence_occurrence_unique"
        ON "scheduling_recurrence_occurrences" ("tenant_id", "series_id", "booking_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling_external_calendar_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "professional_id" uuid NOT NULL,
        "source" VARCHAR(40) NOT NULL,
        "external_id" VARCHAR(128) NOT NULL,
        "start_at_utc" TIMESTAMPTZ NOT NULL,
        "end_at_utc" TIMESTAMPTZ NOT NULL,
        "timezone" VARCHAR(64) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "validation_errors" JSONB NULL,
        "resource_id" uuid NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_scheduling_external_calendar_event_unique"
        ON "scheduling_external_calendar_events" ("tenant_id", "professional_id", "external_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduling_external_calendar_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduling_recurrence_occurrences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduling_recurrence_series"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduling_clinic_invitation_policies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduling_bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduling_booking_holds"`);
  }
}
