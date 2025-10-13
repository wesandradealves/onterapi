import {
  toClinicDashboardQuery,
  toConfirmClinicHoldInput,
  toCreateClinicHoldInput,
  toPropagateClinicTemplateInput,
  toUpdateClinicBrandingSettingsInput,
  toUpdateClinicIntegrationSettingsInput,
  toUpdateClinicNotificationSettingsInput,
  toUpdateClinicPaymentSettingsInput,
  toUpdateClinicScheduleSettingsInput,
  toUpdateClinicServiceSettingsInput,
} from '../../../src/modules/clinic/api/mappers/clinic-request.mapper';
import { UpdateClinicScheduleSettingsSchema } from '../../../src/modules/clinic/api/schemas/update-clinic-schedule-settings.schema';
import { UpdateClinicServiceSettingsSchema } from '../../../src/modules/clinic/api/schemas/update-clinic-service-settings.schema';
import { UpdateClinicPaymentSettingsSchema } from '../../../src/modules/clinic/api/schemas/update-clinic-payment-settings.schema';
import { UpdateClinicIntegrationSettingsSchema } from '../../../src/modules/clinic/api/schemas/update-clinic-integration-settings.schema';
import { UpdateClinicNotificationSettingsSchema } from '../../../src/modules/clinic/api/schemas/update-clinic-notification-settings.schema';
import { UpdateClinicBrandingSettingsSchema } from '../../../src/modules/clinic/api/schemas/update-clinic-branding-settings.schema';
import { CreateClinicHoldSchema } from '../../../src/modules/clinic/api/schemas/create-clinic-hold.schema';
import { ConfirmClinicHoldSchema } from '../../../src/modules/clinic/api/schemas/confirm-clinic-hold.schema';
import { GetClinicDashboardSchema } from '../../../src/modules/clinic/api/schemas/get-clinic-dashboard.schema';
import { PropagateClinicTemplateSchema } from '../../../src/modules/clinic/api/schemas/propagate-clinic-template.schema';

describe('ClinicRequestMapper - schedule settings', () => {
  const baseContext = {
    tenantId: 'tenant-from-context',
    userId: 'user-123',
  };

  it('should convert schedule payload strings into domain structures with Date objects', () => {
    const body: UpdateClinicScheduleSettingsSchema = {
      tenantId: 'tenant-from-body',
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
            name: 'Maintenance window',
            appliesTo: 'clinic',
            start: '2025-12-01T12:00:00Z',
            end: '2025-12-01T18:00:00Z',
            resourceIds: ['room-1'],
          },
        ],
        holidays: [
          {
            id: 'holiday-1',
            name: 'Ano Novo',
            date: '2026-01-01T00:00:00Z',
            scope: 'national',
          },
        ],
        autosaveIntervalSeconds: 120,
        conflictResolution: 'merge',
      },
    };

    const input = toUpdateClinicScheduleSettingsInput('clinic-1', body, baseContext);

    expect(input.tenantId).toBe('tenant-from-body');
    expect(input.requestedBy).toBe(baseContext.userId);
    expect(input.scheduleSettings.timezone).toBe('America/Sao_Paulo');
    expect(input.scheduleSettings.workingDays).toHaveLength(1);
    expect(input.scheduleSettings.exceptionPeriods[0].start).toBeInstanceOf(Date);
    expect(input.scheduleSettings.exceptionPeriods[0].end).toBeInstanceOf(Date);
    expect(input.scheduleSettings.holidays[0].date).toBeInstanceOf(Date);
    expect(input.scheduleSettings.autosaveIntervalSeconds).toBe(120);
    expect(input.scheduleSettings.conflictResolution).toBe('merge');
  });

  it('should default tenantId from context when body tenantId is missing', () => {
    const body: UpdateClinicScheduleSettingsSchema = {
      scheduleSettings: {
        timezone: 'UTC',
        workingDays: [],
        exceptionPeriods: [],
        holidays: [],
        autosaveIntervalSeconds: 60,
        conflictResolution: 'server_wins',
      },
    };

    const input = toUpdateClinicScheduleSettingsInput('clinic-2', body, baseContext);

    expect(input.tenantId).toBe(baseContext.tenantId);
    expect(input.scheduleSettings.workingDays).toEqual([]);
    expect(input.scheduleSettings.exceptionPeriods).toEqual([]);
    expect(input.scheduleSettings.holidays).toEqual([]);
  });
});

describe('ClinicRequestMapper - integration settings', () => {
  const baseContext = { tenantId: 'tenant-int', userId: 'user-int' };

  it('maps integration payload into configuration object', () => {
    const body: UpdateClinicIntegrationSettingsSchema = {
      tenantId: 'tenant-body',
      integrationSettings: {
        whatsapp: {
          enabled: true,
          provider: 'evolution',
          businessNumber: '+5511999999999',
          instanceStatus: 'active',
          templates: [{ name: 'confirmacao', status: 'approved', category: 'TRANSACTIONAL' }],
          quietHours: { start: '21:00', end: '08:00', timezone: 'America/Sao_Paulo' },
          webhookUrl: 'https://hook/whatsapp',
        },
        googleCalendar: {
          enabled: true,
          syncMode: 'two_way',
          conflictPolicy: 'onterapi_wins',
          requireValidationForExternalEvents: true,
          defaultCalendarId: 'cal-123',
          hidePatientName: true,
          prefix: '[On] ',
        },
        email: {
          enabled: true,
          provider: 'sendgrid',
          fromName: 'Clínica On',
          fromEmail: 'contato@on.com',
          tracking: { open: true, click: true, bounce: false },
          templates: ['booking_confirmation'],
        },
        webhooks: [{ event: 'booking.created', url: 'https://hook/booking', active: true }],
        metadata: { integrationKey: 'abc' },
      },
    };

    const input = toUpdateClinicIntegrationSettingsInput('clinic-int', body, baseContext);

    expect(input.tenantId).toBe('tenant-body');
    expect(input.integrationSettings.whatsapp?.enabled).toBe(true);
    expect(input.integrationSettings.googleCalendar?.syncMode).toBe('two_way');
    expect(input.integrationSettings.email?.provider).toBe('sendgrid');
    expect(input.integrationSettings.webhooks).toHaveLength(1);
  });
});

describe('ClinicRequestMapper - notification settings', () => {
  const baseContext = { tenantId: 'tenant-notif', userId: 'user-notif' };

  it('maps notification payload into configuration object', () => {
    const body: UpdateClinicNotificationSettingsSchema = {
      tenantId: 'tenant-body',
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
            variables: [{ name: 'patient', required: true }],
          },
        ],
        rules: [{ event: 'booking.confirmed', channels: ['email'], enabled: true }],
        quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' },
        events: ['booking.confirmed'],
        metadata: { source: 'default' },
      },
    };

    const input = toUpdateClinicNotificationSettingsInput('clinic-notif', body, baseContext);

    expect(input.notificationSettings.channels).toHaveLength(1);
    expect(input.notificationSettings.templates[0].variables[0].name).toBe('patient');
    expect(input.notificationSettings.rules[0].event).toBe('booking.confirmed');
    expect(input.notificationSettings.events).toEqual(['booking.confirmed']);
  });
});

describe('ClinicRequestMapper - branding settings', () => {
  const baseContext = { tenantId: 'tenant-brand', userId: 'user-brand' };

  it('maps branding payload into configuration object', () => {
    const body: UpdateClinicBrandingSettingsSchema = {
      tenantId: 'tenant-body',
      brandingSettings: {
        logoUrl: 'https://cdn/logo.png',
        darkLogoUrl: 'https://cdn/logo-dark.png',
        palette: { primary: '#123456', secondary: '#abcdef' },
        typography: { primaryFont: 'Inter', secondaryFont: 'Roboto', headingWeight: 600 },
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
    };

    const input = toUpdateClinicBrandingSettingsInput('clinic-brand', body, baseContext);

    expect(input.brandingSettings.logoUrl).toBe('https://cdn/logo.png');
    expect(input.brandingSettings.palette?.primary).toBe('#123456');
    expect(input.brandingSettings.applyMode).toBe('preview');
    expect(input.brandingSettings.metadata).toEqual({ theme: 'default' });
  });
});

describe('ClinicRequestMapper - service settings', () => {
  const baseContext = {
    tenantId: 'tenant-context',
    userId: 'user-456',
  };

  it('should map service configuration into domain structure', () => {
    const body: UpdateClinicServiceSettingsSchema = {
      tenantId: 'tenant-body',
      serviceSettings: {
        services: [
          {
            serviceTypeId: 'svc-1',
            name: 'Psicoterapia',
            slug: 'psicoterapia',
            durationMinutes: 50,
            price: 200,
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
              message: 'Cancelar com 2h de antecedência',
            },
            eligibility: {
              allowNewPatients: true,
              allowExistingPatients: true,
              minimumAge: 18,
              maximumAge: 65,
              allowedTags: ['adult'],
            },
            color: '#123456',
            instructions: 'Chegar com antecedência',
            requiredDocuments: ['RG'],
          },
        ],
      },
    };

    const input = toUpdateClinicServiceSettingsInput('clinic-1', body, baseContext);

    expect(input.tenantId).toBe('tenant-body');
    expect(input.serviceSettings.services).toHaveLength(1);
    const service = input.serviceSettings.services[0];
    expect(service.serviceTypeId).toBe('svc-1');
    expect(service.cancellationPolicyPercentage).toBe(50);
    expect(service.allowedTags).toEqual(['adult']);
    expect(service.color).toBe('#123456');
  });

  it('should fall back to context tenant when tenantId absent', () => {
    const body: UpdateClinicServiceSettingsSchema = {
      serviceSettings: {
        services: [
          {
            serviceTypeId: 'svc-2',
            name: 'Consulta',
            slug: 'consulta',
            durationMinutes: 30,
            price: 150,
            currency: 'BRL',
            isActive: true,
            requiresAnamnesis: false,
            enableOnlineScheduling: true,
            minAdvanceMinutes: 30,
          },
        ],
      },
    };

    const input = toUpdateClinicServiceSettingsInput('clinic-2', body, baseContext);

    expect(input.tenantId).toBe(baseContext.tenantId);
    expect(input.serviceSettings.services[0].allowNewPatients).toBe(true);
    expect(input.serviceSettings.services[0].allowExistingPatients).toBe(true);
  });
});

describe('ClinicRequestMapper - payment settings', () => {
  const baseContext = {
    tenantId: 'tenant-payment',
    userId: 'user-789',
  };

  it('should map payment configuration into domain structure', () => {
    const body: UpdateClinicPaymentSettingsSchema = {
      tenantId: 'tenant-body',
      paymentSettings: {
        provider: 'asaas',
        credentialsId: 'cred-1',
        sandboxMode: true,
        splitRules: [
          { recipient: 'taxes', percentage: 5, order: 1 },
          { recipient: 'clinic', percentage: 45, order: 2 },
        ],
        roundingStrategy: 'half_even',
        antifraud: { enabled: true, provider: 'clearsale', thresholdAmount: 500 },
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
          { type: 'percentage', windowMinutes: 120, percentage: 50, message: 'Até 2h sem custo' },
        ],
        bankAccountId: 'bank-1',
      },
    };

    const input = toUpdateClinicPaymentSettingsInput('clinic-3', body, baseContext);

    expect(input.tenantId).toBe('tenant-body');
    expect(input.paymentSettings.splitRules).toHaveLength(2);
    expect(input.paymentSettings.antifraud?.provider).toBe('clearsale');
    expect(input.paymentSettings.inadimplencyRule.penaltyPercentage).toBe(2);
    expect(input.paymentSettings.cancellationPolicies[0].message).toContain('Até 2h');
    expect(input.paymentSettings.bankAccountId).toBe('bank-1');
  });

  it('should default tenant when missing and allow empty optional sections', () => {
    const body: UpdateClinicPaymentSettingsSchema = {
      paymentSettings: {
        provider: 'asaas',
        credentialsId: 'cred-2',
        sandboxMode: false,
        splitRules: [{ recipient: 'platform', percentage: 100, order: 1 }],
        roundingStrategy: 'half_even',
        antifraud: { enabled: false },
        refundPolicy: {
          type: 'manual',
          processingTimeHours: 24,
          allowPartialRefund: false,
        },
        cancellationPolicies: [],
      },
    };

    const input = toUpdateClinicPaymentSettingsInput('clinic-4', body, baseContext);

    expect(input.tenantId).toBe(baseContext.tenantId);
    expect(input.paymentSettings.inadimplencyRule.gracePeriodDays).toBe(0);
    expect(input.paymentSettings.inadimplencyRule.actions).toEqual([]);
    expect(input.paymentSettings.cancellationPolicies).toEqual([]);
  });
});

describe('ClinicRequestMapper - dashboard query', () => {
  const baseContext = { tenantId: 'tenant-dashboard', userId: 'user-dashboard' };

  it('maps filters, flags e metricas com deduplicacao', () => {
    const body: GetClinicDashboardSchema = {
      tenantId: 'tenant-body',
      clinicIds: ['clinic-1', 'clinic-2'],
      from: '2025-01-01T00:00:00Z',
      to: '2025-01-31T23:59:59Z',
      includeForecast: true,
      includeComparisons: true,
      comparisonMetrics: ['revenue', 'patients', 'occupancy', 'revenue'],
    };

    const query = toClinicDashboardQuery(body, baseContext);

    expect(query.tenantId).toBe('tenant-body');
    expect(query.includeForecast).toBe(true);
    expect(query.includeComparisons).toBe(true);
    expect(query.filters?.clinicIds).toEqual(['clinic-1', 'clinic-2']);
    expect(query.filters?.from).toBeInstanceOf(Date);
    expect(query.filters?.to).toBeInstanceOf(Date);
    expect(query.comparisonMetrics).toEqual(['revenue', 'patients', 'occupancy']);
  });

  it('usa tenant do contexto e ignora metricas ausentes', () => {
    const body: GetClinicDashboardSchema = {};

    const query = toClinicDashboardQuery(body, baseContext);

    expect(query.tenantId).toBe(baseContext.tenantId);
    expect(query.filters).toBeUndefined();
    expect(query.includeForecast).toBeUndefined();
    expect(query.includeComparisons).toBeUndefined();
    expect(query.comparisonMetrics).toBeUndefined();
  });
});

describe('ClinicRequestMapper - template propagation', () => {
  const baseContext = { tenantId: 'tenant-template', userId: 'user-template' };

  it('mapeia dados removendo duplicados e auto-propagacao', () => {
    const body: PropagateClinicTemplateSchema = {
      tenantId: 'tenant-body',
      targetClinicIds: ['clinic-1', 'clinic-1', 'template-clinic', 'clinic-2'],
      sections: ['general', 'services'],
      versionNotes: 'propagar v2',
    };

    const input = toPropagateClinicTemplateInput('template-clinic', body, baseContext);

    expect(input.tenantId).toBe('tenant-body');
    expect(input.templateClinicId).toBe('template-clinic');
    expect(input.targetClinicIds).toEqual(['clinic-1', 'clinic-2']);
    expect(input.sections).toEqual(['general', 'services']);
    expect(input.versionNotes).toBe('propagar v2');
    expect(input.triggeredBy).toBe(baseContext.userId);
  });

  it('usa tenant do contexto quando omitido', () => {
    const body: PropagateClinicTemplateSchema = {
      targetClinicIds: ['clinic-3'],
      sections: ['branding'],
    };

    const input = toPropagateClinicTemplateInput('template-clinic', body, baseContext);

    expect(input.tenantId).toBe(baseContext.tenantId);
    expect(input.targetClinicIds).toEqual(['clinic-3']);
    expect(input.sections).toEqual(['branding']);
  });
});

describe('ClinicRequestMapper - hold flows', () => {
  const baseContext = {
    tenantId: 'tenant-hold',
    userId: 'user-hold',
  };

  it('should map create hold payload into domain input', () => {
    const body: CreateClinicHoldSchema = {
      tenantId: 'tenant-body',
      professionalId: '11111111-1111-1111-1111-111111111111',
      patientId: '22222222-2222-2222-2222-222222222222',
      serviceTypeId: '33333333-3333-3333-3333-333333333333',
      start: '2025-12-10T10:00:00.000Z',
      end: '2025-12-10T10:30:00.000Z',
      locationId: '44444444-4444-4444-4444-444444444444',
      resources: ['room-1', 'equipment-2'],
      idempotencyKey: 'create-hold-123456',
      metadata: { priority: 'high' },
    };

    const input = toCreateClinicHoldInput('clinic-123', body, baseContext);

    expect(input.clinicId).toBe('clinic-123');
    expect(input.tenantId).toBe('tenant-body');
    expect(input.requestedBy).toBe(baseContext.userId);
    expect(input.start).toBeInstanceOf(Date);
    expect(input.end).toBeInstanceOf(Date);
    expect(input.resources).toEqual(['room-1', 'equipment-2']);
    expect(input.metadata).toEqual({ priority: 'high' });
  });

  it('should map confirm hold payload into domain input', () => {
    const body: ConfirmClinicHoldSchema = {
      tenantId: 'tenant-body',
      paymentTransactionId: 'trx-987',
      idempotencyKey: 'confirm-hold-456',
    };

    const input = toConfirmClinicHoldInput('clinic-123', 'hold-456', body, baseContext);

    expect(input.clinicId).toBe('clinic-123');
    expect(input.holdId).toBe('hold-456');
    expect(input.tenantId).toBe('tenant-body');
    expect(input.confirmedBy).toBe(baseContext.userId);
    expect(input.paymentTransactionId).toBe('trx-987');
    expect(input.idempotencyKey).toBe('confirm-hold-456');
  });

  it('should fallback tenant from context when not provided in confirm payload', () => {
    const body: ConfirmClinicHoldSchema = {
      paymentTransactionId: 'trx-000',
      idempotencyKey: 'idem-000',
    };

    const input = toConfirmClinicHoldInput('clinic-zz', 'hold-yy', body, baseContext);

    expect(input.tenantId).toBe(baseContext.tenantId);
  });
});
