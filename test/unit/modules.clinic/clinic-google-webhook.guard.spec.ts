import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClinicGoogleWebhookGuard } from '../../../src/modules/clinic/guards/clinic-google-webhook.guard';

type Mocked<T> = jest.Mocked<T>;

describe('ClinicGoogleWebhookGuard', () => {
  let configService: Mocked<ConfigService>;
  let guard: ClinicGoogleWebhookGuard;

  const buildExecutionContext = (headers: Record<string, string | string[] | undefined>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as any;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as Mocked<ConfigService>;

    guard = new ClinicGoogleWebhookGuard(configService);
  });

  it('permite webhook quando o token corresponde exatamente', () => {
    configService.get.mockReturnValue('secret-token');

    const context = buildExecutionContext({
      'x-goog-channel-token': 'secret-token',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('aceita header Authorization com esquema Bearer', () => {
    configService.get.mockReturnValue('secret-token');

    const context = buildExecutionContext({
      authorization: 'Bearer secret-token  ',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lança Unauthorized quando token é inválido', () => {
    configService.get.mockReturnValue('secret-token');

    const context = buildExecutionContext({
      'x-webhook-token': 'invalid',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('lança Unauthorized quando variavel de ambiente não está configurada', () => {
    configService.get.mockReturnValue(undefined);

    const context = buildExecutionContext({
      'x-goog-channel-token': 'whatever',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
