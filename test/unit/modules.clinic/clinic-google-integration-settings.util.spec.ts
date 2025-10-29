import { extractGoogleIntegrationSettings } from '../../../src/modules/clinic/services/clinic-google-integration-settings.util';

describe('clinic-google-integration-settings.util', () => {
  it('retorna null quando payload inválido', () => {
    expect(extractGoogleIntegrationSettings(null)).toBeNull();
    expect(extractGoogleIntegrationSettings(undefined)).toBeNull();
    expect(
      extractGoogleIntegrationSettings('invalid' as unknown as Record<string, unknown>),
    ).toBeNull();
  });

  it('lê configurações diretamente no payload', () => {
    const result = extractGoogleIntegrationSettings({
      googleCalendar: {
        enabled: true,
        syncMode: 'two_way',
        conflictPolicy: 'ask_user',
        requireValidationForExternalEvents: false,
        defaultCalendarId: 'calendar-123',
        hidePatientName: true,
        prefix: 'Dr.',
      },
    });

    expect(result).toMatchObject({
      enabled: true,
      syncMode: 'two_way',
      conflictPolicy: 'ask_user',
      requireValidationForExternalEvents: false,
      defaultCalendarId: 'calendar-123',
      hidePatientName: true,
      prefix: 'Dr.',
    });
  });

  it('lê configurações aninhadas dentro de integrationSettings.googleCalendar', () => {
    const result = extractGoogleIntegrationSettings({
      integrationSettings: {
        googleCalendar: {
          enabled: false,
          syncMode: 'one_way',
        },
      },
    });

    expect(result).toMatchObject({
      enabled: false,
      syncMode: 'one_way',
      conflictPolicy: 'onterapi_wins',
      requireValidationForExternalEvents: true,
    });
  });
});
