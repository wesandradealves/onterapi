export interface SupabaseUserFixture {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string | null;
  last_sign_in_at?: string | null;
  user?: SupabaseUserFixture | null;
}

export const createSupabaseUserFixture = (
  overrides: SupabaseUserFixture = {},
): Required<SupabaseUserFixture> => {
  const now = new Date().toISOString();

  return {
    id: 'user-fixture-id',
    email: 'user.fixture@example.com',
    email_confirmed_at: now,
    user_metadata: {
      name: 'User Fixture',
      role: 'SUPER_ADMIN',
      tenantId: 'tenant-fixture-id',
      ...(overrides.user_metadata ?? {}),
    },
    metadata: overrides.metadata ?? null,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    last_sign_in_at: overrides.last_sign_in_at ?? now,
    user: overrides.user ?? null,
  };
};
