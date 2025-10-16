import { ClinicPresenter } from '../../../src/modules/clinic/api/presenters/clinic.presenter';
import { ClinicConfigurationVersion } from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicPresenter configuration settings mapping', () => {
  const versionBase: ClinicConfigurationVersion = {
    id: 'version-id',
    clinicId: 'clinic-id',
    section: 'general',
    version: 3,
    payload: {},
    createdBy: 'user-id',
    createdAt: new Date('2025-10-10T10:00:00Z'),
    appliedAt: new Date('2025-10-11T10:00:00Z'),
    notes: 'note',
    autoApply: true,
  };

  it('maps telemetry metadata when present', () => {
    const telemetryVersion: ClinicConfigurationVersion = {
      ...versionBase,
      telemetry: {
        section: 'general',
        state: 'saved',
        completionScore: 85,
        lastAttemptAt: new Date('2025-10-11T09:59:00Z'),
        lastSavedAt: new Date('2025-10-11T10:00:00Z'),
        lastErrorAt: undefined,
        lastErrorMessage: undefined,
        lastUpdatedBy: 'user-2',
        autosaveIntervalSeconds: 120,
        pendingConflicts: 0,
      },
    };

    const dto = ClinicPresenter.configuration(telemetryVersion);

    expect(dto.telemetry).toEqual({
      state: 'saved',
      completionScore: 85,
      lastAttemptAt: telemetryVersion.telemetry?.lastAttemptAt,
      lastSavedAt: telemetryVersion.telemetry?.lastSavedAt,
      lastErrorAt: undefined,
      lastErrorMessage: undefined,
      lastUpdatedBy: 'user-2',
      autosaveIntervalSeconds: 120,
      pendingConflicts: 0,
    });
  });

  it('maps schedule settings payload with intervals, exceptions and holidays', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'schedule',
      payload: {
        scheduleSettings: {
          timezone: 'America/Sao_Paulo',
          workingDays: [
            {
              dayOfWeek: 1,
              active: true,
              intervals: [
                { start: '09:00', end: '12:00' },
                { start: '13:00', end: '18:00' },
              ],
            },
          ],
          exceptionPeriods: [
            {
              id: 'exc-1',
              name: 'Maintenance',
              appliesTo: 'clinic',
              start: '2025-12-01T12:00:00Z',
              end: '2025-12-01T18:00:00Z',
              resourceIds: ['room-1', 'room-2'],
            },
          ],
          holidays: [
            {
              id: 'holiday-1',
              name: 'Ano Novo',
              date: '2026-01-01',
              scope: 'national',
            },
          ],
          autosaveIntervalSeconds: 120,
          conflictResolution: 'merge',
        },
      },
    };

    const dto = ClinicPresenter.scheduleSettings(version);

    expect(dto.payload.timezone).toBe('America/Sao_Paulo');
    expect(dto.payload.workingDays).toHaveLength(1);
    expect(dto.payload.exceptionPeriods[0]).toMatchObject({
      id: 'exc-1',
      name: 'Maintenance',
      appliesTo: 'clinic',
    });
    expect(dto.payload.exceptionPeriods[0].resourceIds).toEqual(['room-1', 'room-2']);
    expect(dto.payload.holidays[0]).toMatchObject({
      id: 'holiday-1',
      scope: 'national',
    });
    expect(dto.state).toBe('saved');
    expect(dto.autoApply).toBe(true);
    expect(dto.telemetry).toBeUndefined();
  });

  it('maps service settings payload with eligibility and cancellation policy', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'services',
      payload: {
        services: [
          {
            id: 'svc-1',
            name: 'Psicoterapia Individual',
            slug: 'psicoterapia-individual',
            durationMinutes: 50,
            price: 250,
            currency: 'BRL',
            isActive: true,
            requiresAnamnesis: true,
            enableOnlineScheduling: true,
            minAdvanceMinutes: 60,
            maxAdvanceMinutes: 1440,
            cancellationPolicy: {
              type: 'percentage',
              windowMinutes: 120,
              percentage: 50,
            },
            eligibility: {
              allowNewPatients: true,
              allowExistingPatients: true,
              minimumAge: 18,
              maximumAge: 65,
              allowedTags: ['adult'],
            },
            instructions: 'Chegar 10 minutos antes.',
            requiredDocuments: ['RG'],
          },
        ],
      },
    };

    const dto = ClinicPresenter.serviceSettings(version);

    expect(dto.services[0]).toMatchObject({
      serviceTypeId: 'svc-1',
      name: 'Psicoterapia Individual',
      cancellationPolicyType: 'percentage',
      cancellationPolicyWindowMinutes: 120,
      cancellationPolicyPercentage: 50,
      minimumAge: 18,
      maximumAge: 65,
      allowedTags: ['adult'],
    });
    expect(dto.services[0].instructions).toBe('Chegar 10 minutos antes.');
    expect(dto.services[0].requiredDocuments).toEqual(['RG']);
    expect(dto.telemetry).toBeUndefined();
  });

  it('maps payment settings payload, including split rules and policies', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'payments',
      payload: {
        paymentSettings: {
          provider: 'asaas',
          credentialsId: 'cred-1',
          sandboxMode: false,
          roundingStrategy: 'half_even',
          splitRules: [
            { recipient: 'taxes', percentage: 5, order: 1 },
            { recipient: 'clinic', percentage: 45, order: 3 },
          ],
          antifraud: {
            enabled: true,
            provider: 'clearsale',
            thresholdAmount: 500,
          },
          inadimplencyRule: {
            gracePeriodDays: 5,
            penaltyPercentage: 2,
            dailyInterestPercentage: 0.3,
            maxRetries: 3,
            actions: ['notify', 'suspend'],
          },
          refundPolicy: {
            type: 'manual',
            processingTimeHours: 48,
            feePercentage: 10,
            allowPartialRefund: true,
          },
          cancellationPolicies: [
            {
              type: 'percentage',
              windowMinutes: 180,
              percentage: 100,
              message: 'Cancelamento sem custo em ate 3h',
            },
          ],
          bankAccountId: 'bank-1',
        },
      },
    };

    const dto = ClinicPresenter.paymentSettings(version);

    expect(dto.payload.provider).toBe('asaas');
    expect(dto.payload.splitRules).toHaveLength(2);
    expect(dto.payload.inadimplencyRule.penaltyPercentage).toBe(2);
    expect(dto.payload.refundPolicy.allowPartialRefund).toBe(true);
    expect(dto.payload.cancellationPolicies[0].message).toContain('Cancelamento');
    expect(dto.telemetry).toBeUndefined();
  });

  it('maps integration settings payload including whatsApp templates and webhooks', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'integrations',
      payload: {
        integrationSettings: {
          whatsapp: {
            enabled: true,
            provider: 'evolution',
            businessNumber: '+5511999999999',
            instanceStatus: 'active',
            qrCodeUrl: 'https://qr',
            templates: [
              {
                name: 'consulta_confirmada',
                status: 'approved',
                category: 'TRANSACTIONAL',
                lastUpdatedAt: '2025-10-11T00:00:00Z',
              },
            ],
            quietHours: { start: '21:00', end: '08:00', timezone: 'America/Sao_Paulo' },
            webhookUrl: 'https://webhook.whatsapp',
          },
          googleCalendar: {
            enabled: true,
            syncMode: 'two_way',
            conflictPolicy: 'onterapi_wins',
            requireValidationForExternalEvents: true,
            defaultCalendarId: 'cal-1',
            hidePatientName: true,
            prefix: '[On] ',
          },
          email: {
            enabled: true,
            provider: 'sendgrid',
            fromName: 'Clinica On',
            fromEmail: 'contato@on.com',
            replyTo: 'suporte@on.com',
            tracking: {
              open: true,
              click: true,
              bounce: false,
            },
            templates: ['booking_confirmation'],
          },
          webhooks: [{ event: 'booking.created', url: 'https://hook/booking', active: true }],
          metadata: {
            integrationKey: 'abc',
          },
        },
      },
    };

    const dto = ClinicPresenter.integrationSettings(version);

    expect(dto.payload.whatsapp.templates[0]).toMatchObject({
      name: 'consulta_confirmada',
      status: 'approved',
      category: 'TRANSACTIONAL',
    });
    expect(dto.payload.webhooks).toHaveLength(1);
    expect(dto.payload.googleCalendar.hidePatientName).toBe(true);
    expect(dto.payload.metadata).toEqual({ integrationKey: 'abc' });
    expect(dto.telemetry).toBeUndefined();
  });

  it('maps notification settings payload including templates and rules', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'notifications',
      payload: {
        notificationSettings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              defaultEnabled: true,
              quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' },
            },
          ],
          templates: [
            {
              id: 'tmpl-1',
              event: 'booking.confirmed',
              channel: 'email',
              version: 'v1',
              active: true,
              language: 'pt-BR',
              abGroup: 'A',
              variables: [{ name: 'patient_name', required: true }],
            },
          ],
          rules: [
            {
              event: 'booking.confirmed',
              channels: ['email', 'whatsapp'],
              enabled: true,
            },
          ],
          quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' },
          events: ['booking.confirmed'],
          metadata: { source: 'default' },
        },
      },
    };

    const dto = ClinicPresenter.notificationSettings(version);

    expect(dto.payload.channels[0].quietHours?.timezone).toBe('UTC');
    expect(dto.payload.templates[0].variables[0]).toEqual({ name: 'patient_name', required: true });
    expect(dto.payload.rules[0].channels).toEqual(['email', 'whatsapp']);
    expect(dto.payload.events).toEqual(['booking.confirmed']);
    expect(dto.telemetry).toBeUndefined();
  });

  it('maps branding settings payload with palette, typography and preview', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'branding',
      payload: {
        brandingSettings: {
          logoUrl: 'https://cdn/logo.png',
          darkLogoUrl: 'https://cdn/logo-dark.png',
          palette: {
            primary: '#123456',
            secondary: '#abcdef',
            background: '#ffffff',
          },
          typography: {
            primaryFont: 'Inter',
            secondaryFont: 'Roboto',
            headingWeight: 600,
            bodyWeight: 400,
          },
          customCss: '.btn { border-radius: 8px; }',
          applyMode: 'preview',
          preview: {
            mode: 'preview',
            generatedAt: '2025-10-11T15:00:00Z',
            previewUrl: 'https://cdn/preview.png',
          },
          versionLabel: '1.0.0',
          metadata: { theme: 'default' },
        },
      },
    };

    const dto = ClinicPresenter.brandingSettings(version);

    expect(dto.payload.logoUrl).toBe('https://cdn/logo.png');
    expect(dto.payload.palette?.primary).toBe('#123456');
    expect(dto.payload.typography?.secondaryFont).toBe('Roboto');
    expect(dto.payload.preview?.previewUrl).toBe('https://cdn/preview.png');
    expect(dto.payload.metadata).toEqual({ theme: 'default' });
    expect(dto.telemetry).toBeUndefined();
  });
});
