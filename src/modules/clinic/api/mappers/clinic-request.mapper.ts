import {
  ClinicGeneralSettings,
  ClinicHoldRequestInput,
  ClinicHoldSettings,
  ClinicDashboardQuery,
  UpdateClinicGeneralSettingsInput,
  UpdateClinicHoldSettingsInput,
} from '../../../../domain/clinic/types/clinic.types';
import { UpdateClinicGeneralSettingsSchema } from '../schemas/update-clinic-general-settings.schema';
import { UpdateClinicHoldSettingsSchema } from '../schemas/update-clinic-hold-settings.schema';
import { CreateClinicHoldSchema } from '../schemas/create-clinic-hold.schema';
import { GetClinicDashboardSchema } from '../schemas/get-clinic-dashboard.schema';

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

  return {
    tenantId: body.tenantId ?? context.tenantId,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    includeForecast: body.includeForecast,
    includeComparisons: body.includeComparisons,
  };
};
