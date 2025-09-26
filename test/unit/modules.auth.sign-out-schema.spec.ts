import { ZodError } from 'zod';
import { signOutSchema } from '@modules/auth/api/schemas/sign-out.schema';

describe('signOutSchema', () => {
  it('returns default object when payload is undefined', () => {
    expect(signOutSchema.parse(undefined)).toEqual({});
  });

  it('accepts refreshToken and allDevices', () => {
    const result = signOutSchema.parse({
      refreshToken: ' token ',
      allDevices: true,
    });

    expect(result).toEqual({ refreshToken: 'token', allDevices: true });
  });

  it('rejects empty refreshToken', () => {
    expect(() => signOutSchema.parse({ refreshToken: '' })).toThrow(ZodError);
  });
});
