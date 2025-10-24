type GoogleSettingsPayload = Record<string, unknown> | undefined | null;

export type ClinicGoogleIntegrationSettings = {
  enabled: boolean;
  syncMode: 'one_way' | 'two_way';
  conflictPolicy: 'onterapi_wins' | 'google_wins' | 'ask_user';
  requireValidationForExternalEvents: boolean;
  defaultCalendarId?: string;
  hidePatientName?: boolean;
  prefix?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const extractGoogleIntegrationSettings = (
  rawPayload: unknown,
): ClinicGoogleIntegrationSettings | null => {
  if (!rawPayload || !isRecord(rawPayload)) {
    return null;
  }

  const integrationSettings = resolveIntegrationSettings(rawPayload);
  if (!integrationSettings) {
    return null;
  }

  const googleSection = integrationSettings.googleCalendar;
  if (!googleSection || !isRecord(googleSection)) {
    return null;
  }

  return {
    enabled: googleSection.enabled === true,
    syncMode:
      googleSection.syncMode === 'two_way'
        ? 'two_way'
        : googleSection.syncMode === 'one_way'
          ? 'one_way'
          : 'one_way',
    conflictPolicy:
      googleSection.conflictPolicy === 'google_wins'
        ? 'google_wins'
        : googleSection.conflictPolicy === 'ask_user'
          ? 'ask_user'
          : 'onterapi_wins',
    requireValidationForExternalEvents: googleSection.requireValidationForExternalEvents !== false,
    defaultCalendarId:
      typeof googleSection.defaultCalendarId === 'string'
        ? googleSection.defaultCalendarId
        : undefined,
    hidePatientName: googleSection.hidePatientName === true,
    prefix: typeof googleSection.prefix === 'string' ? googleSection.prefix : undefined,
  };
};

const resolveIntegrationSettings = (
  payload: GoogleSettingsPayload,
): Record<string, unknown> | null => {
  if (!payload) {
    return null;
  }

  if ('integrationSettings' in payload && isRecord(payload.integrationSettings)) {
    return payload.integrationSettings;
  }

  return isRecord(payload) ? payload : null;
};
