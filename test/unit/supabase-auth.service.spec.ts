import { ConfigService } from '@nestjs/config';
import { SupabaseAuthService } from '@infrastructure/auth/services/supabase-auth.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {},
      signInWithPassword: jest.fn(),
    },
  })),
}));

describe('SupabaseAuthService mapUserRecord', () => {
  const config = {
    get: (key: string) => {
      if (key === 'SUPABASE_URL') {
        return 'https://example.supabase.co';
      }
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        return 'service-role-key';
      }
      return undefined;
    },
  } as ConfigService;

  it('normaliza usuario usando payload aninhado quando disponivel', () => {
    const service = new SupabaseAuthService(config);
    const record = {
      id: 'outer-id',
      email: 'outer@example.com',
      email_confirmed_at: '2025-09-01T10:00:00.000Z',
      created_at: '2025-09-01T10:00:00.000Z',
      user_metadata: null,
      metadata: null,
      user: {
        id: 'nested-id',
        email: 'nested@example.com',
        email_confirmed_at: null,
        created_at: '2025-09-02T12:00:00.000Z',
        updated_at: '2025-09-03T12:00:00.000Z',
        user_metadata: { role: 'PROFESSIONAL', tenantId: 'tenant-123' },
        metadata: null,
      },
    } as any;

    const mapped = (service as any).mapUserRecord(record);

    expect(mapped).toEqual(
      expect.objectContaining({
        id: 'nested-id',
        email: 'nested@example.com',
        emailVerified: false,
        metadata: expect.objectContaining({ role: 'PROFESSIONAL', tenantId: 'tenant-123' }),
      }),
    );
    expect(mapped.createdAt).toBeInstanceOf(Date);
    expect(mapped.updatedAt).toBeInstanceOf(Date);
  });

  it('mantem payload plano quando nao ha usuario aninhado', () => {
    const service = new SupabaseAuthService(config);
    const record = {
      id: 'outer-id',
      email: 'outer@example.com',
      email_confirmed_at: '2025-09-01T10:00:00.000Z',
      created_at: '2025-09-01T10:00:00.000Z',
      updated_at: '2025-09-01T10:10:00.000Z',
      user_metadata: { role: 'SUPER_ADMIN' },
    } as any;

    const mapped = (service as any).mapUserRecord(record);

    expect(mapped).toEqual(
      expect.objectContaining({
        id: 'outer-id',
        email: 'outer@example.com',
        emailVerified: true,
        metadata: expect.objectContaining({ role: 'SUPER_ADMIN' }),
      }),
    );
    expect(mapped.createdAt.toISOString()).toBe('2025-09-01T10:00:00.000Z');
    expect(mapped.updatedAt.toISOString()).toBe('2025-09-01T10:10:00.000Z');
  });
});
