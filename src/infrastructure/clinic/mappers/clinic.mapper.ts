import {
  Clinic,
  ClinicAlert,
  ClinicAppointment,
  ClinicConfigurationVersion,
  ClinicDashboardMetric,
  ClinicDocumentType,
  ClinicForecastProjection,
  ClinicHold,
  ClinicInvitation,
  ClinicMember,
  ClinicServiceTypeDefinition,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from '../entities/clinic.entity';
import { ClinicHoldEntity } from '../entities/clinic-hold.entity';
import { ClinicAppointmentEntity } from '../entities/clinic-appointment.entity';
import { ClinicDashboardMetricEntity } from '../entities/clinic-dashboard-metric.entity';
import { ClinicForecastProjectionEntity } from '../entities/clinic-forecast-projection.entity';
import { ClinicAlertEntity } from '../entities/clinic-alert.entity';
import { ClinicConfigurationVersionEntity } from '../entities/clinic-configuration-version.entity';
import { ClinicInvitationEntity } from '../entities/clinic-invitation.entity';
import { ClinicMemberEntity } from '../entities/clinic-member.entity';
import { ClinicServiceTypeEntity } from '../entities/clinic-service-type.entity';

export class ClinicMapper {
  static toClinic(entity: ClinicEntity): Clinic {
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
      metadata: entity.metadata ?? {},
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
      expiresAt: entity.expiresAt,
      acceptedAt: entity.acceptedAt ?? undefined,
      acceptedBy: entity.acceptedBy ?? undefined,
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

  static toHold(entity: ClinicHoldEntity): ClinicHold {
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
      confirmedAt: entity.confirmedAt ?? undefined,
      confirmedBy: entity.confirmedBy ?? undefined,
      cancelledAt: entity.cancelledAt ?? undefined,
      cancelledBy: entity.cancelledBy ?? undefined,
      cancellationReason: entity.cancellationReason ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata:
        entity.metadata && Object.keys(entity.metadata).length > 0 ? entity.metadata : undefined,
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

  static toAlert(entity: ClinicAlertEntity): ClinicAlert {
    return {
      id: entity.id,
      clinicId: entity.clinicId,
      type: entity.type,
      channel: entity.channel,
      triggeredAt: entity.triggeredAt,
      resolvedAt: entity.resolvedAt ?? undefined,
      payload: entity.payload ?? {},
    };
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
}
