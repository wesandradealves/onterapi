import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import {
  ClinicAlertType,
  ClinicBrandingSettingsConfig,
  ClinicDashboardQuery,
  ClinicGeneralSettings,
  ClinicHoldConfirmationInput,
  ClinicHoldRequestInput,
  ClinicHoldSettings,
  ClinicInadimplencyAction,
  ClinicIntegrationSettingsConfig,
  ClinicManagementAlertsQuery,
  ClinicManagementOverviewQuery,
  ClinicNotificationSettingsConfig,
  ClinicPaymentSettings,
  ClinicScheduleSettings,
  ClinicServiceSettings,
  ClinicStaffRole,
  ClinicTeamSettings,
  ClinicTemplatePropagationInput,
  ResolveClinicAlertInput,
  TransferClinicProfessionalInput,
  UpdateClinicBrandingSettingsInput,
  UpdateClinicGeneralSettingsInput,
  UpdateClinicHoldSettingsInput,
  UpdateClinicIntegrationSettingsInput,
  UpdateClinicNotificationSettingsInput,
  UpdateClinicPaymentSettingsInput,
  UpdateClinicScheduleSettingsInput,
  UpdateClinicServiceSettingsInput,
  UpdateClinicTeamSettingsInput,
} from '../../../../domain/clinic/types/clinic.types';
import { UpdateClinicGeneralSettingsSchema } from '../schemas/update-clinic-general-settings.schema';
import { UpdateClinicHoldSettingsSchema } from '../schemas/update-clinic-hold-settings.schema';
import { UpdateClinicTeamSettingsSchema } from '../schemas/update-clinic-team-settings.schema';
import { UpdateClinicScheduleSettingsSchema } from '../schemas/update-clinic-schedule-settings.schema';
import { UpdateClinicServiceSettingsSchema } from '../schemas/update-clinic-service-settings.schema';
import { UpdateClinicPaymentSettingsSchema } from '../schemas/update-clinic-payment-settings.schema';
import { UpdateClinicIntegrationSettingsSchema } from '../schemas/update-clinic-integration-settings.schema';
import { UpdateClinicNotificationSettingsSchema } from '../schemas/update-clinic-notification-settings.schema';
import { UpdateClinicBrandingSettingsSchema } from '../schemas/update-clinic-branding-settings.schema';
import { CreateClinicHoldSchema } from '../schemas/create-clinic-hold.schema';
import { GetClinicDashboardSchema } from '../schemas/get-clinic-dashboard.schema';
import { ConfirmClinicHoldSchema } from '../schemas/confirm-clinic-hold.schema';
import { PropagateClinicTemplateSchema } from '../schemas/propagate-clinic-template.schema';
import { TransferClinicProfessionalSchema } from '../schemas/clinic-professional-transfer.schema';
import { GetClinicManagementOverviewSchema } from '../schemas/get-clinic-management-overview.schema';
import { GetClinicManagementAlertsSchema } from '../schemas/get-clinic-management-alerts.schema';
import { ResolveClinicAlertSchema } from '../schemas/resolve-clinic-alert.schema';

export interface ClinicRequestContext {
  tenantId: string;
  userId: string;
}

export const toUpdateClinicGeneralSettingsInput = (
  clinicId: string,
  body: UpdateClinicGeneralSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicGeneralSettingsInput => {
  const foundationDate = body.generalSettings.foundationDate
    ? new Date(body.generalSettings.foundationDate)
    : undefined;

  const settings: ClinicGeneralSettings = {
    tradeName: body.generalSettings.tradeName,
    legalName: body.generalSettings.legalName,
    document: body.generalSettings.document,
    stateRegistration: body.generalSettings.stateRegistration,
    municipalRegistration: body.generalSettings.municipalRegistration,
    foundationDate,
    address: body.generalSettings.address,
    contact: body.generalSettings.contact,
    notes: body.generalSettings.notes,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    settings,
  };
};

export const toUpdateClinicTeamSettingsInput = (
  clinicId: string,
  body: UpdateClinicTeamSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicTeamSettingsInput => {
  const teamSettings: ClinicTeamSettings = {
    quotas: body.teamSettings.quotas.map((quota) => {
      const role = RolesEnum[quota.role as keyof typeof RolesEnum] as ClinicStaffRole;

      return {
        role,
        limit: quota.limit,
      };
    }),
    allowExternalInvitations: body.teamSettings.allowExternalInvitations,
    defaultMemberStatus: body.teamSettings.defaultMemberStatus ?? 'pending_invitation',
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    teamSettings,
  };
};

export const toUpdateClinicHoldSettingsInput = (
  clinicId: string,
  body: UpdateClinicHoldSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicHoldSettingsInput => {
  const holdSettings: ClinicHoldSettings = {
    ttlMinutes: body.holdSettings.ttlMinutes,
    minAdvanceMinutes: body.holdSettings.minAdvanceMinutes,
    maxAdvanceMinutes: body.holdSettings.maxAdvanceMinutes,
    allowOverbooking: body.holdSettings.allowOverbooking,
    overbookingThreshold: body.holdSettings.overbookingThreshold,
    resourceMatchingStrict: body.holdSettings.resourceMatchingStrict,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    holdSettings,
  };
};

export const toUpdateClinicScheduleSettingsInput = (
  clinicId: string,
  body: UpdateClinicScheduleSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicScheduleSettingsInput => {
  const workingDays: ClinicScheduleSettings['workingDays'] = body.scheduleSettings.workingDays.map(
    (day) => ({
      dayOfWeek: day.dayOfWeek,
      active: day.active,
      intervals: day.intervals.map((interval) => ({
        start: interval.start,
        end: interval.end,
      })),
    }),
  );

  const exceptionPeriods: ClinicScheduleSettings['exceptionPeriods'] = (
    body.scheduleSettings.exceptionPeriods ?? []
  ).map((period) => ({
    id: period.id,
    name: period.name,
    appliesTo: period.appliesTo,
    start: new Date(period.start),
    end: new Date(period.end),
    resourceIds: period.resourceIds,
  }));

  const holidays: ClinicScheduleSettings['holidays'] = (body.scheduleSettings.holidays ?? []).map(
    (holiday) => ({
      id: holiday.id,
      name: holiday.name,
      date: new Date(holiday.date),
      scope: holiday.scope,
    }),
  );

  const scheduleSettings: ClinicScheduleSettings = {
    timezone: body.scheduleSettings.timezone,
    workingDays,
    exceptionPeriods,
    holidays,
    autosaveIntervalSeconds: body.scheduleSettings.autosaveIntervalSeconds,
    conflictResolution: body.scheduleSettings.conflictResolution,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    scheduleSettings,
  };
};

export const toUpdateClinicServiceSettingsInput = (
  clinicId: string,
  body: UpdateClinicServiceSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicServiceSettingsInput => {
  const services: ClinicServiceSettings['services'] = body.serviceSettings.services.map(
    (service) => ({
      serviceTypeId: service.serviceTypeId,
      name: service.name,
      slug: service.slug,
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
      isActive: service.isActive,
      requiresAnamnesis: service.requiresAnamnesis,
      enableOnlineScheduling: service.enableOnlineScheduling,
      minAdvanceMinutes: service.minAdvanceMinutes,
      maxAdvanceMinutes: service.maxAdvanceMinutes,
      cancellationPolicyType: service.cancellationPolicy?.type,
      cancellationPolicyWindowMinutes: service.cancellationPolicy?.windowMinutes,
      cancellationPolicyPercentage: service.cancellationPolicy?.percentage,
      allowNewPatients: service.eligibility?.allowNewPatients ?? true,
      allowExistingPatients: service.eligibility?.allowExistingPatients ?? true,
      minimumAge: service.eligibility?.minimumAge,
      maximumAge: service.eligibility?.maximumAge,
      allowedTags: service.eligibility?.allowedTags,
      color: service.color,
      instructions: service.instructions,
      requiredDocuments: service.requiredDocuments,
    }),
  );

  const serviceSettings: ClinicServiceSettings = {
    services,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    serviceSettings,
  };
};

export const toUpdateClinicPaymentSettingsInput = (
  clinicId: string,
  body: UpdateClinicPaymentSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicPaymentSettingsInput => {
  const splitRules: ClinicPaymentSettings['splitRules'] = body.paymentSettings.splitRules.map(
    (rule) => ({
      recipient: rule.recipient,
      percentage: rule.percentage,
      order: rule.order,
    }),
  );

  const antifraud =
    body.paymentSettings.antifraud !== undefined
      ? {
          enabled: body.paymentSettings.antifraud.enabled,
          provider: body.paymentSettings.antifraud.provider,
          thresholdAmount: body.paymentSettings.antifraud.thresholdAmount,
        }
      : { enabled: false };

  const inadimplency =
    body.paymentSettings.inadimplencyRule !== undefined
      ? {
          gracePeriodDays: body.paymentSettings.inadimplencyRule.gracePeriodDays,
          penaltyPercentage: body.paymentSettings.inadimplencyRule.penaltyPercentage,
          dailyInterestPercentage: body.paymentSettings.inadimplencyRule.dailyInterestPercentage,
          maxRetries: body.paymentSettings.inadimplencyRule.maxRetries,
          actions: (body.paymentSettings.inadimplencyRule.actions ?? []).map(
            (action) => action as ClinicInadimplencyAction,
          ),
        }
      : {
          gracePeriodDays: 0,
          actions: [] as ClinicInadimplencyAction[],
        };

  const cancellationPolicies = body.paymentSettings.cancellationPolicies.map((policy) => ({
    type: policy.type,
    windowMinutes: policy.windowMinutes,
    percentage: policy.percentage,
    message: policy.message,
  }));

  const paymentSettings: ClinicPaymentSettings = {
    provider: body.paymentSettings.provider,
    credentialsId: body.paymentSettings.credentialsId,
    sandboxMode: body.paymentSettings.sandboxMode,
    splitRules,
    roundingStrategy: body.paymentSettings.roundingStrategy,
    antifraud,
    inadimplencyRule: inadimplency,
    refundPolicy: {
      type: body.paymentSettings.refundPolicy.type,
      processingTimeHours: body.paymentSettings.refundPolicy.processingTimeHours,
      feePercentage: body.paymentSettings.refundPolicy.feePercentage,
      allowPartialRefund: body.paymentSettings.refundPolicy.allowPartialRefund,
    },
    cancellationPolicies,
    bankAccountId: body.paymentSettings.bankAccountId,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    paymentSettings,
  };
};

export const toUpdateClinicIntegrationSettingsInput = (
  clinicId: string,
  body: UpdateClinicIntegrationSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicIntegrationSettingsInput => {
  const integration: ClinicIntegrationSettingsConfig = {
    ...body.integrationSettings,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    integrationSettings: integration,
  };
};

export const toUpdateClinicNotificationSettingsInput = (
  clinicId: string,
  body: UpdateClinicNotificationSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicNotificationSettingsInput => {
  const notificationSettings: ClinicNotificationSettingsConfig = {
    channels: body.notificationSettings.channels ?? [],
    templates: body.notificationSettings.templates ?? [],
    rules: body.notificationSettings.rules ?? [],
    quietHours: body.notificationSettings.quietHours,
    events: body.notificationSettings.events,
    metadata: body.notificationSettings.metadata,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    notificationSettings,
  };
};

export const toUpdateClinicBrandingSettingsInput = (
  clinicId: string,
  body: UpdateClinicBrandingSettingsSchema,
  context: ClinicRequestContext,
): UpdateClinicBrandingSettingsInput => {
  const brandingSettings: ClinicBrandingSettingsConfig = {
    logoUrl: body.brandingSettings.logoUrl,
    darkLogoUrl: body.brandingSettings.darkLogoUrl,
    palette: body.brandingSettings.palette,
    typography: body.brandingSettings.typography,
    customCss: body.brandingSettings.customCss,
    applyMode: body.brandingSettings.applyMode,
    preview: body.brandingSettings.preview,
    versionLabel: body.brandingSettings.versionLabel,
    metadata: body.brandingSettings.metadata,
  };

  return {
    clinicId,
    tenantId: body.tenantId ?? context.tenantId,
    requestedBy: context.userId,
    brandingSettings,
  };
};

export const toCreateClinicHoldInput = (
  clinicId: string,
  body: CreateClinicHoldSchema,
  context: ClinicRequestContext,
): ClinicHoldRequestInput => ({
  clinicId,
  tenantId: body.tenantId ?? context.tenantId,
  requestedBy: context.userId,
  professionalId: body.professionalId,
  patientId: body.patientId,
  serviceTypeId: body.serviceTypeId,
  start: new Date(body.start),
  end: new Date(body.end),
  locationId: body.locationId,
  resources: body.resources,
  idempotencyKey: body.idempotencyKey,
  metadata: body.metadata,
});

export const toConfirmClinicHoldInput = (
  clinicId: string,
  holdId: string,
  body: ConfirmClinicHoldSchema,
  context: ClinicRequestContext,
): ClinicHoldConfirmationInput => ({
  clinicId,
  holdId,
  tenantId: body.tenantId ?? context.tenantId,
  confirmedBy: context.userId,
  paymentTransactionId: body.paymentTransactionId,
  idempotencyKey: body.idempotencyKey,
});

export const toClinicDashboardQuery = (
  body: GetClinicDashboardSchema,
  context: ClinicRequestContext,
): ClinicDashboardQuery => {
  const filters: ClinicDashboardQuery['filters'] = {};

  if (body.clinicIds && body.clinicIds.length > 0) {
    filters.clinicIds = body.clinicIds;
  }

  if (body.from) {
    filters.from = new Date(body.from);
  }

  if (body.to) {
    filters.to = new Date(body.to);
  }

  const comparisonMetrics =
    body.comparisonMetrics && body.comparisonMetrics.length > 0
      ? Array.from(new Set(body.comparisonMetrics))
      : undefined;

  return {
    tenantId: body.tenantId ?? context.tenantId,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    includeForecast: body.includeForecast,
    includeComparisons: body.includeComparisons,
    comparisonMetrics,
  };
};

const normalizeBooleanFlag = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
};

export const toClinicManagementOverviewQuery = (
  body: GetClinicManagementOverviewSchema,
  context: ClinicRequestContext,
): ClinicManagementOverviewQuery => {
  const filters: ClinicManagementOverviewQuery['filters'] | undefined = (() => {
    const result: ClinicManagementOverviewQuery['filters'] = {};

    if (body.clinicIds && body.clinicIds.length > 0) {
      result.clinicIds = body.clinicIds;
    }

    if (body.status && body.status.length > 0) {
      result.status = body.status;
    }

    if (body.from) {
      result.from = new Date(body.from);
    }

    if (body.to) {
      result.to = new Date(body.to);
    }

    return Object.keys(result).length > 0 ? result : undefined;
  })();

  return {
    tenantId: body.tenantId ?? context.tenantId,
    filters,
    includeForecast: normalizeBooleanFlag(body.includeForecast),
    includeComparisons: normalizeBooleanFlag(body.includeComparisons),
    includeAlerts: normalizeBooleanFlag(body.includeAlerts),
    includeTeamDistribution: normalizeBooleanFlag(body.includeTeamDistribution),
    includeFinancials: normalizeBooleanFlag(body.includeFinancials),
  };
};

export const toPropagateClinicTemplateInput = (
  templateClinicId: string,
  body: PropagateClinicTemplateSchema,
  context: ClinicRequestContext,
): ClinicTemplatePropagationInput => {
  const uniqueTargets = Array.from(
    new Set((body.targetClinicIds ?? []).filter((id) => id !== templateClinicId)),
  );

  return {
    tenantId: body.tenantId ?? context.tenantId,
    templateClinicId,
    targetClinicIds: uniqueTargets,
    sections: body.sections,
    versionNotes: body.versionNotes,
    triggeredBy: context.userId,
  };
};

export const toTransferClinicProfessionalInput = (
  body: TransferClinicProfessionalSchema,
  context: ClinicRequestContext,
): TransferClinicProfessionalInput => ({
  tenantId: body.tenantId ?? context.tenantId,
  professionalId: body.professionalId,
  fromClinicId: body.fromClinicId,
  toClinicId: body.toClinicId,
  effectiveDate: new Date(body.effectiveDate),
  transferPatients: body.transferPatients ?? false,
  performedBy: context.userId,
});

export const toClinicManagementAlertsQuery = (
  body: GetClinicManagementAlertsSchema,
  context: ClinicRequestContext,
): ClinicManagementAlertsQuery => {
  const clinicIds = new Set<string>();

  if (body.clinicId) {
    clinicIds.add(body.clinicId);
  }

  if (body.clinicIds && body.clinicIds.length > 0) {
    body.clinicIds.forEach((id) => clinicIds.add(id));
  }

  return {
    tenantId: body.tenantId ?? context.tenantId,
    clinicIds: clinicIds.size > 0 ? Array.from(clinicIds) : undefined,
    types:
      body.types && body.types.length > 0
        ? Array.from(new Set(body.types.map((type) => type as ClinicAlertType)))
        : undefined,
    activeOnly: normalizeBooleanFlag(body.activeOnly),
    limit: body.limit,
  };
};

export const toResolveClinicAlertInput = (
  alertId: string,
  body: ResolveClinicAlertSchema,
  context: ClinicRequestContext,
): ResolveClinicAlertInput => ({
  tenantId: context.tenantId,
  alertId,
  resolvedBy: context.userId,
  resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : undefined,
});
