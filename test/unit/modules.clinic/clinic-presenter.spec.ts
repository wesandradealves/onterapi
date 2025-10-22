import { ClinicPresenter } from '../../../src/modules/clinic/api/presenters/clinic.presenter';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import {
  Clinic,
  ClinicAlert,
  ClinicAppointmentConfirmationResult,
  ClinicConfigurationSection,
  ClinicConfigurationTelemetry,
  ClinicConfigurationVersion,
  ClinicDashboardComparison,
  ClinicDashboardForecast,
  ClinicDashboardSnapshot,
  ClinicEconomicAgreement,
  ClinicHold,
  ClinicInvitation,
  ClinicManagementOverview,
  ClinicManagementTemplateInfo,
  ClinicPaymentLedger,
  ClinicServiceTypeDefinition,
} from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicPresenter.invitation', () => {
  const baseInvitation: ClinicInvitation = {
    id: 'invitation-id',
    clinicId: 'clinic-id',
    tenantId: 'tenant-id',
    issuedBy: 'user-id',
    status: 'pending',
    tokenHash: 'hashed-token',
    channel: 'email',
    expiresAt: new Date('2025-12-01T12:00:00Z'),
    economicSummary: {
      items: [
        {
          serviceTypeId: 'service-1',
          price: 200,
          currency: 'BRL',
          payoutModel: 'fixed',
          payoutValue: 80,
        },
        {
          serviceTypeId: 'service-2',
          price: 150,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 40,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    },
    createdAt: new Date('2025-10-12T10:00:00Z'),
    updatedAt: new Date('2025-10-12T10:00:00Z'),
    metadata: {},
  };

  it('should include economic examples with proper calculations', () => {
    const dto = ClinicPresenter.invitation(baseInvitation, 'raw-token');

    expect(dto.economicSummary.examples).toBeDefined();
    expect(dto.economicSummary.examples).toHaveLength(2);

    const [fixedExample, percentageExample] = dto.economicSummary.examples ?? [];

    expect(fixedExample).toEqual({
      currency: 'BRL',
      patientPays: 200,
      professionalReceives: 80,
      remainder: 120,
    });

    // 40% of 150 = 60
    expect(percentageExample).toEqual({
      currency: 'BRL',
      patientPays: 150,
      professionalReceives: 60,
      remainder: 90,
    });
  });

  it('should preserve other invitation fields', () => {
    const dto = ClinicPresenter.invitation(
      {
        ...baseInvitation,
        professionalId: 'professional-1',
        targetEmail: 'pro@example.com',
        metadata: { reference: 'source-system' },
      },
      undefined,
    );

    expect(dto.professionalId).toBe('professional-1');
    expect(dto.targetEmail).toBe('pro@example.com');
    expect(dto.metadata).toEqual({ reference: 'source-system' });
    expect(dto.token).toBeUndefined();
  });

  it('throws an error when the invitation has no economic summary', () => {
    const invalidInvitation = {
      ...baseInvitation,
      economicSummary: undefined,
    } as unknown as ClinicInvitation;

    expect(() => ClinicPresenter.invitation(invalidInvitation, 'token')).toThrow(
      'Convite sem resumo economico',
    );
  });
});

describe('ClinicPresenter.holdConfirmation', () => {
  it('should map confirmation result into response dto', () => {
    const confirmation: ClinicAppointmentConfirmationResult = {
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      holdId: 'hold-1',
      paymentTransactionId: 'trx-123',
      confirmedAt: new Date('2025-12-05T09:00:00Z'),
      paymentStatus: 'approved',
    };

    const dto = ClinicPresenter.holdConfirmation(confirmation);

    expect(dto).toEqual({
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      holdId: 'hold-1',
      paymentTransactionId: 'trx-123',
      confirmedAt: confirmation.confirmedAt,
      paymentStatus: 'approved',
    });
  });
});

describe('ClinicPresenter.paymentLedger', () => {
  const baseLedger: ClinicPaymentLedger = {
    currency: 'BRL',
    lastUpdatedAt: '2099-01-01T12:00:00.000Z',
    events: [
      {
        type: 'settled',
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
        recordedAt: '2099-01-01T12:00:00.000Z',
        sandbox: false,
      },
      {
        type: 'refunded',
        gatewayStatus: 'REFUNDED',
        recordedAt: '2099-01-02T09:00:00.000Z',
        sandbox: false,
        metadata: { reason: 'customer_request' },
      },
    ],
    settlement: {
      settledAt: '2099-01-01T12:00:00.000Z',
      baseAmountCents: 20000,
      netAmountCents: 18000,
      split: [
        { recipient: 'taxes', percentage: 5, amountCents: 1000 },
        { recipient: 'clinic', percentage: 70, amountCents: 14000 },
        { recipient: 'professional', percentage: 25, amountCents: 5000 },
      ],
      remainderCents: 0,
      gatewayStatus: 'RECEIVED_IN_ADVANCE',
      fingerprint: 'fp-settled',
    },
    refund: {
      refundedAt: '2099-01-02T09:00:00.000Z',
      amountCents: 20000,
      netAmountCents: 18000,
      gatewayStatus: 'REFUNDED',
      fingerprint: 'fp-refund',
    },
    chargeback: {
      chargebackAt: '2099-01-03T10:00:00.000Z',
      amountCents: 20000,
      netAmountCents: 18000,
      gatewayStatus: 'CHARGEBACK',
      fingerprint: 'fp-chargeback',
    },
    metadata: { source: 'asaas' },
  };

  it('should map payment ledger with events and settlement', () => {
    const dto = ClinicPresenter.paymentLedger({
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'settled',
      paymentTransactionId: 'trx-123',
      ledger: baseLedger,
    });

    expect(dto.appointmentId).toBe('appointment-1');
    expect(dto.paymentStatus).toBe('settled');
    expect(dto.ledger.currency).toBe('BRL');
    expect(dto.ledger.events).toHaveLength(2);
    expect(dto.ledger.events[1]).toMatchObject({
      type: 'refunded',
      gatewayStatus: 'REFUNDED',
      metadata: { reason: 'customer_request' },
    });
    expect(dto.ledger.settlement?.split).toHaveLength(3);
    expect(dto.ledger.settlement?.split?.[0]).toEqual({
      recipient: 'taxes',
      percentage: 5,
      amountCents: 1000,
    });
    expect(dto.ledger.refund?.fingerprint).toBe('fp-refund');
    expect(dto.ledger.chargeback?.gatewayStatus).toBe('CHARGEBACK');
    expect(dto.ledger.metadata).toEqual({ source: 'asaas' });
  });

  it('should handle optional sections gracefully', () => {
    const dto = ClinicPresenter.paymentLedger({
      appointmentId: 'appointment-2',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'approved',
      paymentTransactionId: 'trx-456',
      ledger: {
        currency: 'BRL',
        lastUpdatedAt: '2099-01-05T10:00:00.000Z',
        events: [],
      },
    });

    expect(dto.ledger.events).toHaveLength(0);
    expect(dto.ledger.settlement).toBeUndefined();
    expect(dto.ledger.refund).toBeUndefined();
    expect(dto.ledger.chargeback).toBeUndefined();
  });
});

describe('ClinicPresenter.managementOverview', () => {
  it('converte overview de gestao em DTO', () => {
    const overview: ClinicManagementOverview = {
      period: {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z'),
      },
      totals: {
        clinics: 1,
        professionals: 3,
        activePatients: 40,
        revenue: 8000,
      },
      clinics: [
        {
          clinicId: 'clinic-a',
          name: 'Clinic A',
          slug: 'clinic-a',
          status: 'active',
          primaryOwnerId: 'owner-1',
          lastActivityAt: new Date('2025-01-31T00:00:00Z'),
          metrics: {
            revenue: 8000,
            appointments: 100,
            activePatients: 40,
            occupancyRate: 0.75,
            satisfactionScore: 4.3,
            contributionMargin: 0.25,
          },
          alerts: [
            {
              id: 'alert-1',
              clinicId: 'clinic-a',
              type: 'revenue_drop',
              channel: 'in_app',
              triggeredAt: new Date('2025-01-15T12:00:00Z'),
              resolvedAt: undefined,
              payload: { value: -8 },
            },
          ],
          teamDistribution: [
            { role: RolesEnum.CLINIC_OWNER, count: 1 },
            { role: RolesEnum.MANAGER, count: 1 },
            { role: RolesEnum.PROFESSIONAL, count: 2 },
            { role: RolesEnum.SECRETARY, count: 1 },
          ],
          template: {
            templateClinicId: 'template-1',
            lastPropagationAt: new Date('2025-01-02T10:00:00Z'),
            lastTriggeredBy: 'user-1',
            sections: [
              {
                section: 'general',
                templateVersionId: 'tv-1',
                templateVersionNumber: 3,
                propagatedVersionId: 'pv-1',
                propagatedAt: new Date('2025-01-02T10:00:00Z'),
                triggeredBy: 'user-1',
                override: {
                  overrideId: 'ov-1',
                  overrideVersion: 2,
                  overrideHash: 'hash',
                  overrideUpdatedAt: new Date('2025-01-03T08:00:00Z'),
                  overrideUpdatedBy: 'user-2',
                  overrideAppliedVersionId: 'cv-1',
                },
              },
            ],
          },
        },
      ],
      alerts: [],
      comparisons: {
        period: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-01-31T23:59:59Z'),
        },
        previousPeriod: {
          start: new Date('2024-12-01T00:00:00Z'),
          end: new Date('2024-12-31T23:59:59Z'),
        },
        metrics: [
          {
            metric: 'revenue',
            entries: [
              {
                clinicId: 'clinic-a',
                name: 'Clinic A',
                revenue: 8000,
                revenueVariationPercentage: 5,
                appointments: 100,
                appointmentsVariationPercentage: 4,
                activePatients: 40,
                activePatientsVariationPercentage: 3,
                occupancyRate: 0.75,
                occupancyVariationPercentage: 2,
                satisfactionScore: 4.3,
                satisfactionVariationPercentage: 1,
                rankingPosition: 1,
              },
            ],
          },
        ],
      } as ClinicDashboardComparison,
      forecast: {
        period: {
          start: new Date('2025-02-01T00:00:00Z'),
          end: new Date('2025-02-28T23:59:59Z'),
        },
        projections: [
          {
            clinicId: 'clinic-a',
            month: '2025-02',
            projectedRevenue: 8200,
            projectedAppointments: 105,
            projectedOccupancyRate: 0.77,
          },
        ],
      } as ClinicDashboardForecast,
    };

    const dto = ClinicPresenter.managementOverview(overview);

    expect(dto.clinics).toHaveLength(1);
    expect(dto.clinics[0].metrics.revenue).toBe(8000);
    expect(dto.clinics[0].teamDistribution?.[0]).toEqual({
      role: RolesEnum.CLINIC_OWNER,
      count: 1,
    });
    expect(dto.clinics[0].template?.sections[0].overrideId).toBe('ov-1');
    expect(dto.comparisons?.metrics[0].entries[0].revenueVariationPercentage).toBe(5);
    expect(dto.forecast?.projections[0].projectedRevenue).toBe(8200);
  });
});

describe('ClinicPresenter.teamSettings', () => {
  it('maps requireFinancialClearance flag', () => {
    const version: ClinicConfigurationVersion = {
      id: 'version-team',
      clinicId: 'clinic-1',
      section: 'team',
      version: 1,
      payload: {
        teamSettings: {
          quotas: [],
          allowExternalInvitations: true,
          defaultMemberStatus: 'pending_invitation',
          requireFinancialClearance: true,
        },
      },
      createdBy: 'user',
      createdAt: new Date('2025-10-10T10:00:00Z'),
      autoApply: true,
    };

    const dto = ClinicPresenter.teamSettings(version);

    expect(dto.payload.requireFinancialClearance).toBe(true);
  });
});

describe('ClinicPresenter summary and details', () => {
  const baseHoldSettings = {
    ttlMinutes: 30,
    minAdvanceMinutes: 60,
    maxAdvanceMinutes: 1440,
    allowOverbooking: true,
    overbookingThreshold: 0.25,
    resourceMatchingStrict: true,
  };

  const baseClinic: Clinic = {
    id: 'clinic-1',
    tenantId: 'tenant-1',
    name: 'Clinica Integrada',
    slug: 'clinica-integrada',
    status: 'active',
    primaryOwnerId: 'owner-1',
    holdSettings: baseHoldSettings,
    configurationVersions: { general: 'cfg-general', services: undefined, branding: '' },
    createdAt: new Date('2025-10-10T10:00:00Z'),
    updatedAt: new Date('2025-10-11T13:00:00Z'),
    metadata: {},
  };

  it('exposes hold settings in the summary response', () => {
    const summary = ClinicPresenter.summary(baseClinic);

    expect(summary).toMatchObject({
      id: 'clinic-1',
      slug: 'clinica-integrada',
      holdSettings: {
        ttlMinutes: 30,
        minAdvanceMinutes: 60,
        maxAdvanceMinutes: 1440,
        allowOverbooking: true,
        overbookingThreshold: 0.25,
        resourceMatchingStrict: true,
      },
    });
  });

  it('filters falsy configuration versions and metadata in the details response', () => {
    const clinicWithMetadata: Clinic = {
      ...baseClinic,
      document: { type: 'cnpj', value: '12.345.678/0001-99' },
      configurationVersions: {
        general: 'cfg-general',
        services: '',
        notifications: undefined,
      },
      metadata: { brandColor: '#123456' },
    };

    const details = ClinicPresenter.details(clinicWithMetadata);

    expect(details.configurationVersions).toEqual({ general: 'cfg-general' });
    expect(details.metadata).toEqual({ brandColor: '#123456' });
    expect(details.document).toEqual({ type: 'cnpj', value: '12.345.678/0001-99' });
  });

  it('maps clinic hold settings dto', () => {
    const holdSettings = ClinicPresenter.holdSettings(baseClinic);

    expect(holdSettings).toEqual({
      clinicId: baseClinic.id,
      tenantId: baseClinic.tenantId,
      holdSettings: {
        ttlMinutes: 30,
        minAdvanceMinutes: 60,
        maxAdvanceMinutes: 1440,
        allowOverbooking: true,
        overbookingThreshold: 0.25,
        resourceMatchingStrict: true,
      },
    });
  });
});

describe('ClinicPresenter.templatePropagation', () => {
  const templateClinic: Clinic = {
    id: 'clinic-template',
    tenantId: 'tenant-1',
    name: 'Clinica Modelo',
    slug: 'clinica-modelo',
    status: 'active',
    primaryOwnerId: 'owner-1',
    holdSettings: {
      ttlMinutes: 20,
      minAdvanceMinutes: 30,
      maxAdvanceMinutes: 0,
      allowOverbooking: false,
      overbookingThreshold: 0,
      resourceMatchingStrict: true,
    },
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-02T11:00:00Z'),
    metadata: {
      templatePropagation: {
        templateClinicId: 'template-root',
        lastPropagationAt: '2025-10-12T10:00:00Z',
        lastTriggeredBy: 'owner-1',
        sections: {
          general: {
            templateVersionId: 'tmpl-v1',
            templateVersionNumber: 2,
            propagatedVersionId: 'prop-v1',
            propagatedAt: '2025-10-12T09:00:00Z',
            triggeredBy: 'owner-1',
            override: {
              overrideId: 'ov-1',
              overrideVersion: 3,
              overrideHash: 'hash-1',
              updatedAt: '2025-10-12T09:05:00Z',
              updatedBy: 'owner-1',
              appliedConfigurationVersionId: 'cfg-1',
            },
          },
          schedule: {
            templateVersionId: 'tmpl-v2',
            propagatedVersionId: 'prop-v2',
            propagatedAt: '2025-10-10T09:00:00Z',
            triggeredBy: 'owner-1',
          },
          invalid: null,
          services: {
            templateVersionId: 'missing-fields',
          },
        },
      },
    },
  };

  it('extracts and sorts propagated sections, ignoring invalid entries', () => {
    const response = ClinicPresenter.templatePropagation(templateClinic);

    expect(response.templateClinicId).toBe('template-root');
    expect(response.sections).toHaveLength(2);
    expect(response.sections[0].section).toBe('general');
    expect(response.sections[0].overrideId).toBe('ov-1');
    expect(response.sections[1].section).toBe('schedule');
  });

  it('returns empty propagation when metadata is missing', () => {
    const clinic: Clinic = {
      ...templateClinic,
      metadata: undefined,
    } as Clinic;

    const response = ClinicPresenter.templatePropagation(clinic);

    expect(response.sections).toHaveLength(0);
    expect(response.templateClinicId).toBeUndefined();
  });

  it('ignores non-object propagation payloads', () => {
    const clinic: Clinic = {
      ...templateClinic,
      metadata: {
        templatePropagation: {
          sections: 'invalid',
        },
      } as unknown as Record<string, unknown>,
    };

    const response = ClinicPresenter.templatePropagation(clinic);

    expect(response.sections).toEqual([]);
    expect(response.templateClinicId).toBeUndefined();
  });
});

describe('ClinicPresenter.hold', () => {
  it('maps hold entity into response dto including optional fields', () => {
    const hold: ClinicHold = {
      id: 'hold-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      professionalId: 'pro-1',
      patientId: 'patient-1',
      serviceTypeId: 'service-1',
      start: new Date('2025-10-20T09:00:00Z'),
      end: new Date('2025-10-20T10:00:00Z'),
      ttlExpiresAt: new Date('2025-10-20T09:15:00Z'),
      status: 'pending',
      locationId: 'room-1',
      resources: ['equip-1'],
      idempotencyKey: 'key-1',
      createdBy: 'user-1',
      createdAt: new Date('2025-10-19T10:00:00Z'),
      updatedAt: new Date('2025-10-19T10:15:00Z'),
      confirmedAt: undefined,
      confirmedBy: undefined,
      cancelledAt: undefined,
      cancelledBy: undefined,
      cancellationReason: null,
      metadata: { source: 'test' },
    };

    const dto = ClinicPresenter.hold(hold);

    expect(dto).toMatchObject({
      id: 'hold-1',
      clinicId: 'clinic-1',
      resources: ['equip-1'],
      metadata: { source: 'test' },
    });
  });
});

describe('ClinicPresenter.dashboard', () => {
  const baseAlert: ClinicAlert = {
    id: 'alert-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    type: 'revenue_drop',
    channel: 'in_app',
    triggeredBy: 'system',
    triggeredAt: new Date('2025-10-12T12:00:00Z'),
    payload: { drop: 15 },
  };

  it('maps dashboard snapshot with comparisons and forecast data', () => {
    const snapshot: ClinicDashboardSnapshot = {
      period: { start: new Date('2025-10-01'), end: new Date('2025-10-31') },
      totals: { clinics: 2, professionals: 5, activePatients: 120, revenue: 45000 },
      metrics: [
        {
          metric: 'revenue',
          clinicId: 'clinic-1',
          value: 30000,
          variation: 0.1,
        },
      ],
      alerts: [baseAlert],
      comparisons: {
        period: { start: new Date('2025-09-01'), end: new Date('2025-09-30') },
        previousPeriod: { start: new Date('2025-08-01'), end: new Date('2025-08-31') },
        metrics: [
          {
            metric: 'revenue',
            entries: [
              {
                clinicId: 'clinic-1',
                name: 'Clinica Prime',
                revenue: 30000,
                revenueVariationPercentage: 10,
                appointments: 120,
                appointmentsVariationPercentage: 5,
                activePatients: 80,
                activePatientsVariationPercentage: 4,
                occupancyRate: 0.75,
                occupancyVariationPercentage: 3,
              },
            ],
          },
        ],
      },
      forecast: {
        period: { start: new Date('2025-11-01'), end: new Date('2025-11-30') },
        projections: [
          {
            clinicId: 'clinic-1',
            month: '2025-11',
            projectedRevenue: 32000,
            projectedAppointments: 130,
            projectedOccupancyRate: 0.78,
          },
        ],
      },
    };

    const dto = ClinicPresenter.dashboard(snapshot);

    expect(dto.metrics[0]).toEqual(snapshot.metrics[0]);
    expect(dto.comparisons?.metrics[0].entries[0].name).toBe('Clinica Prime');
    expect(dto.forecast?.projections[0].projectedRevenue).toBe(32000);
  });

  it('returns undefined for optional sections when snapshot omits them', () => {
    const snapshot: ClinicDashboardSnapshot = {
      period: { start: new Date('2025-10-01'), end: new Date('2025-10-31') },
      totals: { clinics: 1, professionals: 2, activePatients: 40, revenue: 15000 },
      metrics: [],
      alerts: [],
    };

    const dto = ClinicPresenter.dashboard(snapshot);

    expect(dto.comparisons).toBeUndefined();
    expect(dto.forecast).toBeUndefined();
  });
});

describe('ClinicPresenter.serviceType', () => {
  it('maps service type definition including optional fields', () => {
    const definition: ClinicServiceTypeDefinition = {
      id: 'service-1',
      clinicId: 'clinic-1',
      name: 'Consulta Online',
      slug: 'consulta-online',
      color: '#3366ff',
      durationMinutes: 50,
      price: 200,
      currency: 'BRL',
      isActive: true,
      requiresAnamnesis: false,
      enableOnlineScheduling: true,
      minAdvanceMinutes: 60,
      maxAdvanceMinutes: 1440,
      cancellationPolicy: {
        type: 'percentage',
        windowMinutes: 120,
        percentage: 50,
        message: 'Cancelamento até 2h: 50%',
      },
      eligibility: {
        allowNewPatients: true,
        allowExistingPatients: true,
        minimumAge: 18,
        maximumAge: 70,
        allowedTags: ['adult'],
      },
      instructions: 'Acesse o link enviado por email.',
      requiredDocuments: ['Documento com foto'],
      customFields: [{ id: 'field-1', label: 'Observação', fieldType: 'text', required: false }],
      createdAt: new Date('2025-10-10T10:00:00Z'),
      updatedAt: new Date('2025-10-11T11:00:00Z'),
    };

    const dto = ClinicPresenter.serviceType(definition);

    expect(dto.cancellationPolicy?.percentage).toBe(50);
    expect(dto.eligibility?.allowedTags).toEqual(['adult']);
    expect(dto.customFields?.[0]).toEqual({
      id: 'field-1',
      label: 'Observação',
      fieldType: 'text',
      required: false,
      options: undefined,
    });
  });
});

describe('ClinicPresenter.managementOverview (edge cases)', () => {
  const alert: ClinicAlert = {
    id: 'alert-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    type: 'compliance',
    channel: 'push',
    triggeredBy: 'system',
    triggeredAt: new Date('2025-10-12T09:00:00Z'),
    payload: { document: 'crm' },
  };

  it('omits template and distribution when data is incomplete', () => {
    const overview: ClinicManagementOverview = {
      period: { start: new Date('2025-10-01'), end: new Date('2025-10-31') },
      totals: { clinics: 1, professionals: 2, activePatients: 40, revenue: 15000 },
      clinics: [
        {
          clinicId: 'clinic-1',
          name: 'Clinica Norte',
          slug: 'clinica-norte',
          status: 'inactive',
          metrics: {
            revenue: 15000,
            appointments: 80,
            activePatients: 40,
            occupancyRate: 0.6,
          },
          alerts: [alert],
          template: {
            templateClinicId: undefined,
            lastPropagationAt: undefined,
            lastTriggeredBy: undefined,
            sections: [
              {
                section: 'general',
                templateVersionId: undefined,
                propagatedVersionId: undefined,
                triggeredBy: undefined,
                propagatedAt: undefined,
              },
            ],
          },
        },
        {
          clinicId: 'clinic-2',
          name: 'Clinica Sul',
          slug: 'clinica-sul',
          status: 'inactive',
          metrics: {
            revenue: 5000,
            appointments: 40,
            activePatients: 20,
            occupancyRate: 0.4,
          },
          alerts: [],
          template: undefined,
        },
      ],
      alerts: [alert],
    };

    const dto = ClinicPresenter.managementOverview(overview);

    expect(dto.clinics[0].teamDistribution).toBeUndefined();
    expect(dto.clinics[0].financials).toBeUndefined();
    expect(dto.clinics[0].template).toBeUndefined();
    expect(dto.clinics[1].template).toBeUndefined();
  });
});

describe('ClinicPresenter economic summary rounding', () => {
  const internals = ClinicPresenter as unknown as {
    roundHalfEven: (value: number, decimals?: number) => number;
    buildEconomicExamples: (items: ClinicEconomicAgreement[]) => Array<{
      patientPays: number;
      professionalReceives: number;
      remainder: number;
    }>;
  };

  it('applies half-even rounding for positive ties', () => {
    expect(internals.roundHalfEven(1.25, 1)).toBe(1.2);
    expect(internals.roundHalfEven(1.35, 1)).toBe(1.4);
  });

  it('applies half-even rounding for negative ties', () => {
    expect(internals.roundHalfEven(-1.25, 1)).toBe(-1.2);
    expect(internals.roundHalfEven(-1.35, 1)).toBe(-1.4);
  });

  it('builds economic examples using rounded values', () => {
    const items: ClinicEconomicAgreement[] = [
      {
        serviceTypeId: 'service-1',
        price: 100.005,
        currency: 'BRL',
        payoutModel: 'fixed',
        payoutValue: 60.005,
      },
      {
        serviceTypeId: 'service-2',
        price: 200.0,
        currency: 'BRL',
        payoutModel: 'percentage',
        payoutValue: 33.333,
      },
    ];

    const summary = internals.buildEconomicExamples(items);

    expect(summary[0].patientPays).toBeCloseTo(100, 2);
    expect(summary[0].professionalReceives).toBeCloseTo(60, 2);
    expect(summary[0].remainder).toBeCloseTo(40, 2);
    expect(summary[1].professionalReceives).toBeCloseTo(66.67, 2);
  });
});

describe('ClinicPresenter fallback normalization', () => {
  const internals = ClinicPresenter as unknown as {
    mapGeneralSettingsPayload: (raw: Record<string, unknown>) => any;
    mapTeamSettingsPayload: (raw: Record<string, unknown>) => any;
    mapScheduleSettingsPayload: (raw: Record<string, unknown>) => any;
    mapServiceSettingsPayload: (raw: Record<string, unknown>) => any;
    mapPaymentSettingsPayload: (raw: Record<string, unknown>) => any;
    mapIntegrationSettingsPayload: (raw: Record<string, unknown>) => any;
    mapNotificationSettingsPayload: (raw: Record<string, unknown>) => any;
    mapBrandingSettingsPayload: (raw: Record<string, unknown>) => any;
    mapManagementTemplateInfo: (template?: ClinicManagementTemplateInfo) => any;
    mapTelemetry: (telemetry?: ClinicConfigurationTelemetry) => any;
  };

  it('omits optional fields in clinic details when absent', () => {
    const clinic: Clinic = {
      id: 'clinic-fallback',
      tenantId: 'tenant-1',
      name: 'Fallback Clinic',
      slug: 'fallback-clinic',
      status: 'active',
      primaryOwnerId: 'owner-1',
      holdSettings: {
        ttlMinutes: 30,
        minAdvanceMinutes: 10,
        allowOverbooking: false,
        resourceMatchingStrict: true,
      },
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
      metadata: {},
    };

    const details = ClinicPresenter.details(clinic);

    expect(details.document).toBeUndefined();
    expect(details.metadata).toBeUndefined();
  });

  it('defaults configuration payloads when version payload is undefined', () => {
    const makeVersion = (section: ClinicConfigurationSection): ClinicConfigurationVersion => ({
      id: `${section}-version`,
      clinicId: 'clinic-1',
      section,
      version: 1,
      payload: undefined as unknown as Record<string, unknown>,
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01T12:00:00Z'),
      autoApply: false,
    });

    const general = ClinicPresenter.generalSettings(makeVersion('general'));
    const team = ClinicPresenter.teamSettings(makeVersion('team'));
    const schedule = ClinicPresenter.scheduleSettings(makeVersion('schedule'));
    const services = ClinicPresenter.serviceSettings(makeVersion('services'));
    const payments = ClinicPresenter.paymentSettings(makeVersion('payments'));
    const integrations = ClinicPresenter.integrationSettings(makeVersion('integrations'));
    const notifications = ClinicPresenter.notificationSettings(makeVersion('notifications'));
    const branding = ClinicPresenter.brandingSettings(makeVersion('branding'));

    expect(general.payload.tradeName).toBe('');
    expect(team.payload.quotas).toEqual([]);
    expect(schedule.payload.workingDays).toEqual([]);
    expect(services.services).toEqual([]);
    expect(payments.payload.splitRules).toEqual([]);
    expect(integrations.payload.webhooks).toEqual([]);
    expect(notifications.payload.channels).toEqual([]);
    expect(branding.payload.palette).toBeUndefined();
  });

  it('normalizes service type optional fields', () => {
    const serviceType: ClinicServiceTypeDefinition = {
      id: 'svc-1',
      clinicId: 'clinic-1',
      name: 'Avaliação',
      slug: 'avaliacao',
      durationMinutes: 60,
      price: 200,
      currency: 'BRL',
      isActive: true,
      requiresAnamnesis: false,
      enableOnlineScheduling: true,
      minAdvanceMinutes: 30,
      cancellationPolicy: {
        type: 'percentage',
        windowMinutes: undefined,
        percentage: undefined,
        message: undefined,
      },
      eligibility: {
        allowNewPatients: true,
        allowExistingPatients: true,
        minimumAge: undefined,
        maximumAge: undefined,
        allowedTags: [],
      },
      customFields: [
        {
          label: 'Observações',
          fieldType: 'text',
          required: false,
          options: [],
        },
        {
          id: 'field-options',
          label: 'Motivo',
          fieldType: 'select',
          required: true,
          options: ['A'],
        },
      ],
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    const dto = ClinicPresenter.serviceType(serviceType);

    expect(dto.color).toBeUndefined();
    expect(dto.maxAdvanceMinutes).toBeUndefined();
    expect(dto.instructions).toBeUndefined();
    expect(dto.requiredDocuments).toEqual([]);
    expect(dto.cancellationPolicy.windowMinutes).toBeUndefined();
    expect(dto.eligibility?.allowedTags).toBeUndefined();
    expect(dto.customFields?.[0].id).toBeUndefined();
    expect(dto.customFields?.[0].options).toBeUndefined();
    expect(dto.customFields?.[1].options).toEqual(['A']);

    const minimal = ClinicPresenter.serviceType({
      ...serviceType,
      id: 'svc-2',
      name: 'Consulta',
      slug: 'consulta',
      createdAt: new Date('2025-01-02T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
      customFields: undefined,
    });

    expect(minimal.customFields).toEqual([]);
  });

  it('defaults alert payload when undefined', () => {
    const alert: ClinicAlert = {
      id: 'alert-coverage',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      type: 'revenue_drop',
      channel: 'push',
      triggeredBy: 'system',
      triggeredAt: new Date('2025-01-03T08:00:00Z'),
      payload: undefined as unknown as Record<string, unknown>,
    };

    const dto = ClinicPresenter.alert(alert);

    expect(dto.payload).toEqual({});
  });

  it('normalizes payment ledger optional values', () => {
    const ledger: ClinicPaymentLedger = {
      currency: 'BRL',
      lastUpdatedAt: new Date('2025-01-04T10:00:00Z').toISOString(),
      events: [
        {
          type: 'status_changed',
          gatewayStatus: 'approved',
          recordedAt: new Date('2025-01-04T10:00:00Z').toISOString(),
          sandbox: false,
        },
      ],
      settlement: {
        settledAt: new Date('2025-01-05T10:00:00Z').toISOString(),
        baseAmountCents: 10000,
        split: [
          { recipient: 'clinic', percentage: 50, amountCents: 5000 },
          { recipient: 'professional', percentage: 50, amountCents: 5000 },
        ],
        remainderCents: 0,
        gatewayStatus: 'settled',
      },
      refund: {
        refundedAt: new Date('2025-01-06T10:00:00Z').toISOString(),
        gatewayStatus: 'refunded',
      },
      chargeback: {
        chargebackAt: new Date('2025-01-07T10:00:00Z').toISOString(),
        gatewayStatus: 'chargeback',
      },
    };

    const dto = ClinicPresenter.paymentLedger({
      appointmentId: 'appt-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'settled',
      paymentTransactionId: 'txn-1',
      ledger,
    });

    expect(dto.ledger.settlement?.netAmountCents).toBeUndefined();
    expect(dto.ledger.refund?.netAmountCents).toBeUndefined();
    expect(dto.ledger.refund?.fingerprint).toBeUndefined();
    expect(dto.ledger.chargeback?.amountCents).toBeUndefined();
    expect(dto.ledger.metadata).toBeUndefined();
  });

  it('handles template overrides without applied version', () => {
    const template = internals.mapManagementTemplateInfo({
      templateClinicId: 'template-1',
      lastPropagationAt: new Date('2025-01-08T10:00:00Z'),
      lastTriggeredBy: 'user-1',
      sections: [
        {
          section: 'general',
          templateVersionId: 'tpl-v1',
          templateVersionNumber: 2,
          propagatedVersionId: 'cfg-v1',
          propagatedAt: new Date('2025-01-08T11:00:00Z'),
          triggeredBy: 'user-1',
          override: {
            overrideId: 'ovr-1',
            overrideVersion: 1,
            overrideHash: 'hash-v1',
            overrideUpdatedAt: new Date('2025-01-08T11:05:00Z'),
            overrideUpdatedBy: 'user-1',
          },
        },
      ],
    });

    expect(template?.sections[0].overrideAppliedVersionId).toBeUndefined();
  });

  it('sanitizes raw configuration payload fragments', () => {
    const generalPayload = internals.mapGeneralSettingsPayload({
      generalSettings: {
        document: {},
        address: {},
        contact: { socialLinks: 'invalid' },
      },
    });
    expect(generalPayload.document).toEqual({ type: '', value: '' });
    expect(generalPayload.address.number).toBeUndefined();
    expect(generalPayload.contact.socialLinks).toBeUndefined();
    expect(generalPayload.stateRegistration).toBeUndefined();
    expect(generalPayload.municipalRegistration).toBeUndefined();

    const generalWithRegistrations = internals.mapGeneralSettingsPayload({
      generalSettings: {
        stateRegistration: '12345',
        municipalRegistration: '67890',
        address: {},
        contact: {},
      },
    });
    expect(generalWithRegistrations.stateRegistration).toBe('12345');
    expect(generalWithRegistrations.municipalRegistration).toBe('67890');

    const teamPayload = internals.mapTeamSettingsPayload({
      teamSettings: {
        quotas: [
          { role: RolesEnum.MANAGER, limit: 'NaN' },
          { limit: 10 },
          { role: RolesEnum.SECRETARY },
        ],
        metadata: {},
      },
    });
    expect(teamPayload.quotas).toEqual([]);
    expect(teamPayload.defaultMemberStatus).toBe('pending_invitation');
    expect(teamPayload.metadata).toBeUndefined();

    const schedulePayload = internals.mapScheduleSettingsPayload({
      scheduleSettings: {
        workingDays: [
          { dayOfWeek: 1, active: true, intervals: [{ start: '08:00', end: '12:00' }] },
          { dayOfWeek: 2, active: false, intervals: [{ end: '15:00' }] },
          { dayOfWeek: 3, active: true },
        ],
        exceptionPeriods: [
          {
            id: 'exc-1',
            name: 'Fechado',
            appliesTo: 'clinic',
            start: '2025-02-01T10:00:00Z',
            end: '2025-02-01T12:00:00Z',
          },
          { name: 'invalid' },
        ],
        holidays: [
          { id: 'hol-1', name: 'Feriado', date: '2025-12-25', scope: 'national' },
          { name: 'Sem ID', date: '2025-12-24', scope: 'local' },
        ],
      },
    });
    expect(schedulePayload.exceptionPeriods).toHaveLength(1);
    expect(schedulePayload.holidays).toHaveLength(1);

    const scheduleWithMissingIds = internals.mapScheduleSettingsPayload({
      scheduleSettings: {
        exceptionPeriods: [
          {
            id: undefined,
            name: 'Sem identificador',
            appliesTo: 'clinic',
            start: '2025-03-01T10:00:00Z',
            end: '2025-03-01T12:00:00Z',
          },
          {
            id: 'sem-nome',
            appliesTo: 'clinic',
            start: '2025-03-02T10:00:00Z',
            end: '2025-03-02T12:00:00Z',
          },
        ],
      },
    });
    expect(scheduleWithMissingIds.exceptionPeriods).toEqual([]);

    const servicesPayload = internals.mapServiceSettingsPayload([
      {
        id: 'svc-raw',
        cancellationPolicy: { window: 120 },
        eligibility: { allowedTags: [] },
        requiredDocuments: [],
      },
      {
        serviceTypeId: 'svc-explicit',
        requiredDocuments: 'doc',
      },
      10,
    ] as unknown as Record<string, unknown>);
    expect(servicesPayload[0]).toMatchObject({
      serviceTypeId: 'svc-raw',
      name: '',
      slug: '',
      durationMinutes: 0,
      price: 0,
      currency: 'BRL',
      cancellationPolicyWindowMinutes: 120,
    });
    expect(servicesPayload[0]).not.toHaveProperty('allowedTags');
    expect(servicesPayload[1].serviceTypeId).toBe('svc-explicit');
    expect(servicesPayload[1]).not.toHaveProperty('requiredDocuments');
    expect(servicesPayload).toHaveLength(2);

    const paymentPayload = internals.mapPaymentSettingsPayload({
      paymentSettings: {
        splitRules: [
          { recipient: 'clinic', percentage: 50, order: 1 },
          { percentage: 25, order: 2 },
          { recipient: 'platform', order: 3 },
        ],
        antifraud: {},
        inadimplencyRule: { actions: ['notify', 123] },
        refundPolicy: {},
        cancellationPolicies: [{ type: 'window', message: 'texto' }, { windowMinutes: 10 }],
      },
    });
    expect(paymentPayload.splitRules).toHaveLength(1);
    expect(paymentPayload.inadimplencyRule.actions).toEqual(['notify', '123']);

    const integrationPayload = internals.mapIntegrationSettingsPayload({
      integrationSettings: {
        whatsapp: {
          templates: [
            { name: 'welcome', status: 'approved', lastUpdatedAt: 'invalid' },
            { status: 'pending' },
          ],
          quietHours: { start: '21:00', end: '07:00' },
        },
        googleCalendar: {},
        email: { tracking: {} },
        webhooks: [
          { url: 'https://example.com/webhook' },
          { event: 'asaas.payment', url: 'https://example.com/webhook', active: true },
        ],
        metadata: {},
      },
    });
    expect(integrationPayload.whatsapp.templates).toHaveLength(1);
    expect(integrationPayload.whatsapp.quietHours?.timezone).toBeUndefined();
    expect(integrationPayload.webhooks).toHaveLength(1);
    expect(integrationPayload.metadata).toBeUndefined();

    const notificationPayload = internals.mapNotificationSettingsPayload({
      notificationSettings: {
        channels: [
          {
            type: 'email',
            enabled: true,
            defaultEnabled: false,
            quietHours: { start: '21:00', end: '07:00' },
          },
          { enabled: true },
        ],
        templates: [
          {
            id: 'tpl-1',
            event: 'appointment.confirmed',
            channel: 'email',
            version: 'v1',
            variables: [{ name: 'patient', required: true }, { required: false }],
          },
          {
            id: 'tpl-2',
            event: 'payment.approved',
            channel: 'email',
            version: 'v1',
          },
          { id: 'tpl-invalid' },
        ],
        rules: [
          { event: 'appointment.confirmed', channels: ['email'], enabled: true },
          { channels: 'email' },
        ],
        quietHours: { start: '20:00', end: '06:00' },
        metadata: {},
      },
    });
    expect(notificationPayload.channels).toHaveLength(1);
    expect(notificationPayload.templates).toHaveLength(2);
    expect(notificationPayload.templates[1].variables).toEqual([]);
    expect(notificationPayload.rules).toHaveLength(1);
    expect(notificationPayload.quietHours?.timezone).toBeUndefined();
    expect(notificationPayload.metadata).toBeUndefined();

    const brandingPayload = internals.mapBrandingSettingsPayload({
      brandingSettings: {
        palette: {
          primary: undefined,
          accent: '#ff0000',
          surface: '#f5f5f5',
          text: '#101010',
        },
        typography: { primaryFont: undefined },
        preview: { previewUrl: 'https://example.com/preview' },
        metadata: {},
      },
    });
    expect(brandingPayload.palette?.primary).toBe('#1976d2');
    expect(brandingPayload.palette?.accent).toBe('#ff0000');
    expect(brandingPayload.palette?.surface).toBe('#f5f5f5');
    expect(brandingPayload.palette?.text).toBe('#101010');
    expect(brandingPayload.typography?.primaryFont).toBe('Inter');
    expect(brandingPayload.preview?.mode).toBe('draft');
    expect(brandingPayload.metadata).toBeUndefined();
  });

  it('omits telemetry optional fields when absent', () => {
    const telemetry = internals.mapTelemetry({
      section: 'general',
      state: 'idle',
      completionScore: 0.8,
    } as ClinicConfigurationTelemetry);

    expect(telemetry.state).toBe('idle');
    expect(telemetry.lastAttemptAt).toBeUndefined();
    expect(telemetry.lastUpdatedBy).toBeUndefined();
    expect(telemetry.pendingConflicts).toBeUndefined();
  });
});
