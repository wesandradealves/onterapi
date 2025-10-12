import {
  Clinic,
  ClinicConfigurationVersion,
  ClinicDashboardSnapshot,
  ClinicEconomicAgreement,
  ClinicHold,
  ClinicInvitation,
  ClinicMember,
  ClinicServiceCustomField,
  ClinicServiceTypeDefinition,
} from '../../../../domain/clinic/types/clinic.types';
import { ClinicConfigurationVersionResponseDto } from '../dtos/clinic-configuration-response.dto';
import { ClinicHoldResponseDto } from '../dtos/clinic-hold-response.dto';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import {
  ClinicGeneralSettingsPayloadDto,
  ClinicGeneralSettingsResponseDto,
} from '../dtos/clinic-general-settings-response.dto';
import { ClinicDetailsDto } from '../dtos/clinic-details.dto';
import { ClinicDashboardResponseDto } from '../dtos/clinic-dashboard-response.dto';
import {
  ClinicServiceCancellationPolicyDto,
  ClinicServiceCustomFieldDto,
  ClinicServiceEligibilityDto,
  ClinicServiceTypeResponseDto,
} from '../dtos/clinic-service-type-response.dto';
import {
  ClinicInvitationEconomicExampleDto,
  ClinicInvitationResponseDto,
} from '../dtos/clinic-invitation-response.dto';
import { ClinicMemberResponseDto } from '../dtos/clinic-member-response.dto';
import { ClinicHoldSettingsResponseDto } from '../dtos/clinic-hold-settings-response.dto';
import { ClinicTeamSettingsResponseDto } from '../dtos/clinic-team-settings-response.dto';

export class ClinicPresenter {
  static configuration(version: ClinicConfigurationVersion): ClinicConfigurationVersionResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      payload: version.payload,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt,
      notes: version.notes,
    };
  }

  static summary(clinic: Clinic): ClinicSummaryDto {
    const holdSettings = ClinicPresenter.mapHoldSettings(clinic);

    return {
      id: clinic.id,
      tenantId: clinic.tenantId,
      name: clinic.name,
      slug: clinic.slug,
      status: clinic.status,
      holdSettings,
    };
  }

  static details(clinic: Clinic): ClinicDetailsDto {
    const holdSettings = ClinicPresenter.mapHoldSettings(clinic);
    const configurationVersions: Record<string, string> = {};

    if (clinic.configurationVersions) {
      for (const [section, versionId] of Object.entries(clinic.configurationVersions)) {
        if (versionId) {
          configurationVersions[section] = versionId;
        }
      }
    }

    return {
      id: clinic.id,
      tenantId: clinic.tenantId,
      name: clinic.name,
      slug: clinic.slug,
      status: clinic.status,
      document: clinic.document
        ? {
            type: clinic.document.type,
            value: clinic.document.value,
          }
        : undefined,
      primaryOwnerId: clinic.primaryOwnerId,
      holdSettings,
      configurationVersions,
      metadata:
        clinic.metadata && Object.keys(clinic.metadata).length > 0 ? clinic.metadata : undefined,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
      deletedAt: clinic.deletedAt,
    };
  }

  static generalSettings(version: ClinicConfigurationVersion): ClinicGeneralSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      payload: ClinicPresenter.mapGeneralSettingsPayload(version.payload ?? {}),
    };
  }

  static holdSettings(clinic: Clinic): ClinicHoldSettingsResponseDto {
    return {
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
      holdSettings: ClinicPresenter.mapHoldSettings(clinic),
    };
  }

  static teamSettings(version: ClinicConfigurationVersion): ClinicTeamSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      payload: ClinicPresenter.mapTeamSettingsPayload(version.payload ?? {}),
    };
  }

  static hold(hold: ClinicHold): ClinicHoldResponseDto {
    return {
      id: hold.id,
      clinicId: hold.clinicId,
      tenantId: hold.tenantId,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      serviceTypeId: hold.serviceTypeId,
      start: hold.start,
      end: hold.end,
      ttlExpiresAt: hold.ttlExpiresAt,
      status: hold.status,
      locationId: hold.locationId,
      resources: hold.resources,
      idempotencyKey: hold.idempotencyKey,
      createdBy: hold.createdBy,
      confirmedAt: hold.confirmedAt,
      confirmedBy: hold.confirmedBy,
      cancelledAt: hold.cancelledAt,
      cancelledBy: hold.cancelledBy,
      cancellationReason: hold.cancellationReason,
      createdAt: hold.createdAt,
      updatedAt: hold.updatedAt,
      metadata: hold.metadata,
    };
  }

  static dashboard(snapshot: ClinicDashboardSnapshot): ClinicDashboardResponseDto {
    return {
      period: snapshot.period,
      totals: snapshot.totals,
      metrics: snapshot.metrics.map((metric) => ({ ...metric })),
      alerts: snapshot.alerts.map((alert) => ({ ...alert })),
    };
  }

  static serviceType(serviceType: ClinicServiceTypeDefinition): ClinicServiceTypeResponseDto {
    return {
      id: serviceType.id,
      clinicId: serviceType.clinicId,
      name: serviceType.name,
      slug: serviceType.slug,
      color: serviceType.color ?? undefined,
      durationMinutes: serviceType.durationMinutes,
      price: serviceType.price,
      currency: serviceType.currency,
      isActive: serviceType.isActive,
      requiresAnamnesis: serviceType.requiresAnamnesis,
      enableOnlineScheduling: serviceType.enableOnlineScheduling,
      minAdvanceMinutes: serviceType.minAdvanceMinutes,
      maxAdvanceMinutes: serviceType.maxAdvanceMinutes ?? undefined,
      cancellationPolicy: ClinicPresenter.mapServiceCancellationPolicy(
        serviceType.cancellationPolicy,
      ),
      eligibility: ClinicPresenter.mapServiceEligibility(serviceType.eligibility),
      instructions: serviceType.instructions ?? undefined,
      requiredDocuments: serviceType.requiredDocuments ?? [],
      customFields: (serviceType.customFields ?? []).map((field) =>
        ClinicPresenter.mapServiceCustomField(field),
      ),
      createdAt: serviceType.createdAt,
      updatedAt: serviceType.updatedAt,
    };
  }

  static invitation(invitation: ClinicInvitation, token?: string): ClinicInvitationResponseDto {
    return {
      id: invitation.id,
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      professionalId: invitation.professionalId,
      targetEmail: invitation.targetEmail,
      issuedBy: invitation.issuedBy,
      status: invitation.status,
      channel: invitation.channel,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      acceptedBy: invitation.acceptedBy,
      revokedAt: invitation.revokedAt,
      revokedBy: invitation.revokedBy,
      revocationReason: invitation.revocationReason ?? undefined,
      declinedAt: invitation.declinedAt,
      declinedBy: invitation.declinedBy,
      economicSummary: {
        items: invitation.economicSummary.items.map((item) => ({
          serviceTypeId: item.serviceTypeId,
          price: item.price,
          currency: item.currency,
          payoutModel: item.payoutModel,
          payoutValue: item.payoutValue,
        })),
        orderOfRemainders: invitation.economicSummary.orderOfRemainders,
        roundingStrategy: invitation.economicSummary.roundingStrategy,
        examples: ClinicPresenter.buildEconomicExamples(invitation.economicSummary.items),
      },
      metadata: invitation.metadata,
      token,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  static member(member: ClinicMember): ClinicMemberResponseDto {
    return {
      id: member.id,
      clinicId: member.clinicId,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role,
      status: member.status,
      scope: member.scope,
      preferences: member.preferences,
      joinedAt: member.joinedAt,
      suspendedAt: member.suspendedAt ?? undefined,
      endedAt: member.endedAt ?? undefined,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  private static mapServiceCancellationPolicy(
    policy: ClinicServiceTypeDefinition['cancellationPolicy'],
  ): ClinicServiceCancellationPolicyDto {
    return {
      type: policy.type,
      windowMinutes: policy.windowMinutes ?? undefined,
      percentage: policy.percentage ?? undefined,
      message: policy.message ?? undefined,
    };
  }

  private static mapServiceEligibility(
    eligibility: ClinicServiceTypeDefinition['eligibility'],
  ): ClinicServiceEligibilityDto {
    return {
      allowNewPatients: eligibility.allowNewPatients,
      allowExistingPatients: eligibility.allowExistingPatients,
      minimumAge: eligibility.minimumAge ?? undefined,
      maximumAge: eligibility.maximumAge ?? undefined,
      allowedTags:
        eligibility.allowedTags && eligibility.allowedTags.length > 0
          ? eligibility.allowedTags
          : undefined,
    };
  }

  private static mapServiceCustomField(
    field: ClinicServiceCustomField,
  ): ClinicServiceCustomFieldDto {
    return {
      id: field.id ?? undefined,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      options: field.options && field.options.length > 0 ? field.options : undefined,
    };
  }

  private static buildEconomicExamples(
    items: ClinicEconomicAgreement[],
  ): ClinicInvitationEconomicExampleDto[] {
    return items.map((item) => {
      const patientPays = ClinicPresenter.roundHalfEven(item.price);
      const professionalReceives =
        item.payoutModel === 'percentage'
          ? ClinicPresenter.roundHalfEven((item.price * item.payoutValue) / 100)
          : ClinicPresenter.roundHalfEven(item.payoutValue);
      const remainder = ClinicPresenter.roundHalfEven(patientPays - professionalReceives);

      return {
        currency: item.currency,
        patientPays,
        professionalReceives,
        remainder,
      };
    });
  }

  private static roundHalfEven(value: number, decimals = 2): number {
    const multiplier = 10 ** decimals;
    const scaled = value * multiplier;
    const floor = Math.floor(scaled);
    const diff = scaled - floor;

    if (Math.abs(diff - 0.5) < Number.EPSILON) {
      return (floor % 2 === 0 ? floor : floor + 1) / multiplier;
    }

    if (Math.abs(diff + 0.5) < Number.EPSILON) {
      return (floor % 2 === 0 ? floor : floor - 1) / multiplier;
    }

    return Math.round(scaled) / multiplier;
  }

  private static mapHoldSettings(clinic: Clinic): ClinicSummaryDto['holdSettings'] {
    return {
      ttlMinutes: clinic.holdSettings.ttlMinutes,
      minAdvanceMinutes: clinic.holdSettings.minAdvanceMinutes,
      maxAdvanceMinutes: clinic.holdSettings.maxAdvanceMinutes,
      allowOverbooking: clinic.holdSettings.allowOverbooking,
      overbookingThreshold: clinic.holdSettings.overbookingThreshold,
      resourceMatchingStrict: clinic.holdSettings.resourceMatchingStrict,
    };
  }

  private static mapGeneralSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicGeneralSettingsPayloadDto {
    const general =
      raw.generalSettings && typeof raw.generalSettings === 'object'
        ? (raw.generalSettings as Record<string, unknown>)
        : raw;

    const addressRaw = (general.address ?? {}) as Record<string, unknown>;
    const contactRaw = (general.contact ?? {}) as Record<string, unknown>;
    const documentRaw = general.document as Record<string, unknown> | undefined;

    const foundationRaw = general.foundationDate;
    let foundationDate: string | undefined;
    if (foundationRaw) {
      const parsed = new Date(foundationRaw as string);
      foundationDate = Number.isNaN(parsed.getTime())
        ? String(foundationRaw)
        : parsed.toISOString();
    }

    const address: ClinicGeneralSettingsPayloadDto['address'] = {
      zipCode: String(addressRaw.zipCode ?? ''),
      street: String(addressRaw.street ?? ''),
      number: addressRaw.number !== undefined ? String(addressRaw.number) : undefined,
      complement: addressRaw.complement !== undefined ? String(addressRaw.complement) : undefined,
      district: addressRaw.district !== undefined ? String(addressRaw.district) : undefined,
      city: String(addressRaw.city ?? ''),
      state: String(addressRaw.state ?? ''),
      country: addressRaw.country !== undefined ? String(addressRaw.country) : undefined,
    };

    const contact: ClinicGeneralSettingsPayloadDto['contact'] = {
      phone: contactRaw.phone !== undefined ? String(contactRaw.phone) : undefined,
      whatsapp: contactRaw.whatsapp !== undefined ? String(contactRaw.whatsapp) : undefined,
      email: contactRaw.email !== undefined ? String(contactRaw.email) : undefined,
      website: contactRaw.website !== undefined ? String(contactRaw.website) : undefined,
      socialLinks: Array.isArray(contactRaw.socialLinks)
        ? (contactRaw.socialLinks as unknown[]).map((item) => String(item))
        : undefined,
    };

    const document = documentRaw
      ? {
          type: String(documentRaw.type ?? ''),
          value: String(documentRaw.value ?? ''),
        }
      : undefined;

    return {
      tradeName: String(general.tradeName ?? ''),
      legalName: general.legalName !== undefined ? String(general.legalName) : undefined,
      document,
      stateRegistration:
        general.stateRegistration !== undefined ? String(general.stateRegistration) : undefined,
      municipalRegistration:
        general.municipalRegistration !== undefined
          ? String(general.municipalRegistration)
          : undefined,
      foundationDate,
      address,
      contact,
      notes: general.notes !== undefined ? String(general.notes) : undefined,
    };
  }

  private static mapTeamSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicTeamSettingsResponseDto['payload'] {
    const team =
      raw.teamSettings && typeof raw.teamSettings === 'object'
        ? (raw.teamSettings as Record<string, unknown>)
        : raw;

    const quotasRaw = Array.isArray(team.quotas) ? team.quotas : [];

    const quotas = quotasRaw
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const quota = item as Record<string, unknown>;
        const role = quota.role !== undefined ? String(quota.role) : undefined;
        const limitValue = quota.limit !== undefined ? Number(quota.limit) : undefined;

        if (!role || limitValue === undefined || Number.isNaN(limitValue)) {
          return null;
        }

        return {
          role,
          limit: limitValue,
        };
      })
      .filter((item): item is { role: string; limit: number } => item !== null);

    const allowExternalInvitations = Boolean(team.allowExternalInvitations);

    const defaultMemberStatus =
      team.defaultMemberStatus !== undefined
        ? String(team.defaultMemberStatus)
        : 'pending_invitation';

    const metadata =
      team.metadata &&
      typeof team.metadata === 'object' &&
      Object.keys(team.metadata as Record<string, unknown>).length > 0
        ? (team.metadata as Record<string, unknown>)
        : undefined;

    return {
      quotas,
      allowExternalInvitations,
      defaultMemberStatus,
      metadata,
    };
  }
}
