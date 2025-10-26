import { ConfigService } from '@nestjs/config';

import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import { ClinicErrorFactory } from '../../../src/shared/factories/clinic-error.factory';

const secretKey = 'unit-test-secret';

describe('ClinicInvitationTokenService', () => {
  let service: ClinicInvitationTokenService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'CLINIC_INVITATION_TOKEN_SECRET':
            return secretKey;
          case 'CLINIC_INVITATION_TOKEN_MAX_ATTEMPTS':
            return 3;
          case 'CLINIC_INVITATION_TOKEN_WINDOW_MS':
            return 600_000;
          case 'CLINIC_INVITATION_TOKEN_BLOCK_MS':
            return 1_800_000;
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    service = new ClinicInvitationTokenService(configService);
  });

  it('should generate token with deterministic hash and verify payload', () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const result = service.generateToken({
      invitationId: 'inv-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      expiresAt,
    });

    expect(result.token).toBeDefined();
    expect(result.hash).toBe(service.hash(result.token));

    const decoded = service.verifyToken(result.token);
    expect(decoded.invitationId).toBe('inv-1');
    expect(decoded.clinicId).toBe('clinic-1');
    expect(decoded.tenantId).toBe('tenant-1');
    expect(decoded.hash).toBe(result.hash);
  });

  it('should reject expired tokens', () => {
    const expiredToken = service.generateToken({
      invitationId: 'inv-2',
      clinicId: 'clinic-2',
      tenantId: 'tenant-2',
      expiresAt: new Date(Date.now() - 60_000),
    });

    expect(() => service.verifyToken(expiredToken.token)).toThrow(
      ClinicErrorFactory.invitationExpired('Token de convite expirado').constructor,
    );
  });

  it('should reject tokens with invalid signature', () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const { token } = service.generateToken({
      invitationId: 'inv-3',
      clinicId: 'clinic-3',
      tenantId: 'tenant-3',
      expiresAt,
    });

    const tampered = `${token.split('.')[0]}.invalidsignature`;

    expect(() => service.verifyToken(tampered)).toThrow(
      ClinicErrorFactory.invitationInvalidToken('Assinatura do token de convite invalida')
        .constructor,
    );
  });

  it('should refuse operations when token secret is missing', () => {
    const insecureConfig = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    const insecureService = new ClinicInvitationTokenService(insecureConfig);

    expect(() =>
      insecureService.generateToken({
        invitationId: 'inv-insecure',
        clinicId: 'clinic-sec',
        tenantId: 'tenant-sec',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).toThrow(
      ClinicErrorFactory.invitationTokenSecretMissing(
        'Segredo do token de convite nao configurado. Operacao bloqueada.',
      ).constructor,
    );
  });

  it('should enforce rate limiting when verifying token repeatedly', () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const { token } = service.generateToken({
      invitationId: 'inv-rl',
      clinicId: 'clinic-rl',
      tenantId: 'tenant-rl',
      expiresAt,
    });

    expect(() => service.verifyToken(token)).not.toThrow();
    expect(() => service.verifyToken(token)).not.toThrow();
    expect(() => service.verifyToken(token)).not.toThrow();
    expect(() => service.verifyToken(token)).toThrow(
      ClinicErrorFactory.invitationTokenRateLimited(
        'Numero de tentativas excedido para o token informado. Aguarde para tentar novamente.',
      ).constructor,
    );
  });
});
