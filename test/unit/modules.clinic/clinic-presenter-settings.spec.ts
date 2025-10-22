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

describe('ClinicPresenter general settings payload', () => {
  const versionBase: ClinicConfigurationVersion = {
    id: 'general-version',
    clinicId: 'clinic-id',
    section: 'general',
    version: 1,
    payload: {},
    createdBy: 'user-id',
    createdAt: new Date('2025-10-10T10:00:00Z'),
    autoApply: false,
  };

  it('normalizes address, contact and document fields', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      payload: {
        generalSettings: {
          tradeName: 'Clinica Vida',
          legalName: 'Clinica Vida LTDA',
          foundationDate: '2025-10-10T00:00:00Z',
          document: { type: 'cnpj', value: 12345678900013 },
          address: {
            zipCode: 12345678,
            street: 'Rua Um',
            number: 100,
            complement: 'Conjunto 101',
            district: 'Centro',
            city: 'Sao Paulo',
            state: 'SP',
            country: 'BR',
          },
          contact: {
            phone: 1199999999,
            whatsapp: 1198888888,
            email: 'contato@clinica.com',
            website: 'https://clinica.com',
            socialLinks: ['https://instagram.com/clinica'],
          },
          notes: 'Atendimento 24h',
        },
      },
    };

    const dto = ClinicPresenter.generalSettings(version);

    expect(dto.payload.tradeName).toBe('Clinica Vida');
    expect(dto.payload.document?.value).toBe('12345678900013');
    expect(dto.payload.address.country).toBe('BR');
    expect(dto.payload.contact?.phone).toBe('1199999999');
    expect(dto.payload.foundationDate).toBe('2025-10-10T00:00:00.000Z');
  });
});

describe('ClinicPresenter configuration mapping edge cases', () => {
  const versionBase: ClinicConfigurationVersion = {
    id: 'version-id',
    clinicId: 'clinic-id',
    section: 'general',
    version: 1,
    payload: {},
    createdBy: 'user-id',
    createdAt: new Date('2025-10-10T10:00:00Z'),
    autoApply: false,
  };

  it('general settings keep raw value when foundation date is invalid', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      payload: {
        generalSettings: {
          tradeName: 'Clinica Alvo',
          foundationDate: 'invalid-date',
          address: { zipCode: 123, city: 'Sao Paulo' },
          contact: { socialLinks: [123, 'https://link'] },
        },
      },
    };

    const dto = ClinicPresenter.generalSettings(version);

    expect(dto.payload.foundationDate).toBe('invalid-date');
    expect(dto.payload.address.zipCode).toBe('123');
    expect(dto.payload.contact.socialLinks).toEqual(['123', 'https://link']);
  });

  it('team settings remove malformed quotas and metadata', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'team',
      payload: {
        teamSettings: {
          quotas: [
            { role: 'OWNER', limit: '3' },
            { role: undefined, limit: 'abc' },
          ],
          allowExternalInvitations: 'true',
          metadata: {},
        },
      },
    };

    const dto = ClinicPresenter.teamSettings(version);

    expect(dto.payload.quotas).toEqual([{ role: 'OWNER', limit: 3 }]);
    expect(dto.payload.metadata).toBeUndefined();
  });

  it('schedule settings ignore invalid intervals, exceptions and holidays', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'schedule',
      payload: {
        scheduleSettings: {
          timezone: 'UTC',
          workingDays: [
            { dayOfWeek: '1', active: true, intervals: [{ start: '09:00', end: '10:00' }] },
            { dayOfWeek: 'invalid', active: true, intervals: [] },
            { dayOfWeek: 3, active: true, intervals: [{ start: '08:00' }] },
          ],
          exceptionPeriods: [
            {
              id: 'exc-1',
              name: 'Maintenance',
              appliesTo: 'clinic',
              start: '2025-10-10T10:00:00Z',
              end: '2025-10-10T12:00:00Z',
            },
            { id: 'exc-invalid' },
          ],
          holidays: [
            { id: 'holiday-1', name: 'Holiday', date: '2025-12-25', scope: 'national' },
            { id: 'holiday-invalid', name: 'Invalid' },
          ],
        },
      },
    };

    const dto = ClinicPresenter.scheduleSettings(version);

    expect(dto.payload.workingDays.map((day) => day.dayOfWeek)).toEqual([1, 3]);
    expect(dto.payload.exceptionPeriods).toHaveLength(1);
    expect(dto.payload.holidays).toHaveLength(1);
  });

  it('service settings skip entries without identifiers', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'services',
      payload: {
        services: [
          { name: 'Invalid service' },
          {
            id: 'svc-1',
            name: 'Valido',
            durationMinutes: '45',
            price: '150',
            currency: 'BRL',
            isActive: 'true',
            requiresAnamnesis: 'false',
            enableOnlineScheduling: 'true',
            minAdvanceMinutes: '30',
            cancellationPolicy: {},
            eligibility: {},
            requiredDocuments: [987],
          },
        ],
      },
    };

    const dto = ClinicPresenter.serviceSettings(version);

    expect(dto.services).toHaveLength(1);
    expect(dto.services[0].serviceTypeId).toBe('svc-1');
    expect(dto.services[0].requiredDocuments).toEqual(['987']);
  });

  it('payment settings drop invalid split rules and cancellation policies', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'payments',
      payload: {
        paymentSettings: {
          provider: 'asaas',
          credentialsId: 'cred',
          splitRules: [
            { recipient: 'clinic', percentage: 70, order: 1 },
            { recipient: 'invalid', percentage: 'abc' },
          ],
          cancellationPolicies: [{ type: 'percentage', percentage: 50 }, { windowMinutes: 30 }],
          refundPolicy: {},
          inadimplencyRule: {},
          antifraud: {},
        },
      },
    };

    const dto = ClinicPresenter.paymentSettings(version);

    expect(dto.payload.splitRules).toHaveLength(1);
    expect(dto.payload.cancellationPolicies).toHaveLength(1);
  });

  it('integration settings ignore invalid templates and webhooks', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'integrations',
      payload: {
        integrationSettings: {
          whatsapp: {
            templates: [
              { name: 'ok', status: 'approved', lastUpdatedAt: '2025-10-11T10:00:00Z' },
              { name: 'invalid' },
            ],
          },
          webhooks: [{ event: 'clinic.updated', url: 'https://hook' }, { event: 'invalid' }],
        },
      },
    };

    const dto = ClinicPresenter.integrationSettings(version);

    expect(dto.payload.whatsapp.templates).toHaveLength(1);
    expect(dto.payload.webhooks).toHaveLength(1);
  });

  it('notification settings remove incomplete channels, templates and rules', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'notifications',
      payload: {
        notificationSettings: {
          channels: [{ type: 'email', enabled: true }, { enabled: true }],
          templates: [
            {
              id: 'tmpl-1',
              event: 'booking.created',
              channel: 'email',
              version: 'v1',
              active: true,
              variables: [],
            },
            { event: 'invalid' },
          ],
          rules: [
            { event: 'booking.created', channels: ['email'] },
            { event: 'invalid', channels: [] },
          ],
        },
      },
    };

    const dto = ClinicPresenter.notificationSettings(version);

    expect(dto.payload.channels).toHaveLength(1);
    expect(dto.payload.templates).toHaveLength(1);
    expect(dto.payload.rules).toHaveLength(1);
  });

  it('branding settings omit empty palette and metadata', () => {
    const version: ClinicConfigurationVersion = {
      ...versionBase,
      section: 'branding',
      payload: {
        brandingSettings: {
          palette: {},
          typography: {},
          preview: { mode: 'draft', generatedAt: 'invalid' },
          metadata: {},
        },
      },
    };

    const dto = ClinicPresenter.brandingSettings(version);

    expect(dto.payload.palette).toBeUndefined();
    expect(dto.payload.typography).toBeUndefined();
    expect(dto.payload.preview?.generatedAt).toBeUndefined();
    expect(dto.payload.metadata).toBeUndefined();
  });

  it('resolveConfigurationState covers all branches', () => {
    const internals = ClinicPresenter as unknown as {
      resolveConfigurationState: (version: ClinicConfigurationVersion) => string;
    };

    expect(internals.resolveConfigurationState({ ...versionBase, appliedAt: new Date() })).toBe(
      'saved',
    );
    expect(
      internals.resolveConfigurationState({
        ...versionBase,
        appliedAt: undefined,
        autoApply: true,
      }),
    ).toBe('saving');
    expect(internals.resolveConfigurationState(versionBase)).toBe('idle');
  });

  it('toDate returns undefined for invalid values', () => {
    const internals = ClinicPresenter as unknown as {
      toDate: (value: unknown) => Date | undefined;
    };

    expect(internals.toDate('invalid')).toBeUndefined();
    const date = new Date('2025-10-12T10:00:00Z');
    expect(internals.toDate(date)).toEqual(date);
  });
});

describe('ClinicPresenter internal mappings', () => {
  const internals = ClinicPresenter as unknown as {
    mapGeneralSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.generalSettings>['payload'];
    mapTeamSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.teamSettings>['payload'];
    mapScheduleSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.scheduleSettings>['payload'];
    mapServiceSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.serviceSettings>;
    mapPaymentSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.paymentSettings>['payload'];
    mapIntegrationSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.integrationSettings>['payload'];
    mapNotificationSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.notificationSettings>['payload'];
    mapBrandingSettingsPayload: (
      raw: Record<string, unknown>,
    ) => ReturnType<typeof ClinicPresenter.brandingSettings>['payload'];
  };

  it('maps general settings through helper covering defaults', () => {
    const filled = internals.mapGeneralSettingsPayload({
      generalSettings: {
        tradeName: 'Clinica Horizonte',
        foundationDate: '2025-10-10T08:00:00Z',
        document: { type: 'cnpj', value: 11223344556677 },
        address: { zipCode: 12345678, city: 'Sao Paulo', state: 'SP', country: 'BR' },
        contact: { phone: 11999999999, socialLinks: ['https://exemplo.com'] },
      },
    });

    expect(filled.document?.value).toBe('11223344556677');
    expect(filled.address.country).toBe('BR');
    expect(filled.foundationDate).toBe('2025-10-10T08:00:00.000Z');

    const fallback = internals.mapGeneralSettingsPayload({});
    expect(fallback.tradeName).toBe('');
    expect(fallback.address.city).toBe('');
    expect(fallback.contact?.phone).toBeUndefined();
  });

  it('maps team settings removing invalid quotas and handling defaults', () => {
    const withData = internals.mapTeamSettingsPayload({
      teamSettings: {
        quotas: [{ role: 'OWNER', limit: '2' }, 'invalid', { limit: '1' }],
        allowExternalInvitations: true,
        defaultMemberStatus: 'active',
        requireFinancialClearance: true,
        metadata: { region: 'sul' },
      },
    });

    expect(withData.quotas).toEqual([{ role: 'OWNER', limit: 2 }]);
    expect(withData.defaultMemberStatus).toBe('active');
    expect(withData.metadata).toEqual({ region: 'sul' });

    const fallback = internals.mapTeamSettingsPayload({});
    expect(fallback.quotas).toEqual([]);
    expect(fallback.allowExternalInvitations).toBe(false);
    expect(fallback.requireFinancialClearance).toBe(false);
  });

  it('maps schedule settings filtering invalid entries', () => {
    const payload = internals.mapScheduleSettingsPayload({
      scheduleSettings: {
        workingDays: [
          { dayOfWeek: '1', active: true, intervals: [{ start: '08:00', end: '12:00' }, null] },
          { dayOfWeek: 'X', active: true },
          { dayOfWeek: 3, active: false, intervals: [{ start: '13:00' }, 'invalid'] },
          null,
        ],
        exceptionPeriods: [
          {
            id: 'exc-1',
            name: 'Manutencao',
            appliesTo: 'clinic',
            start: '2025-12-01',
            end: '2025-12-02',
            resourceIds: [1, 'room'],
          },
          { id: 'exc-2' },
          null,
        ],
        holidays: [
          { id: 'h-1', name: 'Holiday', date: '2025-12-25', scope: 'national' },
          { id: 'h-invalid' },
          null,
        ],
        autosaveIntervalSeconds: '45',
        conflictResolution: 'merge',
      },
    });

    expect(payload.workingDays).toHaveLength(2);
    expect(payload.exceptionPeriods[0].resourceIds).toEqual(['1', 'room']);
    expect(payload.holidays).toHaveLength(1);
    expect(payload.autosaveIntervalSeconds).toBe(45);

    const fallback = internals.mapScheduleSettingsPayload({});
    expect(fallback.workingDays).toEqual([]);
    expect(fallback.exceptionPeriods).toEqual([]);
    expect(fallback.holidays).toEqual([]);
  });

  it('maps service settings keeping valid entries only', () => {
    const services = internals.mapServiceSettingsPayload({
      services: [
        {
          id: 'svc-1',
          name: 'Consulta',
          slug: 'consulta',
          durationMinutes: '50',
          price: '200',
          currency: 'BRL',
          isActive: true,
          requiresAnamnesis: false,
          enableOnlineScheduling: true,
          minAdvanceMinutes: '60',
          maxAdvanceMinutes: '180',
          cancellationPolicy: {
            type: 'percentage',
            windowMinutes: '120',
            percentage: '50',
            message: 'policy',
          },
          eligibility: {
            allowNewPatients: false,
            allowExistingPatients: true,
            minimumAge: '18',
            allowedTags: ['adult'],
          },
          instructions: 'Instrucao',
          requiredDocuments: ['RG', 123],
          color: '#00FF00',
        },
        { name: 'invalid' },
        null,
      ],
    });

    expect(services).toHaveLength(1);
    expect(services[0].requiredDocuments).toEqual(['RG', '123']);
    expect(services[0].minimumAge).toBe(18);
    expect(services[0].color).toBe('#00FF00');
  });

  it('maps payment settings while ignoring malformed data', () => {
    const payload = internals.mapPaymentSettingsPayload({
      paymentSettings: {
        provider: 'asaas',
        credentialsId: 'cred',
        sandboxMode: 'false',
        splitRules: [
          { recipient: 'taxes', percentage: '5', order: '1' },
          { recipient: 'clinic', percentage: 'NaN', order: 2 },
          'invalid',
        ],
        antifraud: { enabled: true, provider: 'anti', thresholdAmount: '1000' },
        inadimplencyRule: {
          gracePeriodDays: '3',
          penaltyPercentage: '2',
          dailyInterestPercentage: '0.3',
          maxRetries: '2',
          actions: ['notify', 1],
        },
        refundPolicy: {
          type: 'manual',
          processingTimeHours: '24',
          feePercentage: '5',
          allowPartialRefund: 'true',
        },
        cancellationPolicies: [
          { type: 'percentage', windowMinutes: '180', percentage: '50', message: 'policy' },
          { type: undefined },
          null,
        ],
        bankAccountId: 321,
      },
    });

    expect(payload.splitRules).toEqual([{ recipient: 'taxes', percentage: 5, order: 1 }]);
    expect(payload.inadimplencyRule.actions).toEqual(['notify', '1']);
    expect(payload.cancellationPolicies).toHaveLength(1);
    expect(payload.bankAccountId).toBe('321');

    const fallback = internals.mapPaymentSettingsPayload({});
    expect(fallback.splitRules).toEqual([]);
    expect(fallback.refundPolicy.allowPartialRefund).toBe(false);
  });

  it('maps integration settings validating entries', () => {
    const payload = internals.mapIntegrationSettingsPayload({
      integrationSettings: {
        whatsapp: {
          enabled: true,
          provider: 'meta',
          businessNumber: '123',
          instanceStatus: 'connected',
          qrCodeUrl: 'https://qr',
          templates: [
            { name: 'tmpl', status: 'approved', category: 'transactional' },
            { name: 'invalid' },
            null,
          ],
          quietHours: { start: '20:00', end: '07:00', timezone: 'UTC' },
          webhookUrl: 'https://hook',
        },
        googleCalendar: {
          enabled: false,
          syncMode: 'one_way',
          conflictPolicy: 'external',
          requireValidationForExternalEvents: true,
          defaultCalendarId: 'cal',
          hidePatientName: true,
          prefix: '[On]',
        },
        email: {
          enabled: true,
          provider: 'sendgrid',
          fromName: 'Clinica',
          fromEmail: 'contato@clinica.com',
          replyTo: 'suporte@clinica.com',
          tracking: { open: true, click: false, bounce: true },
          templates: ['tmpl1'],
        },
        webhooks: [
          { event: 'booking.created', url: 'https://webhook', active: true },
          { event: 'invalid' },
          null,
        ],
        metadata: { env: 'sandbox' },
      },
    });

    expect(payload.whatsapp.templates).toHaveLength(1);
    expect(payload.googleCalendar?.syncMode).toBe('one_way');
    expect(payload.webhooks).toHaveLength(1);
    expect(payload.metadata).toEqual({ env: 'sandbox' });

    const fallback = internals.mapIntegrationSettingsPayload({});
    expect(fallback.whatsapp.templates).toEqual([]);
    expect(fallback.webhooks).toEqual([]);
  });

  it('maps notification settings and skips invalid items', () => {
    const payload = internals.mapNotificationSettingsPayload({
      notificationSettings: {
        channels: [
          {
            type: 'email',
            enabled: true,
            defaultEnabled: false,
            quietHours: { start: '22:00', end: '06:00', timezone: 'UTC' },
          },
          { enabled: true },
          null,
        ],
        templates: [
          {
            id: 'tmpl',
            event: 'booking',
            channel: 'email',
            version: 'v1',
            active: true,
            language: 'pt-BR',
            abGroup: 'A',
            variables: [null, { required: false }, { name: 'patient', required: true }],
          },
          { event: 'invalid' },
          null,
          'invalid-template',
        ],
        rules: [
          { event: 'booking.confirmed', channels: ['email'], enabled: true },
          { event: 'invalid', channels: [] },
          null,
        ],
        quietHours: { start: '21:00', end: '07:00', timezone: 'America/Sao_Paulo' },
        events: ['booking.confirmed'],
        metadata: { source: 'default' },
      },
    });

    expect(payload.channels).toHaveLength(1);
    expect(payload.templates[0].variables).toEqual([{ name: 'patient', required: true }]);
    expect(payload.rules).toEqual([
      { event: 'booking.confirmed', channels: ['email'], enabled: true },
    ]);
    expect(payload.quietHours?.timezone).toBe('America/Sao_Paulo');
    expect(payload.events).toEqual(['booking.confirmed']);
    expect(payload.metadata).toEqual({ source: 'default' });

    const fallback = internals.mapNotificationSettingsPayload({});
    expect(fallback.channels).toEqual([]);
    expect(fallback.templates).toEqual([]);
    expect(fallback.rules).toEqual([]);
    expect(fallback.events).toBeUndefined();
  });

  it('maps branding settings including optional palette', () => {
    const payload = internals.mapBrandingSettingsPayload({
      brandingSettings: {
        logoUrl: 'https://cdn/logo.png',
        palette: { primary: '#000', secondary: '#fff' },
        typography: { primaryFont: 'Inter', secondaryFont: 'Roboto' },
        preview: {
          mode: 'preview',
          generatedAt: '2025-10-10T10:00:00Z',
          previewUrl: 'https://cdn/preview.png',
        },
        customCss: '.selector { color: #000; }',
        versionLabel: 'v1',
        metadata: { theme: 'dark' },
      },
    });

    expect(payload.palette?.primary).toBe('#000');
    expect(payload.preview?.generatedAt).toBeInstanceOf(Date);
    expect(payload.metadata).toEqual({ theme: 'dark' });

    const fallback = internals.mapBrandingSettingsPayload({});
    expect(fallback.palette).toBeUndefined();
    expect(fallback.preview).toBeUndefined();
    expect(fallback.metadata).toBeUndefined();
  });
});
