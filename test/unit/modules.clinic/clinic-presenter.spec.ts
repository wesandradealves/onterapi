import { ClinicPresenter } from '../../../src/modules/clinic/api/presenters/clinic.presenter';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import {
  Clinic,
  ClinicAlert,
  ClinicAppointmentConfirmationResult,
  ClinicConfigurationVersion,
  ClinicDashboardComparison,
  ClinicDashboardForecast,
  ClinicDashboardSnapshot,
  ClinicEconomicAgreement,
  ClinicHold,
  ClinicInvitation,
  ClinicManagementOverview,
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
      customFields: [
        { id: 'field-1', label: 'Observação', fieldType: 'text', required: false },
      ],
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
