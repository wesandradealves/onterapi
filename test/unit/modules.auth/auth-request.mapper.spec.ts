import {
  extractAccessToken,
  normalizeDeviceInfo,
  RequestFingerprint,
  toConfirmPasswordResetInput,
  toRefreshTokenInput,
  toRequestPasswordResetInput,
  toResendVerificationEmailInput,
  toSendTwoFAInput,
  toSignInInput,
  toSignOutInput,
  toValidateTwoFAInput,
} from '@modules/auth/api/mappers/auth-request.mapper';
import { SignInInputDTO } from '@modules/auth/api/schemas/sign-in.schema';
import { RefreshTokenInputDTO } from '@modules/auth/api/schemas/refresh.schema';
import { SendTwoFAInputDTO, ValidateTwoFAInputDTO } from '@modules/auth/api/schemas/two-fa.schema';
import { SignOutSchemaType } from '@modules/auth/api/schemas/sign-out.schema';

describe('auth-request.mapper', () => {
  it('normaliza device info mesclando fallback e payload', () => {
    const result = normalizeDeviceInfo(
      { device: 'Chrome', userAgent: 'UserAgent   ' },
      { userAgent: 'HeaderAgent', ip: ' 192.168.0.1 ' },
    );

    expect(result).toEqual({
      device: 'Chrome',
      userAgent: 'UserAgent',
      ip: '192.168.0.1',
    });
  });

  it('retorna objeto vazio quando nao ha dados', () => {
    expect(normalizeDeviceInfo()).toEqual({});
  });

  it('monta input de sign-in usando header como fallback', () => {
    const dto: SignInInputDTO = {
      email: 'user@example.com',
      password: 'secret',
      rememberMe: true,
    };

    const fingerprint: RequestFingerprint = {
      userAgentHeader: 'Mozilla/5.0',
      ip: '10.0.0.1',
    };

    const input = toSignInInput(dto, fingerprint);

    expect(input).toEqual({
      email: dto.email,
      password: dto.password,
      rememberMe: dto.rememberMe,
      deviceInfo: { userAgent: 'Mozilla/5.0', ip: '10.0.0.1' },
    });
  });

  it('monta input de refresh com ip fallback mesmo sem deviceInfo original', () => {
    const dto: RefreshTokenInputDTO = {
      refreshToken: 'ref-123',
    };

    const input = toRefreshTokenInput(dto, { ip: ' 172.16.0.5 ' });

    expect(input).toEqual({
      refreshToken: 'ref-123',
      deviceInfo: { ip: '172.16.0.5' },
    });
  });

  it('extrai access token ignorando prefixo bearer', () => {
    expect(extractAccessToken('Bearer   abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractAccessToken('bearer token-value')).toBe('token-value');
    expect(extractAccessToken(undefined)).toBe('');
  });

  it('monta input de sign-out consolidando usuario e authorization', () => {
    const dto = { refreshToken: 'ref', allDevices: true } as SignOutSchemaType;
    const input = toSignOutInput('user-1', dto, 'Bearer token-x');

    expect(input).toEqual({
      userId: 'user-1',
      accessToken: 'token-x',
      refreshToken: 'ref',
      allDevices: true,
    });
  });

  it('aplica fallback two-factor-client quando user agent nao informado', () => {
    const dto: ValidateTwoFAInputDTO = {
      tempToken: 'temp',
      code: '123456',
      trustDevice: false,
    };

    const input = toValidateTwoFAInput(dto, { ip: ' 200.1.1.10 ' });

    expect(input).toEqual({
      userId: '',
      tempToken: 'temp',
      code: '123456',
      trustDevice: false,
      deviceInfo: { userAgent: 'two-factor-client', ip: '200.1.1.10' },
    });
  });

  it('preserva device info informado no payload ao validar 2FA', () => {
    const dto: ValidateTwoFAInputDTO = {
      tempToken: 'temp',
      code: '123456',
      trustDevice: true,
      deviceInfo: { userAgent: 'App', device: 'iPhone' },
    };

    const input = toValidateTwoFAInput(dto, {
      userAgentHeader: ['HeaderAgent'],
    });

    expect(input.deviceInfo).toEqual({ userAgent: 'App', device: 'iPhone' });
  });

  it('normaliza dados ao enviar 2FA garantindo method padrao', () => {
    const dto = { tempToken: 'temp' } as SendTwoFAInputDTO;
    expect(toSendTwoFAInput(dto)).toEqual({
      userId: '',
      tempToken: 'temp',
      method: 'email',
    });
  });

  it('descarta header array vazio ao montar payload de sign-in', () => {
    const dto: SignInInputDTO = {
      email: 'user@example.com',
      password: 'secret',
      rememberMe: false,
    };

    const input = toSignInInput(dto, { userAgentHeader: [] });

    expect(input.deviceInfo).toEqual({});
  });

  it('limpa valores vazios durante a normalizacao de device info', () => {
    const normalized = normalizeDeviceInfo({ userAgent: '   ' }, { ip: ' \t ' });
    expect(normalized).toEqual({});
  });

  it('monta input de reenvio de verificacao usando cabecalho', () => {
    const input = toResendVerificationEmailInput({ email: 'user@example.com' } as any, {
      ip: ' 10.0.0.1 ',
      userAgentHeader: ' Mozilla ',
    });

    expect(input).toEqual({
      email: 'user@example.com',
      requesterIp: '10.0.0.1',
      userAgent: 'Mozilla',
    });
  });

  it('monta input de solicitacao de reset com sanitizacao', () => {
    const input = toRequestPasswordResetInput({ email: 'reset@example.com' } as any, {
      ip: ' 172.16.0.5 ',
      userAgentHeader: ['CustomAgent'],
    });

    expect(input).toEqual({
      email: 'reset@example.com',
      requesterIp: '172.16.0.5',
      userAgent: 'CustomAgent',
    });
  });

  it('monta input de confirmacao de reset com dados basicos', () => {
    const dto = {
      accessToken: 'access-token',
      newPassword: 'NovaSenha123!',
    } as any;

    expect(toConfirmPasswordResetInput(dto)).toEqual({
      accessToken: 'access-token',
      newPassword: 'NovaSenha123!',
      refreshToken: undefined,
    });
  });
});
