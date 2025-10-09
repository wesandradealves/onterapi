-- Scheduling schema objects
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.request_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  select NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid;
$$;

CREATE TABLE IF NOT EXISTS public.scheduling_booking_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  start_at_utc timestamptz NOT NULL,
  end_at_utc timestamptz NOT NULL,
  ttl_expires_at_utc timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS scheduling_booking_holds_tenant_professional_start_idx
  ON public.scheduling_booking_holds (tenant_id, professional_id, start_at_utc);

CREATE TABLE IF NOT EXISTS public.scheduling_recurrence_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  pattern varchar(30) NOT NULL,
  pattern_value varchar(100) NOT NULL,
  start_date_utc timestamptz NOT NULL,
  end_date_utc timestamptz NULL,
  skip_holidays boolean NOT NULL DEFAULT true,
  holiday_policy varchar(10) NOT NULL DEFAULT 'skip',
  max_reschedules_per_occurrence integer NOT NULL DEFAULT 1,
  max_reschedules_per_series integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduling_recurrence_series_tenant_professional_idx
  ON public.scheduling_recurrence_series (tenant_id, professional_id);

CREATE TABLE IF NOT EXISTS public.scheduling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  source varchar(40) NOT NULL,
  status varchar(30) NOT NULL,
  payment_status varchar(30) NOT NULL,
  hold_id uuid NULL,
  hold_expires_at timestamptz NULL,
  start_at_utc timestamptz NOT NULL,
  end_at_utc timestamptz NOT NULL,
  timezone varchar(64) NOT NULL,
  late_tolerance_minutes integer NOT NULL DEFAULT 15,
  recurrence_series_id uuid NULL,
  cancellation_reason varchar(40) NULL,
  pricing_split jsonb NULL,
  preconditions_passed boolean NOT NULL DEFAULT false,
  anamnese_required boolean NOT NULL DEFAULT false,
  anamnese_override_reason text NULL,
  no_show_marked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT scheduling_bookings_hold_fk FOREIGN KEY (hold_id)
    REFERENCES public.scheduling_booking_holds (id)
    ON DELETE SET NULL,
  CONSTRAINT scheduling_bookings_recurrence_series_fk FOREIGN KEY (recurrence_series_id)
    REFERENCES public.scheduling_recurrence_series (id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS scheduling_bookings_tenant_professional_start_idx
  ON public.scheduling_bookings (tenant_id, professional_id, start_at_utc);
CREATE INDEX IF NOT EXISTS scheduling_bookings_tenant_clinic_start_idx
  ON public.scheduling_bookings (tenant_id, clinic_id, start_at_utc);
CREATE INDEX IF NOT EXISTS scheduling_bookings_tenant_patient_idx
  ON public.scheduling_bookings (tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS scheduling_bookings_tenant_status_idx
  ON public.scheduling_bookings (tenant_id, status);

CREATE TABLE IF NOT EXISTS public.scheduling_recurrence_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  series_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  start_at_utc timestamptz NOT NULL,
  end_at_utc timestamptz NOT NULL,
  reschedules_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_recurrence_occurrences_series_fk FOREIGN KEY (series_id)
    REFERENCES public.scheduling_recurrence_series (id)
    ON DELETE CASCADE,
  CONSTRAINT scheduling_recurrence_occurrences_booking_fk FOREIGN KEY (booking_id)
    REFERENCES public.scheduling_bookings (id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_recurrence_occurrences_unique_idx
  ON public.scheduling_recurrence_occurrences (tenant_id, series_id, booking_id);

CREATE TABLE IF NOT EXISTS public.scheduling_clinic_invitation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  pricing_mode varchar(20) NOT NULL,
  repasse_mode varchar(20) NOT NULL,
  channel varchar(20) NOT NULL,
  rounding_policy varchar(20) NOT NULL DEFAULT 'half_even',
  valid_from timestamptz NOT NULL,
  valid_to timestamptz NULL,
  priority integer NOT NULL DEFAULT 0,
  tax_schema_ref varchar(64) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduling_invitation_policies_lookup_idx
  ON public.scheduling_clinic_invitation_policies (tenant_id, clinic_id, professional_id, channel);

CREATE TABLE IF NOT EXISTS public.scheduling_external_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  source varchar(40) NOT NULL,
  external_id varchar(128) NOT NULL,
  start_at_utc timestamptz NOT NULL,
  end_at_utc timestamptz NOT NULL,
  timezone varchar(64) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  validation_errors jsonb NULL,
  resource_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_external_events_unique_idx
  ON public.scheduling_external_calendar_events (tenant_id, professional_id, external_id);

-- Row Level Security
ALTER TABLE public.scheduling_booking_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_recurrence_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_recurrence_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_clinic_invitation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_external_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduling_booking_holds_select ON public.scheduling_booking_holds
  FOR SELECT USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
CREATE POLICY scheduling_booking_holds_modify ON public.scheduling_booking_holds
  FOR ALL USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  ) WITH CHECK (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );

CREATE POLICY scheduling_bookings_select ON public.scheduling_bookings
  FOR SELECT USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
CREATE POLICY scheduling_bookings_modify ON public.scheduling_bookings
  FOR ALL USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  ) WITH CHECK (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );

CREATE POLICY scheduling_recurrence_series_select ON public.scheduling_recurrence_series
  FOR SELECT USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
CREATE POLICY scheduling_recurrence_series_modify ON public.scheduling_recurrence_series
  FOR ALL USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  ) WITH CHECK (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );

CREATE POLICY scheduling_recurrence_occurrences_select ON public.scheduling_recurrence_occurrences
  FOR SELECT USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
CREATE POLICY scheduling_recurrence_occurrences_modify ON public.scheduling_recurrence_occurrences
  FOR ALL USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  ) WITH CHECK (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );

CREATE POLICY scheduling_invitation_policies_select ON public.scheduling_clinic_invitation_policies
  FOR SELECT USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
CREATE POLICY scheduling_invitation_policies_modify ON public.scheduling_clinic_invitation_policies
  FOR ALL USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  ) WITH CHECK (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );

CREATE POLICY scheduling_external_events_select ON public.scheduling_external_calendar_events
  FOR SELECT USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
CREATE POLICY scheduling_external_events_modify ON public.scheduling_external_calendar_events
  FOR ALL USING (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  ) WITH CHECK (
    public.is_service_role() OR (
      public.request_tenant_id() IS NOT NULL AND tenant_id = public.request_tenant_id()
    )
  );
