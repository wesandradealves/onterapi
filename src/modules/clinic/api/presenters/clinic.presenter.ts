import {
  Clinic,
  ClinicAppointmentConfirmationResult,
  ClinicConfigurationVersion,
  ClinicDashboardSnapshot,
  ClinicEconomicAgreement,
  ClinicHold,
  ClinicInvitation,
  ClinicMember,
  ClinicPaymentLedger,
  ClinicPaymentLedgerEventEntry,
  ClinicPaymentSplitAllocation,
  ClinicServiceCustomField,
  ClinicServiceTypeDefinition,
  ClinicPaymentLedgerChargeback as DomainClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerRefund as DomainClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement as DomainClinicPaymentLedgerSettlement,
} from '../../../../domain/clinic/types/clinic.types';
import { ClinicConfigurationVersionResponseDto } from '../dtos/clinic-configuration-response.dto';
import { ClinicHoldResponseDto } from '../dtos/clinic-hold-response.dto';
import { ClinicAppointmentConfirmationResponseDto } from '../dtos/clinic-appointment-confirmation-response.dto';
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
import {
  ClinicServiceSettingsItemDto,
  ClinicServiceSettingsResponseDto,
} from '../dtos/clinic-service-settings-response.dto';
import {
  ClinicScheduleExceptionPeriodDto,
  ClinicScheduleSettingsResponseDto,
} from '../dtos/clinic-schedule-settings-response.dto';
import { ClinicPaymentSettingsResponseDto } from '../dtos/clinic-payment-settings-response.dto';
import {
  ClinicIntegrationSettingsResponseDto,
  ClinicIntegrationWebhookDto,
  ClinicIntegrationWhatsAppTemplateDto,
} from '../dtos/clinic-integration-settings-response.dto';
import {
  ClinicNotificationSettingsChannelDto,
  ClinicNotificationSettingsQuietHoursDto,
  ClinicNotificationSettingsResponseDto,
  ClinicNotificationSettingsRuleDto,
  ClinicNotificationSettingsTemplateDto,
  ClinicNotificationSettingsTemplateVariableDto,
} from '../dtos/clinic-notification-settings-response.dto';
import { ClinicBrandingSettingsResponseDto } from '../dtos/clinic-branding-settings-response.dto';
import { ClinicPaymentLedgerListResponseDto } from '../dtos/clinic-payment-ledger-list-response.dto';
import {
  ClinicPaymentLedgerChargebackDto,
  ClinicPaymentLedgerDto,
  ClinicPaymentLedgerEventDto,
  ClinicPaymentLedgerRefundDto,
  ClinicPaymentLedgerResponseDto,
  ClinicPaymentLedgerSettlementDto,
  ClinicPaymentSplitAllocationDto,
} from '../dtos/clinic-payment-ledger-response.dto';
import {
  ClinicTemplatePropagationResponseDto,
  ClinicTemplatePropagationSectionDto,
} from '../dtos/clinic-template-propagation-response.dto';

export class ClinicPresenter {
  static configuration(version: ClinicConfigurationVersion): ClinicConfigurationVersionResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt,
      notes: version.notes,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: version.payload,
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

  static templatePropagation(clinic: Clinic): ClinicTemplatePropagationResponseDto {
    const rawMetadata =
      clinic.metadata && typeof clinic.metadata === 'object' ? clinic.metadata : {};
    const propagationRaw = (
      rawMetadata.templatePropagation && typeof rawMetadata.templatePropagation === 'object'
        ? rawMetadata.templatePropagation
        : {}
    ) as Record<string, unknown>;

    const sectionsRaw =
      propagationRaw.sections && typeof propagationRaw.sections === 'object'
        ? (propagationRaw.sections as Record<string, unknown>)
        : {};

    const sections: ClinicTemplatePropagationSectionDto[] = [];

    Object.entries(sectionsRaw).forEach(([section, value]) => {
      if (!value || typeof value !== 'object') {
        return;
      }
      const sectionData = value as Record<string, unknown>;
      const templateVersionId = sectionData.templateVersionId;
      const propagatedVersionId = sectionData.propagatedVersionId;
      const propagatedAt = ClinicPresenter.toDate(sectionData.propagatedAt);
      const triggeredBy = sectionData.triggeredBy;

      if (
        typeof templateVersionId !== 'string' ||
        typeof propagatedVersionId !== 'string' ||
        !propagatedAt ||
        typeof triggeredBy !== 'string'
      ) {
        return;
      }

      sections.push({
        section,
        templateVersionId,
        propagatedVersionId,
        propagatedAt,
        triggeredBy,
      });
    });

    sections.sort((a, b) => b.propagatedAt.getTime() - a.propagatedAt.getTime());

    return {
      templateClinicId:
        typeof propagationRaw.templateClinicId === 'string'
          ? propagationRaw.templateClinicId
          : undefined,
      lastPropagationAt: ClinicPresenter.toDate(propagationRaw.lastPropagationAt),
      lastTriggeredBy:
        typeof propagationRaw.lastTriggeredBy === 'string'
          ? propagationRaw.lastTriggeredBy
          : undefined,
      sections,
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
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
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
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: ClinicPresenter.mapTeamSettingsPayload(version.payload ?? {}),
    };
  }

  static scheduleSettings(version: ClinicConfigurationVersion): ClinicScheduleSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: ClinicPresenter.mapScheduleSettingsPayload(version.payload ?? {}),
    };
  }

  static serviceSettings(version: ClinicConfigurationVersion): ClinicServiceSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      services: ClinicPresenter.mapServiceSettingsPayload(version.payload ?? {}),
    };
  }

  static paymentSettings(version: ClinicConfigurationVersion): ClinicPaymentSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: ClinicPresenter.mapPaymentSettingsPayload(version.payload ?? {}),
    };
  }

  static integrationSettings(
    version: ClinicConfigurationVersion,
  ): ClinicIntegrationSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: ClinicPresenter.mapIntegrationSettingsPayload(version.payload ?? {}),
    };
  }

  static notificationSettings(
    version: ClinicConfigurationVersion,
  ): ClinicNotificationSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: ClinicPresenter.mapNotificationSettingsPayload(version.payload ?? {}),
    };
  }

  static brandingSettings(version: ClinicConfigurationVersion): ClinicBrandingSettingsResponseDto {
    return {
      id: version.id,
      clinicId: version.clinicId,
      section: version.section,
      version: version.version,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      appliedAt: version.appliedAt ?? undefined,
      notes: version.notes ?? undefined,
      state: ClinicPresenter.resolveConfigurationState(version),
      autoApply: version.autoApply,
      payload: ClinicPresenter.mapBrandingSettingsPayload(version.payload ?? {}),
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

  static holdConfirmation(
    confirmation: ClinicAppointmentConfirmationResult,
  ): ClinicAppointmentConfirmationResponseDto {
    return {
      appointmentId: confirmation.appointmentId,
      clinicId: confirmation.clinicId,
      holdId: confirmation.holdId,
      paymentTransactionId: confirmation.paymentTransactionId,
      confirmedAt: confirmation.confirmedAt,
      paymentStatus: confirmation.paymentStatus,
    };
  }

  static dashboard(snapshot: ClinicDashboardSnapshot): ClinicDashboardResponseDto {
    return {
      period: snapshot.period,
      totals: snapshot.totals,
      metrics: snapshot.metrics.map((metric) => ({ ...metric })),
      alerts: snapshot.alerts.map((alert) => ({ ...alert })),
      comparisons: snapshot.comparisons
        ? {
            period: { ...snapshot.comparisons.period },
            previousPeriod: { ...snapshot.comparisons.previousPeriod },
            metrics: snapshot.comparisons.metrics.map((metric) => ({
              metric: metric.metric,
              entries: metric.entries.map((entry) => ({ ...entry })),
            })),
          }
        : undefined,
      forecast: snapshot.forecast
        ? {
            period: { ...snapshot.forecast.period },
            projections: snapshot.forecast.projections.map((projection) => ({ ...projection })),
          }
        : undefined,
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

  static paymentLedger(data: {
    appointmentId: string;
    clinicId: string;
    tenantId: string;
    paymentStatus: ClinicPaymentLedgerResponseDto['paymentStatus'];
    paymentTransactionId: string;
    ledger: ClinicPaymentLedger;
  }): ClinicPaymentLedgerResponseDto {
    return {
      appointmentId: data.appointmentId,
      clinicId: data.clinicId,
      tenantId: data.tenantId,
      paymentStatus: data.paymentStatus,
      paymentTransactionId: data.paymentTransactionId,
      ledger: ClinicPresenter.mapPaymentLedger(data.ledger),
    };
  }

  static paymentLedgerList(
    items: Array<{
      appointmentId: string;
      clinicId: string;
      tenantId: string;
      serviceTypeId: string;
      professionalId: string;
      paymentStatus: ClinicPaymentLedgerResponseDto['paymentStatus'];
      paymentTransactionId: string;
      confirmedAt: Date;
      ledger: ClinicPaymentLedger;
    }>,
  ): ClinicPaymentLedgerListResponseDto {
    return {
      items: items.map((item) => ({
        appointmentId: item.appointmentId,
        clinicId: item.clinicId,
        tenantId: item.tenantId,
        serviceTypeId: item.serviceTypeId,
        professionalId: item.professionalId,
        paymentStatus: item.paymentStatus,
        paymentTransactionId: item.paymentTransactionId,
        confirmedAt: item.confirmedAt,
        ledger: ClinicPresenter.mapPaymentLedger(item.ledger),
      })),
    };
  }

  private static mapPaymentLedger(ledger: ClinicPaymentLedger): ClinicPaymentLedgerDto {
    return {
      currency: ledger.currency,
      lastUpdatedAt: ledger.lastUpdatedAt,
      events: ledger.events.map((event) => ClinicPresenter.mapPaymentLedgerEvent(event)),
      settlement: ledger.settlement
        ? ClinicPresenter.mapPaymentLedgerSettlement(ledger.settlement)
        : undefined,
      refund: ledger.refund ? ClinicPresenter.mapPaymentLedgerRefund(ledger.refund) : undefined,
      chargeback: ledger.chargeback
        ? ClinicPresenter.mapPaymentLedgerChargeback(ledger.chargeback)
        : undefined,
      metadata: ledger.metadata ?? undefined,
    };
  }

  private static mapPaymentLedgerEvent(
    event: ClinicPaymentLedgerEventEntry,
  ): ClinicPaymentLedgerEventDto {
    return {
      type: event.type,
      gatewayStatus: event.gatewayStatus,
      eventType: event.eventType ?? undefined,
      recordedAt: event.recordedAt,
      fingerprint: event.fingerprint ?? undefined,
      sandbox: event.sandbox,
      metadata: event.metadata ?? undefined,
    };
  }

  private static mapPaymentLedgerSettlement(
    settlement: DomainClinicPaymentLedgerSettlement,
  ): ClinicPaymentLedgerSettlementDto {
    return {
      settledAt: settlement.settledAt,
      baseAmountCents: settlement.baseAmountCents,
      netAmountCents: settlement.netAmountCents ?? undefined,
      split: settlement.split.map((allocation) =>
        ClinicPresenter.mapPaymentSplitAllocation(allocation),
      ),
      remainderCents: settlement.remainderCents,
      fingerprint: settlement.fingerprint ?? undefined,
      gatewayStatus: settlement.gatewayStatus,
    };
  }

  private static mapPaymentLedgerRefund(
    refund: DomainClinicPaymentLedgerRefund,
  ): ClinicPaymentLedgerRefundDto {
    return {
      refundedAt: refund.refundedAt,
      amountCents: refund.amountCents ?? undefined,
      netAmountCents: refund.netAmountCents ?? undefined,
      fingerprint: refund.fingerprint ?? undefined,
      gatewayStatus: refund.gatewayStatus,
    };
  }

  private static mapPaymentLedgerChargeback(
    chargeback: DomainClinicPaymentLedgerChargeback,
  ): ClinicPaymentLedgerChargebackDto {
    return {
      chargebackAt: chargeback.chargebackAt,
      amountCents: chargeback.amountCents ?? undefined,
      netAmountCents: chargeback.netAmountCents ?? undefined,
      fingerprint: chargeback.fingerprint ?? undefined,
      gatewayStatus: chargeback.gatewayStatus,
    };
  }

  private static mapPaymentSplitAllocation(
    allocation: ClinicPaymentSplitAllocation,
  ): ClinicPaymentSplitAllocationDto {
    return {
      recipient: allocation.recipient,
      percentage: allocation.percentage,
      amountCents: allocation.amountCents,
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

  private static mapScheduleSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicScheduleSettingsResponseDto['payload'] {
    const schedule =
      raw.scheduleSettings && typeof raw.scheduleSettings === 'object'
        ? (raw.scheduleSettings as Record<string, unknown>)
        : raw;

    const workingDaysRaw = Array.isArray(schedule.workingDays) ? schedule.workingDays : [];

    const workingDays = workingDaysRaw
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const day = item as Record<string, unknown>;
        const dayOfWeekValue = Number(day.dayOfWeek);
        if (Number.isNaN(dayOfWeekValue)) {
          return null;
        }

        const intervalsRaw = Array.isArray(day.intervals) ? day.intervals : [];
        const intervals = intervalsRaw
          .map((interval) => {
            if (typeof interval !== 'object' || interval === null) {
              return null;
            }
            const record = interval as Record<string, unknown>;
            const start = record.start !== undefined ? String(record.start) : undefined;
            const end = record.end !== undefined ? String(record.end) : undefined;
            if (!start || !end) {
              return null;
            }
            return { start, end };
          })
          .filter((interval): interval is { start: string; end: string } => interval !== null);

        return {
          dayOfWeek: dayOfWeekValue,
          active: Boolean(day.active),
          intervals,
        };
      })
      .filter(
        (
          item,
        ): item is {
          dayOfWeek: number;
          active: boolean;
          intervals: { start: string; end: string }[];
        } => item !== null,
      );

    const exceptionsRaw = Array.isArray(schedule.exceptionPeriods) ? schedule.exceptionPeriods : [];
    const exceptionPeriods: ClinicScheduleExceptionPeriodDto[] = [];
    for (const item of exceptionsRaw) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }
      const record = item as Record<string, unknown>;
      const id = record.id !== undefined ? String(record.id) : undefined;
      const name = record.name !== undefined ? String(record.name) : undefined;
      const appliesTo = record.appliesTo !== undefined ? String(record.appliesTo) : undefined;
      const start = record.start ? new Date(record.start as string) : undefined;
      const end = record.end ? new Date(record.end as string) : undefined;

      if (!id || !name || !appliesTo || !start || !end) {
        continue;
      }

      const resourceIds = Array.isArray(record.resourceIds)
        ? (record.resourceIds as unknown[]).map((value) => String(value))
        : undefined;

      const exception: ClinicScheduleExceptionPeriodDto = {
        id,
        name,
        appliesTo,
        start,
        end,
      };

      if (resourceIds && resourceIds.length > 0) {
        exception.resourceIds = resourceIds;
      }

      exceptionPeriods.push(exception);
    }

    const holidaysRaw = Array.isArray(schedule.holidays) ? schedule.holidays : [];
    const holidays = holidaysRaw
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const record = item as Record<string, unknown>;
        const id = record.id !== undefined ? String(record.id) : undefined;
        const name = record.name !== undefined ? String(record.name) : undefined;
        const date = record.date ? new Date(record.date as string) : undefined;
        const scope = record.scope !== undefined ? String(record.scope) : undefined;

        if (!id || !name || !date || !scope) {
          return null;
        }

        return {
          id,
          name,
          date,
          scope,
        };
      })
      .filter(
        (item): item is { id: string; name: string; date: Date; scope: string } => item !== null,
      );

    return {
      timezone: String(schedule.timezone ?? ''),
      workingDays,
      exceptionPeriods,
      holidays,
      autosaveIntervalSeconds: Number(schedule.autosaveIntervalSeconds ?? 0),
      conflictResolution: String(schedule.conflictResolution ?? 'server_wins'),
    };
  }

  private static mapServiceSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicServiceSettingsItemDto[] {
    const source = Array.isArray(raw.services)
      ? (raw.services as unknown[])
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];

    const services: ClinicServiceSettingsItemDto[] = [];

    for (const item of source) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const record = item as Record<string, unknown>;

      const serviceTypeId =
        record.serviceTypeId !== undefined
          ? String(record.serviceTypeId)
          : record.id !== undefined
            ? String(record.id)
            : undefined;

      if (!serviceTypeId) {
        continue;
      }

      const cancellation = (record.cancellationPolicy ?? {}) as Record<string, unknown>;
      const eligibility = (record.eligibility ?? {}) as Record<string, unknown>;

      const cancellationType =
        cancellation.type !== undefined ? String(cancellation.type) : undefined;
      const cancellationWindow =
        cancellation.windowMinutes !== undefined
          ? Number(cancellation.windowMinutes)
          : cancellation.window !== undefined
            ? Number(cancellation.window)
            : undefined;
      const cancellationPercentage =
        cancellation.percentage !== undefined ? Number(cancellation.percentage) : undefined;

      const allowedTags = Array.isArray(eligibility.allowedTags)
        ? (eligibility.allowedTags as unknown[]).map((value) => String(value))
        : undefined;

      const requiredDocuments = Array.isArray(record.requiredDocuments)
        ? (record.requiredDocuments as unknown[]).map((value) => String(value))
        : undefined;

      const service: ClinicServiceSettingsItemDto = {
        serviceTypeId,
        name: String(record.name ?? ''),
        slug: String(record.slug ?? ''),
        durationMinutes: Number(record.durationMinutes ?? 0),
        price: Number(record.price ?? 0),
        currency: String(record.currency ?? 'BRL'),
        isActive: Boolean(record.isActive ?? true),
        requiresAnamnesis: Boolean(record.requiresAnamnesis ?? false),
        enableOnlineScheduling: Boolean(record.enableOnlineScheduling ?? true),
        minAdvanceMinutes: Number(record.minAdvanceMinutes ?? 0),
        allowNewPatients: Boolean(eligibility.allowNewPatients ?? true),
        allowExistingPatients: Boolean(eligibility.allowExistingPatients ?? true),
      };

      if (record.maxAdvanceMinutes !== undefined) {
        service.maxAdvanceMinutes = Number(record.maxAdvanceMinutes);
      }
      if (cancellationType) {
        service.cancellationPolicyType = cancellationType;
      }
      if (cancellationWindow !== undefined) {
        service.cancellationPolicyWindowMinutes = cancellationWindow;
      }
      if (cancellationPercentage !== undefined) {
        service.cancellationPolicyPercentage = cancellationPercentage;
      }
      if (eligibility.minimumAge !== undefined) {
        service.minimumAge = Number(eligibility.minimumAge);
      }
      if (eligibility.maximumAge !== undefined) {
        service.maximumAge = Number(eligibility.maximumAge);
      }
      if (allowedTags && allowedTags.length > 0) {
        service.allowedTags = allowedTags;
      }

      const color = record.color !== undefined ? String(record.color) : undefined;
      const instructions =
        record.instructions !== undefined ? String(record.instructions) : undefined;

      if (color) {
        service.color = color;
      }
      if (instructions) {
        service.instructions = instructions;
      }

      if (requiredDocuments && requiredDocuments.length > 0) {
        service.requiredDocuments = requiredDocuments;
      }

      services.push(service);
    }

    return services;
  }

  private static mapPaymentSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicPaymentSettingsResponseDto['payload'] {
    const payments =
      raw.paymentSettings && typeof raw.paymentSettings === 'object'
        ? (raw.paymentSettings as Record<string, unknown>)
        : raw;

    const splitRulesRaw = Array.isArray(payments.splitRules) ? payments.splitRules : [];
    const splitRules = splitRulesRaw
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }
        const record = item as Record<string, unknown>;
        const recipient = record.recipient !== undefined ? String(record.recipient) : undefined;
        const percentage = record.percentage !== undefined ? Number(record.percentage) : undefined;
        const order = record.order !== undefined ? Number(record.order) : undefined;

        if (
          !recipient ||
          percentage === undefined ||
          Number.isNaN(percentage) ||
          order === undefined
        ) {
          return null;
        }

        return { recipient, percentage, order };
      })
      .filter(
        (item): item is { recipient: string; percentage: number; order: number } => item !== null,
      );

    const antifraudRaw = (payments.antifraud ?? {}) as Record<string, unknown>;
    const antifraud = {
      enabled: Boolean(antifraudRaw.enabled),
      provider: antifraudRaw.provider !== undefined ? String(antifraudRaw.provider) : undefined,
      thresholdAmount:
        antifraudRaw.thresholdAmount !== undefined
          ? Number(antifraudRaw.thresholdAmount)
          : undefined,
    };

    const inadimplencyRaw = (payments.inadimplencyRule ?? {}) as Record<string, unknown>;
    const inadimplency = {
      gracePeriodDays: Number(inadimplencyRaw.gracePeriodDays ?? 0),
      penaltyPercentage:
        inadimplencyRaw.penaltyPercentage !== undefined
          ? Number(inadimplencyRaw.penaltyPercentage)
          : undefined,
      dailyInterestPercentage:
        inadimplencyRaw.dailyInterestPercentage !== undefined
          ? Number(inadimplencyRaw.dailyInterestPercentage)
          : undefined,
      maxRetries:
        inadimplencyRaw.maxRetries !== undefined ? Number(inadimplencyRaw.maxRetries) : undefined,
      actions: Array.isArray(inadimplencyRaw.actions)
        ? (inadimplencyRaw.actions as unknown[]).map((action) => String(action))
        : [],
    };

    const refundRaw = (payments.refundPolicy ?? {}) as Record<string, unknown>;
    const refundPolicy = {
      type: String(refundRaw.type ?? 'manual'),
      processingTimeHours: Number(refundRaw.processingTimeHours ?? 0),
      feePercentage:
        refundRaw.feePercentage !== undefined ? Number(refundRaw.feePercentage) : undefined,
      allowPartialRefund: Boolean(refundRaw.allowPartialRefund ?? false),
    };

    const cancellationRaw = Array.isArray(payments.cancellationPolicies)
      ? payments.cancellationPolicies
      : [];
    const cancellationPolicies: ClinicPaymentSettingsResponseDto['payload']['cancellationPolicies'] =
      [];
    for (const item of cancellationRaw) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }
      const record = item as Record<string, unknown>;
      const type = record.type !== undefined ? String(record.type) : undefined;
      if (!type) {
        continue;
      }

      const policy: ClinicPaymentSettingsResponseDto['payload']['cancellationPolicies'][number] = {
        type,
      };

      if (record.windowMinutes !== undefined) {
        policy.windowMinutes = Number(record.windowMinutes);
      }
      if (record.percentage !== undefined) {
        policy.percentage = Number(record.percentage);
      }
      if (record.message !== undefined) {
        policy.message = String(record.message);
      }

      cancellationPolicies.push(policy);
    }

    return {
      provider: String(payments.provider ?? ''),
      credentialsId: String(payments.credentialsId ?? ''),
      sandboxMode: Boolean(payments.sandboxMode ?? false),
      splitRules,
      roundingStrategy: String(payments.roundingStrategy ?? 'half_even'),
      antifraud,
      inadimplencyRule: inadimplency,
      refundPolicy,
      cancellationPolicies,
      bankAccountId:
        payments.bankAccountId !== undefined ? String(payments.bankAccountId) : undefined,
    };
  }

  private static mapIntegrationSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicIntegrationSettingsResponseDto['payload'] {
    const integrations =
      raw.integrationSettings && typeof raw.integrationSettings === 'object'
        ? (raw.integrationSettings as Record<string, unknown>)
        : raw;

    const whatsappRaw = (integrations.whatsapp ?? {}) as Record<string, unknown>;
    const whatsappTemplatesRaw = Array.isArray(whatsappRaw.templates) ? whatsappRaw.templates : [];
    const whatsappTemplates: ClinicIntegrationWhatsAppTemplateDto[] = [];
    for (const item of whatsappTemplatesRaw) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const template = item as Record<string, unknown>;
      const name = template.name !== undefined ? String(template.name) : undefined;
      const status = template.status !== undefined ? String(template.status) : undefined;

      if (!name || !status) {
        continue;
      }

      const result: ClinicIntegrationWhatsAppTemplateDto = {
        name,
        status,
      };

      if (template.category !== undefined) {
        result.category = String(template.category);
      }
      const lastUpdatedAtValue =
        template.lastUpdatedAt !== undefined ? String(template.lastUpdatedAt) : undefined;
      if (lastUpdatedAtValue && !Number.isNaN(Date.parse(lastUpdatedAtValue))) {
        result.lastUpdatedAt = new Date(lastUpdatedAtValue);
      }

      whatsappTemplates.push(result);
    }

    const whatsappQuietHoursRaw = (whatsappRaw.quietHours ?? {}) as Record<string, unknown>;
    const whatsappQuietHours =
      whatsappQuietHoursRaw.start !== undefined && whatsappQuietHoursRaw.end !== undefined
        ? {
            start: String(whatsappQuietHoursRaw.start),
            end: String(whatsappQuietHoursRaw.end),
            timezone:
              whatsappQuietHoursRaw.timezone !== undefined
                ? String(whatsappQuietHoursRaw.timezone)
                : undefined,
          }
        : undefined;

    const whatsapp = {
      enabled: Boolean(whatsappRaw.enabled),
      provider: whatsappRaw.provider !== undefined ? String(whatsappRaw.provider) : undefined,
      businessNumber:
        whatsappRaw.businessNumber !== undefined ? String(whatsappRaw.businessNumber) : undefined,
      instanceStatus:
        whatsappRaw.instanceStatus !== undefined ? String(whatsappRaw.instanceStatus) : undefined,
      qrCodeUrl: whatsappRaw.qrCodeUrl !== undefined ? String(whatsappRaw.qrCodeUrl) : undefined,
      templates: whatsappTemplates,
      quietHours: whatsappQuietHours,
      webhookUrl: whatsappRaw.webhookUrl !== undefined ? String(whatsappRaw.webhookUrl) : undefined,
    };

    const googleRaw = (integrations.googleCalendar ?? {}) as Record<string, unknown>;
    const google = {
      enabled: Boolean(googleRaw.enabled),
      syncMode: googleRaw.syncMode !== undefined ? String(googleRaw.syncMode) : 'one_way',
      conflictPolicy:
        googleRaw.conflictPolicy !== undefined ? String(googleRaw.conflictPolicy) : 'onterapi_wins',
      requireValidationForExternalEvents: Boolean(
        googleRaw.requireValidationForExternalEvents ?? true,
      ),
      defaultCalendarId:
        googleRaw.defaultCalendarId !== undefined ? String(googleRaw.defaultCalendarId) : undefined,
      hidePatientName: Boolean(googleRaw.hidePatientName ?? false),
      prefix: googleRaw.prefix !== undefined ? String(googleRaw.prefix) : undefined,
    };

    const emailRaw = (integrations.email ?? {}) as Record<string, unknown>;
    const emailTrackingRaw = (emailRaw.tracking ?? {}) as Record<string, unknown>;
    const email = {
      enabled: Boolean(emailRaw.enabled),
      provider: emailRaw.provider !== undefined ? String(emailRaw.provider) : undefined,
      fromName: emailRaw.fromName !== undefined ? String(emailRaw.fromName) : undefined,
      fromEmail: emailRaw.fromEmail !== undefined ? String(emailRaw.fromEmail) : undefined,
      replyTo: emailRaw.replyTo !== undefined ? String(emailRaw.replyTo) : undefined,
      tracking: {
        open: Boolean(emailTrackingRaw.open),
        click: Boolean(emailTrackingRaw.click),
        bounce: Boolean(emailTrackingRaw.bounce),
      },
      templates: Array.isArray(emailRaw.templates)
        ? (emailRaw.templates as unknown[]).map((template) => String(template))
        : undefined,
    };

    const webhooksRaw = Array.isArray(integrations.webhooks) ? integrations.webhooks : [];
    const webhooks: ClinicIntegrationWebhookDto[] = [];
    for (const record of webhooksRaw) {
      if (typeof record !== 'object' || record === null) {
        continue;
      }

      const webhook = record as Record<string, unknown>;
      const event = webhook.event !== undefined ? String(webhook.event) : undefined;
      const url = webhook.url !== undefined ? String(webhook.url) : undefined;
      if (!event || !url) {
        continue;
      }

      webhooks.push({
        event,
        url,
        active: Boolean(webhook.active),
      });
    }

    const metadata =
      integrations.metadata &&
      typeof integrations.metadata === 'object' &&
      Object.keys(integrations.metadata as Record<string, unknown>).length > 0
        ? (integrations.metadata as Record<string, unknown>)
        : undefined;

    return {
      whatsapp: {
        ...whatsapp,
        templates: whatsapp.templates,
      },
      googleCalendar: google,
      email,
      webhooks,
      metadata,
    };
  }

  private static mapNotificationSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicNotificationSettingsResponseDto['payload'] {
    const notifications =
      raw.notificationSettings && typeof raw.notificationSettings === 'object'
        ? (raw.notificationSettings as Record<string, unknown>)
        : raw;

    const channelsRaw = Array.isArray(notifications.channels) ? notifications.channels : [];
    const channels: ClinicNotificationSettingsChannelDto[] = [];
    for (const record of channelsRaw) {
      if (typeof record !== 'object' || record === null) {
        continue;
      }

      const channel = record as Record<string, unknown>;
      const type = channel.type !== undefined ? String(channel.type) : undefined;
      if (!type) {
        continue;
      }

      const quietHoursRaw = (channel.quietHours ?? {}) as Record<string, unknown>;
      let quietHours: ClinicNotificationSettingsQuietHoursDto | undefined;
      if (quietHoursRaw.start !== undefined && quietHoursRaw.end !== undefined) {
        quietHours = {
          start: String(quietHoursRaw.start),
          end: String(quietHoursRaw.end),
        };
        if (quietHoursRaw.timezone !== undefined) {
          quietHours.timezone = String(quietHoursRaw.timezone);
        }
      }

      const result: ClinicNotificationSettingsChannelDto = {
        type,
        enabled: Boolean(channel.enabled),
        defaultEnabled: Boolean(channel.defaultEnabled),
      };

      if (quietHours) {
        result.quietHours = quietHours;
      }

      channels.push(result);
    }

    const templatesRaw = Array.isArray(notifications.templates) ? notifications.templates : [];
    const templates: ClinicNotificationSettingsTemplateDto[] = [];
    for (const record of templatesRaw) {
      if (typeof record !== 'object' || record === null) {
        continue;
      }

      const template = record as Record<string, unknown>;
      const id = template.id !== undefined ? String(template.id) : undefined;
      const event = template.event !== undefined ? String(template.event) : undefined;
      const channel = template.channel !== undefined ? String(template.channel) : undefined;
      const version = template.version !== undefined ? String(template.version) : undefined;

      if (!id || !event || !channel || !version) {
        continue;
      }

      const variablesRaw = Array.isArray(template.variables) ? template.variables : [];
      const variables: ClinicNotificationSettingsTemplateVariableDto[] = [];
      for (const variable of variablesRaw) {
        if (typeof variable !== 'object' || variable === null) {
          continue;
        }
        const variableRecord = variable as Record<string, unknown>;
        const name = variableRecord.name !== undefined ? String(variableRecord.name) : undefined;
        if (!name) {
          continue;
        }
        variables.push({
          name,
          required: Boolean(variableRecord.required),
        });
      }

      const result: ClinicNotificationSettingsTemplateDto = {
        id,
        event,
        channel,
        version,
        active: Boolean(template.active),
        variables,
      };

      if (template.language !== undefined) {
        result.language = String(template.language);
      }
      if (template.abGroup !== undefined) {
        result.abGroup = String(template.abGroup);
      }

      templates.push(result);
    }

    const rulesRaw = Array.isArray(notifications.rules) ? notifications.rules : [];
    const rules: ClinicNotificationSettingsRuleDto[] = [];
    for (const record of rulesRaw) {
      if (typeof record !== 'object' || record === null) {
        continue;
      }

      const rule = record as Record<string, unknown>;
      const event = rule.event !== undefined ? String(rule.event) : undefined;
      const channelsValue = Array.isArray(rule.channels)
        ? (rule.channels as unknown[]).map((value) => String(value))
        : undefined;

      if (!event || !channelsValue || channelsValue.length === 0) {
        continue;
      }

      rules.push({
        event,
        channels: channelsValue,
        enabled: Boolean(rule.enabled),
      });
    }

    const quietHoursRaw = (notifications.quietHours ?? {}) as Record<string, unknown>;
    const quietHours =
      quietHoursRaw.start !== undefined && quietHoursRaw.end !== undefined
        ? {
            start: String(quietHoursRaw.start),
            end: String(quietHoursRaw.end),
            timezone:
              quietHoursRaw.timezone !== undefined ? String(quietHoursRaw.timezone) : undefined,
          }
        : undefined;

    const events = Array.isArray(notifications.events)
      ? (notifications.events as unknown[]).map((event) => String(event))
      : undefined;

    const metadata =
      notifications.metadata &&
      typeof notifications.metadata === 'object' &&
      Object.keys(notifications.metadata as Record<string, unknown>).length > 0
        ? (notifications.metadata as Record<string, unknown>)
        : undefined;

    return {
      channels,
      templates,
      rules,
      quietHours,
      events,
      metadata,
    };
  }

  private static mapBrandingSettingsPayload(
    raw: Record<string, unknown>,
  ): ClinicBrandingSettingsResponseDto['payload'] {
    const branding =
      raw.brandingSettings && typeof raw.brandingSettings === 'object'
        ? (raw.brandingSettings as Record<string, unknown>)
        : raw;

    const paletteRaw = (branding.palette ?? {}) as Record<string, unknown>;
    const palette =
      Object.keys(paletteRaw).length > 0
        ? {
            primary: String(paletteRaw.primary ?? '#1976d2'),
            secondary:
              paletteRaw.secondary !== undefined ? String(paletteRaw.secondary) : undefined,
            accent: paletteRaw.accent !== undefined ? String(paletteRaw.accent) : undefined,
            background:
              paletteRaw.background !== undefined ? String(paletteRaw.background) : undefined,
            surface: paletteRaw.surface !== undefined ? String(paletteRaw.surface) : undefined,
            text: paletteRaw.text !== undefined ? String(paletteRaw.text) : undefined,
          }
        : undefined;

    const typographyRaw = (branding.typography ?? {}) as Record<string, unknown>;
    const typography =
      Object.keys(typographyRaw).length > 0
        ? {
            primaryFont: String(typographyRaw.primaryFont ?? 'Inter'),
            secondaryFont:
              typographyRaw.secondaryFont !== undefined
                ? String(typographyRaw.secondaryFont)
                : undefined,
            headingWeight:
              typographyRaw.headingWeight !== undefined
                ? Number(typographyRaw.headingWeight)
                : undefined,
            bodyWeight:
              typographyRaw.bodyWeight !== undefined ? Number(typographyRaw.bodyWeight) : undefined,
          }
        : undefined;

    const previewRaw = (branding.preview ?? {}) as Record<string, unknown>;
    const preview =
      Object.keys(previewRaw).length > 0
        ? {
            mode: String(previewRaw.mode ?? 'draft'),
            generatedAt:
              previewRaw.generatedAt !== undefined &&
              !Number.isNaN(Date.parse(String(previewRaw.generatedAt)))
                ? new Date(String(previewRaw.generatedAt))
                : undefined,
            previewUrl:
              previewRaw.previewUrl !== undefined ? String(previewRaw.previewUrl) : undefined,
          }
        : undefined;

    const metadata =
      branding.metadata &&
      typeof branding.metadata === 'object' &&
      Object.keys(branding.metadata as Record<string, unknown>).length > 0
        ? (branding.metadata as Record<string, unknown>)
        : undefined;

    return {
      logoUrl: branding.logoUrl !== undefined ? String(branding.logoUrl) : undefined,
      darkLogoUrl: branding.darkLogoUrl !== undefined ? String(branding.darkLogoUrl) : undefined,
      palette,
      typography,
      customCss: branding.customCss !== undefined ? String(branding.customCss) : undefined,
      applyMode: String(branding.applyMode ?? 'immediate'),
      preview,
      versionLabel: branding.versionLabel !== undefined ? String(branding.versionLabel) : undefined,
      metadata,
    };
  }

  private static resolveConfigurationState(
    version: ClinicConfigurationVersion,
  ): 'idle' | 'saving' | 'saved' | 'error' {
    if (version.appliedAt) {
      return 'saved';
    }

    if (version.autoApply) {
      return 'saving';
    }

    return 'idle';
  }

  private static toDate(value: unknown): Date | undefined {
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    return undefined;
  }
}
