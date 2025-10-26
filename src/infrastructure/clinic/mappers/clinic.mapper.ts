import {
  Clinic,
  ClinicAlert,
  ClinicAppointment,
  ClinicAppointmentChannel,
  ClinicConfigurationSection,
  ClinicConfigurationState,
  ClinicConfigurationTelemetry,
  ClinicConfigurationVersion,
  ClinicDashboardMetric,
  ClinicDocumentType,
  ClinicFinancialSnapshot,
  ClinicForecastProjection,
  ClinicHold,
  ClinicHoldProfessionalPolicySnapshot,
  ClinicInvitation,
  ClinicInvitationChannelScope,
  ClinicInvitationEconomicSummary,
  ClinicMember,
  ClinicProfessionalPolicy,
  ClinicServiceTypeDefinition,
  ClinicTemplateOverride,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from '../entities/clinic.entity';
import { ClinicHoldEntity } from '../entities/clinic-hold.entity';
import { ClinicAppointmentEntity } from '../entities/clinic-appointment.entity';
import { ClinicDashboardMetricEntity } from '../entities/clinic-dashboard-metric.entity';
import { ClinicFinancialSnapshotEntity } from '../entities/clinic-financial-snapshot.entity';
import { ClinicForecastProjectionEntity } from '../entities/clinic-forecast-projection.entity';
import { ClinicAlertEntity } from '../entities/clinic-alert.entity';
import { ClinicConfigurationVersionEntity } from '../entities/clinic-configuration-version.entity';
import { ClinicInvitationEntity } from '../entities/clinic-invitation.entity';
import { ClinicMemberEntity } from '../entities/clinic-member.entity';
import { ClinicServiceTypeEntity } from '../entities/clinic-service-type.entity';
import { ClinicTemplateOverrideEntity } from '../entities/clinic-template-override.entity';
import { ClinicProfessionalPolicyEntity } from '../entities/clinic-professional-policy.entity';

export class ClinicMapper {
  static toClinic(entity: ClinicEntity): Clinic {
    const metadata = entity.metadata ?? {};
    const configurationTelemetry = ClinicMapper.mapConfigurationTelemetry(metadata);

    return {
      id: entity.id,
      tenantId: entity.tenantId,
      name: entity.name,
      slug: entity.slug,
      status: entity.status,
      document:
        entity.documentType && entity.documentValue
          ? {
              type: entity.documentType as ClinicDocumentType,
              value: entity.documentValue,
            }
          : undefined,
      primaryOwnerId: entity.primaryOwnerId,
      configurationVersions: entity.configurationVersions ?? {},
      configurationTelemetry,
      holdSettings: entity.holdSettings ?? {
        ttlMinutes: 30,
        minAdvanceMinutes: 60,
        maxAdvanceMinutes: undefined,
        allowOverbooking: false,
        overbookingThreshold: undefined,
        resourceMatchingStrict: true,
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? undefined,
      metadata,
    };
  }

  static toConfigurationVersion(
    entity: ClinicConfigurationVersionEntity,
  ): ClinicConfigurationVersion {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      section: entity.section,
      version: entity.version,
      payload: entity.payload ?? {},
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      appliedAt: entity.appliedAt ?? undefined,
      notes: entity.notes ?? undefined,
      autoApply: entity.autoApply,
    };
  }

  static toMember(entity: ClinicMemberEntity): ClinicMember {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      userId: entity.userId,
      tenantId: entity.tenantId,
      role: entity.role,
      status: entity.status,
      joinedAt: entity.joinedAt ?? undefined,
      suspendedAt: entity.suspendedAt ?? undefined,
      endedAt: entity.endedAt ?? undefined,
      scope: entity.scope ?? [],
      preferences: entity.preferences ?? {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toInvitation(entity: ClinicInvitationEntity): ClinicInvitation {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      tenantId: entity.tenantId,
      professionalId: entity.professionalId ?? undefined,
      targetEmail: entity.targetEmail ?? undefined,
      issuedBy: entity.issuedBy,
      status: entity.status,
      tokenHash: entity.tokenHash,
      channel: entity.channel,
      channelScope: (entity.channelScope ?? 'direct') as ClinicInvitation['channelScope'],
      expiresAt: entity.expiresAt,
      acceptedAt: entity.acceptedAt ?? undefined,
      acceptedBy: entity.acceptedBy ?? undefined,
      acceptedEconomicSnapshot: entity.acceptedEconomicSnapshot ?? undefined,
      revokedAt: entity.revokedAt ?? undefined,
      revokedBy: entity.revokedBy ?? undefined,
      revocationReason: entity.revocationReason ?? undefined,
      declinedAt: entity.declinedAt ?? undefined,
      declinedBy: entity.declinedBy ?? undefined,
      economicSummary: entity.economicSummary,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata: entity.metadata ?? {},
    };
  }

  static toServiceType(entity: ClinicServiceTypeEntity): ClinicServiceTypeDefinition {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      name: entity.name,
      slug: entity.slug,
      durationMinutes: entity.durationMinutes,
      price: this.toNumber(entity.price),
      currency: entity.currency as ClinicServiceTypeDefinition['currency'],
      isActive: entity.isActive,
      requiresAnamnesis: entity.requiresAnamnesis,
      enableOnlineScheduling: entity.enableOnlineScheduling,
      minAdvanceMinutes: entity.minAdvanceMinutes,
      maxAdvanceMinutes: entity.maxAdvanceMinutes ?? undefined,
      cancellationPolicy: entity.cancellationPolicy,
      eligibility: entity.eligibility,
      instructions: entity.instructions ?? undefined,
      requiredDocuments: entity.requiredDocuments ?? [],
      customFields: entity.customFields ?? [],
      color: entity.color ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toProfessionalPolicy(entity: ClinicProfessionalPolicyEntity): ClinicProfessionalPolicy {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      tenantId: entity.tenantId,
      professionalId: entity.professionalId,
      channelScope: entity.channelScope,
      economicSummary: entity.economicSummary,
      effectiveAt: entity.effectiveAt,
      endedAt: entity.endedAt ?? undefined,
      sourceInvitationId: entity.sourceInvitationId,
      acceptedBy: entity.acceptedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toHold(entity: ClinicHoldEntity): ClinicHold {
    const metadata =
      entity.metadata && Object.keys(entity.metadata).length > 0 ? entity.metadata : undefined;
    const channel = ClinicMapper.extractHoldChannel(metadata);
    const policySnapshot = ClinicMapper.extractHoldPolicy(metadata);

    return {
      id: entity.id,
      clinicId: entity.clinicId,
      tenantId: entity.tenantId,
      professionalId: entity.professionalId,
      patientId: entity.patientId,
      serviceTypeId: entity.serviceTypeId,
      start: entity.start,
      end: entity.end,
      ttlExpiresAt: entity.ttlExpiresAt,
      status: entity.status,
      locationId: entity.locationId ?? undefined,
      resources: entity.resources ?? [],
      idempotencyKey: entity.idempotencyKey,
      createdBy: entity.createdBy,
      channel,
      professionalPolicySnapshot: policySnapshot,
      confirmedAt: entity.confirmedAt ?? undefined,
      confirmedBy: entity.confirmedBy ?? undefined,
      cancelledAt: entity.cancelledAt ?? undefined,
      cancelledBy: entity.cancelledBy ?? undefined,
      cancellationReason: entity.cancellationReason ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata,
    };
  }

  static toAppointment(entity: ClinicAppointmentEntity): ClinicAppointment {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      tenantId: entity.tenantId,
      holdId: entity.holdId,
      professionalId: entity.professionalId,
      patientId: entity.patientId,
      serviceTypeId: entity.serviceTypeId,
      start: entity.startAt,
      end: entity.endAt,
      status: entity.status,
      paymentStatus: entity.paymentStatus,
      paymentTransactionId: entity.paymentTransactionId,
      confirmedAt: entity.confirmedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata:
        entity.metadata && Object.keys(entity.metadata).length > 0 ? entity.metadata : undefined,
    };
  }

  static toDashboardMetric(entity: ClinicDashboardMetricEntity): ClinicDashboardMetric {
    return {
      clinicId: entity.clinicId,
      month: entity.month,
      revenue: this.toNumber(entity.revenue),
      appointments: entity.appointments,
      activePatients: entity.activePatients,
      occupancyRate: this.toNumber(entity.occupancyRate),
      satisfactionScore: this.toNullableNumber(entity.satisfactionScore),
      contributionMargin: this.toNullableNumber(entity.contributionMargin),
    };
  }

  static toForecastProjection(entity: ClinicForecastProjectionEntity): ClinicForecastProjection {
    return {
      clinicId: entity.clinicId,
      month: entity.month,
      projectedRevenue: this.toNumber(entity.projectedRevenue),
      projectedAppointments: entity.projectedAppointments,
      projectedOccupancyRate: this.toNumber(entity.projectedOccupancyRate),
    };
  }

  static toFinancialSnapshot(entity: ClinicFinancialSnapshotEntity): ClinicFinancialSnapshot {
    return {
      clinicId: entity.clinicId,
      revenue: this.toNumber(entity.revenue),
      expenses: this.toNumber(entity.expenses),
      profit: this.toNumber(entity.profit),
      margin: this.toNumber(entity.margin),
      contributionPercentage: 0,
    };
  }

  static toAlert(entity: ClinicAlertEntity): ClinicAlert {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      tenantId: entity.tenantId,
      type: entity.type,
      channel: entity.channel,
      triggeredBy: entity.triggeredBy,
      triggeredAt: entity.triggeredAt,
      resolvedAt: entity.resolvedAt ?? undefined,
      resolvedBy: entity.resolvedBy ?? undefined,
      payload: entity.payload ?? {},
    };
  }

  private static mapConfigurationTelemetry(
    metadata: Record<string, unknown>,
  ): Partial<Record<ClinicConfigurationSection, ClinicConfigurationTelemetry>> | undefined {
    const telemetryRaw = metadata['configurationTelemetry'];

    if (!telemetryRaw || typeof telemetryRaw !== 'object') {
      return undefined;
    }

    const entries = Object.entries(telemetryRaw as Record<string, unknown>).reduce<
      Partial<Record<ClinicConfigurationSection, ClinicConfigurationTelemetry>>
    >((acc, [sectionKey, value]) => {
      if (!value || typeof value !== 'object') {
        return acc;
      }

      const section = sectionKey as ClinicConfigurationSection;
      const telemetry = ClinicMapper.normalizeTelemetry(section, value as Record<string, unknown>);

      if (telemetry) {
        acc[section] = telemetry;
      }

      return acc;
    }, {});

    return Object.keys(entries).length > 0 ? entries : undefined;
  }

  private static normalizeTelemetry(
    section: ClinicConfigurationSection,
    raw: Record<string, unknown>,
  ): ClinicConfigurationTelemetry | undefined {
    const allowedStates: ClinicConfigurationState[] = ['idle', 'saving', 'saved', 'error'];
    const rawState = typeof raw['state'] === 'string' ? (raw['state'] as string) : 'idle';
    const state = allowedStates.includes(rawState as ClinicConfigurationState)
      ? (rawState as ClinicConfigurationState)
      : 'idle';

    const completionScoreRaw = ClinicMapper.toOptionalNumber(raw['completionScore']);
    const completionScore = completionScoreRaw !== undefined ? completionScoreRaw : 0;

    return {
      section,
      state,
      completionScore: Math.max(0, Math.min(100, Math.round(completionScore))),
      lastAttemptAt: ClinicMapper.toDate(raw['lastAttemptAt']),
      lastSavedAt: ClinicMapper.toDate(raw['lastSavedAt']),
      lastErrorAt: ClinicMapper.toDate(raw['lastErrorAt']),
      lastErrorMessage:
        typeof raw['lastErrorMessage'] === 'string'
          ? (raw['lastErrorMessage'] as string)
          : undefined,
      lastUpdatedBy:
        typeof raw['lastUpdatedBy'] === 'string' ? (raw['lastUpdatedBy'] as string) : undefined,
      autosaveIntervalSeconds: ClinicMapper.toOptionalNumber(raw['autosaveIntervalSeconds']),
      pendingConflicts: ClinicMapper.toOptionalNumber(raw['pendingConflicts']),
    };
  }

  private static toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private static extractHoldChannel(
    metadata: Record<string, unknown> | undefined,
  ): ClinicAppointmentChannel | undefined {
    if (!metadata) {
      return undefined;
    }
    const value = metadata.channel;
    if (value === 'direct' || value === 'marketplace') {
      return value;
    }
    return undefined;
  }

  private static extractHoldPolicy(
    metadata: Record<string, unknown> | undefined,
  ): ClinicHoldProfessionalPolicySnapshot | undefined {
    if (!metadata) {
      return undefined;
    }

    const raw = metadata.professionalPolicy;
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }

    const snapshot = raw as Record<string, unknown>;
    const policyId = typeof snapshot.policyId === 'string' ? snapshot.policyId : undefined;
    const channelScope = snapshot.channelScope;
    const acceptedBy = typeof snapshot.acceptedBy === 'string' ? snapshot.acceptedBy : undefined;
    const sourceInvitationId =
      typeof snapshot.sourceInvitationId === 'string' ? snapshot.sourceInvitationId : undefined;
    const effectiveAtRaw = snapshot.effectiveAt;
    const economicSummaryRaw = snapshot.economicSummary;

    if (
      !policyId ||
      !acceptedBy ||
      !sourceInvitationId ||
      !economicSummaryRaw ||
      (channelScope !== 'direct' && channelScope !== 'marketplace' && channelScope !== 'both')
    ) {
      return undefined;
    }

    const effectiveAt =
      effectiveAtRaw instanceof Date
        ? effectiveAtRaw
        : typeof effectiveAtRaw === 'string'
          ? new Date(effectiveAtRaw)
          : undefined;

    if (!effectiveAt || Number.isNaN(effectiveAt.getTime())) {
      return undefined;
    }

    const economicSummary = economicSummaryRaw as ClinicInvitationEconomicSummary;

    return {
      policyId,
      channelScope: channelScope as ClinicInvitationChannelScope,
      acceptedBy,
      sourceInvitationId,
      effectiveAt,
      economicSummary: JSON.parse(
        JSON.stringify(economicSummary),
      ) as ClinicInvitationEconomicSummary,
    };
  }

  private static toDate(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return undefined;
  }

  private static toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    return typeof value === 'number' ? value : Number(value);
  }

  private static toNullableNumber(value: number | string | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return typeof value === 'number' ? value : Number(value);
  }

  static toTemplateOverride(entity: ClinicTemplateOverrideEntity): ClinicTemplateOverride {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      tenantId: entity.tenantId,
      templateClinicId: entity.templateClinicId,
      section: entity.section,
      overrideVersion: entity.overrideVersion,
      overridePayload: entity.overridePayload ?? {},
      overrideHash: entity.overrideHash,
      baseTemplateVersionId: entity.baseTemplateVersionId,
      baseTemplateVersionNumber: entity.baseTemplateVersionNumber,
      appliedConfigurationVersionId: entity.appliedConfigurationVersionId ?? undefined,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      supersededAt: entity.supersededAt ?? undefined,
      supersededBy: entity.supersededBy ?? undefined,
    };
  }
}
