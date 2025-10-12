import {
  Clinic,
  ClinicConfigurationVersion,
  ClinicDashboardSnapshot,
  ClinicHold,
  ClinicInvitation,
  ClinicMember,
  ClinicServiceTypeDefinition,
} from '../../../../domain/clinic/types/clinic.types';
import { ClinicConfigurationVersionResponseDto } from '../dtos/clinic-configuration-response.dto';
import { ClinicHoldResponseDto } from '../dtos/clinic-hold-response.dto';
import { ClinicSummaryDto } from '../dtos/clinic-summary.dto';
import { ClinicDashboardResponseDto } from '../dtos/clinic-dashboard-response.dto';
import { ClinicServiceTypeResponseDto } from '../dtos/clinic-service-type-response.dto';
import { ClinicInvitationResponseDto } from '../dtos/clinic-invitation-response.dto';
import { ClinicMemberResponseDto } from '../dtos/clinic-member-response.dto';

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
    return {
      id: clinic.id,
      tenantId: clinic.tenantId,
      name: clinic.name,
      slug: clinic.slug,
      status: clinic.status,
      holdSettings: {
        ttlMinutes: clinic.holdSettings.ttlMinutes,
        minAdvanceMinutes: clinic.holdSettings.minAdvanceMinutes,
        maxAdvanceMinutes: clinic.holdSettings.maxAdvanceMinutes,
        allowOverbooking: clinic.holdSettings.allowOverbooking,
        overbookingThreshold: clinic.holdSettings.overbookingThreshold,
        resourceMatchingStrict: clinic.holdSettings.resourceMatchingStrict,
      },
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
      color: serviceType.color,
      durationMinutes: serviceType.durationMinutes,
      price: serviceType.price,
      currency: serviceType.currency,
      isActive: serviceType.isActive,
      requiresAnamnesis: serviceType.requiresAnamnesis,
      enableOnlineScheduling: serviceType.enableOnlineScheduling,
      minAdvanceMinutes: serviceType.minAdvanceMinutes,
      maxAdvanceMinutes: serviceType.maxAdvanceMinutes,
      cancellationPolicy: serviceType.cancellationPolicy,
      eligibility: serviceType.eligibility,
      instructions: serviceType.instructions,
      requiredDocuments: serviceType.requiredDocuments ?? [],
      customFields: serviceType.customFields ?? [],
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
      economicSummary: invitation.economicSummary,
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
}
