import { RolesEnum } from '../../auth/enums/roles.enum';

export type ClinicStatus = 'draft' | 'pending' | 'active' | 'inactive' | 'suspended';

export type ClinicConfigurationSection =
  | 'general'
  | 'team'
  | 'schedule'
  | 'services'
  | 'payments'
  | 'integrations'
  | 'notifications'
  | 'branding';

export type ClinicStaffRole =
  | RolesEnum.CLINIC_OWNER
  | RolesEnum.MANAGER
  | RolesEnum.PROFESSIONAL
  | RolesEnum.SECRETARY;

export type ClinicMemberStatus = 'pending_invitation' | 'active' | 'inactive' | 'suspended';

export type ClinicInvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

export type ClinicInvitationChannel = 'email' | 'whatsapp';

export type ClinicDocumentType = 'cnpj' | 'cpf' | 'mei';

export type ClinicPayoutModel = 'fixed' | 'percentage';

export type ClinicCurrency = 'BRL' | 'USD' | 'EUR';

export type ClinicSplitRecipient = 'taxes' | 'gateway' | 'clinic' | 'professional' | 'platform';

export type ClinicCancellationPolicyType = 'free' | 'percentage' | 'no_refund';

export type ClinicRefundPolicyType = 'automatic' | 'manual' | 'partial';

export type ClinicInadimplencyAction = 'retry' | 'notify' | 'suspend' | 'escalate';

export type ClinicHoldMergeStrategy = 'server_wins' | 'client_wins' | 'merge' | 'ask_user';

export type ClinicAlertChannel = 'in_app' | 'email' | 'push';

export type ClinicAlertType = 'revenue_drop' | 'low_occupancy' | 'staff_shortage' | 'compliance';

export type ClinicNotificationChannel = 'email' | 'whatsapp' | 'sms' | 'push';

export type ClinicNotificationPriority = 'low' | 'normal' | 'high';

export interface ClinicDocument {
  type: ClinicDocumentType;
  value: string;
}

export interface ClinicAddress {
  zipCode: string;
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state: string;
  country?: string;
}

export interface ClinicContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  socialLinks?: string[];
}

export interface ClinicGeneralSettings {
  tradeName: string;
  legalName?: string;
  document?: ClinicDocument;
  stateRegistration?: string;
  municipalRegistration?: string;
  foundationDate?: Date;
  address: ClinicAddress;
  contact: ClinicContact;
  notes?: string;
}

export interface ClinicRoleQuota {
  role: ClinicStaffRole;
  limit: number;
}

export interface ClinicTeamSettings {
  quotas: ClinicRoleQuota[];
  allowExternalInvitations: boolean;
  defaultMemberStatus: ClinicMemberStatus;
}

export interface ClinicWorkInterval {
  start: string;
  end: string;
}

export interface ClinicWorkDay {
  dayOfWeek: number;
  active: boolean;
  intervals: ClinicWorkInterval[];
}

export interface ClinicExceptionPeriod {
  id: string;
  name: string;
  start: Date;
  end: Date;
  appliesTo: 'clinic' | 'professional' | 'resource';
  resourceIds?: string[];
}

export interface ClinicHoliday {
  id: string;
  name: string;
  date: Date;
  scope: 'national' | 'state' | 'city' | 'local';
}

export interface ClinicScheduleSettings {
  timezone: string;
  workingDays: ClinicWorkDay[];
  exceptionPeriods: ClinicExceptionPeriod[];
  holidays: ClinicHoliday[];
  autosaveIntervalSeconds: number;
  conflictResolution: ClinicHoldMergeStrategy;
}

export interface ClinicCancellationPolicy {
  type: ClinicCancellationPolicyType;
  windowMinutes?: number;
  percentage?: number;
  message?: string;
}

export interface ClinicServiceEligibility {
  allowNewPatients: boolean;
  allowExistingPatients: boolean;
  minimumAge?: number;
  maximumAge?: number;
  allowedTags?: string[];
}

export interface ClinicServiceCustomField {
  id: string;
  label: string;
  fieldType: 'text' | 'number' | 'boolean' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

export interface ClinicServiceTypeDefinition {
  id: string;
  clinicId: string;
  name: string;
  slug: string;
  color?: string;
  durationMinutes: number;
  price: number;
  currency: ClinicCurrency;
  isActive: boolean;
  requiresAnamnesis: boolean;
  enableOnlineScheduling: boolean;
  minAdvanceMinutes: number;
  maxAdvanceMinutes?: number;
  cancellationPolicy: ClinicCancellationPolicy;
  eligibility: ClinicServiceEligibility;
  instructions?: string;
  requiredDocuments?: string[];
  customFields?: ClinicServiceCustomField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicSplitRule {
  recipient: ClinicSplitRecipient;
  percentage: number;
  order: number;
}

export interface ClinicAntifraudSettings {
  enabled: boolean;
  provider?: string;
  thresholdAmount?: number;
}

export interface ClinicInadimplencyRule {
  gracePeriodDays: number;
  penaltyPercentage?: number;
  dailyInterestPercentage?: number;
  maxRetries?: number;
  actions: ClinicInadimplencyAction[];
}

export interface ClinicRefundPolicy {
  type: ClinicRefundPolicyType;
  processingTimeHours: number;
  feePercentage?: number;
  allowPartialRefund: boolean;
}

export interface ClinicPaymentSettings {
  provider: 'asaas';
  credentialsId: string;
  sandboxMode: boolean;
  splitRules: ClinicSplitRule[];
  roundingStrategy: 'half_even';
  antifraud: ClinicAntifraudSettings;
  inadimplencyRule: ClinicInadimplencyRule;
  refundPolicy: ClinicRefundPolicy;
  cancellationPolicies: ClinicCancellationPolicy[];
  bankAccountId?: string;
}

export interface ClinicWhatsappSettings {
  provider: 'evolution' | 'meta';
  instanceId: string;
  businessNumber: string;
  templatesNamespace?: string;
  quietHours?: ClinicQuietHours[];
  marketingOptInRequired: boolean;
}

export interface ClinicCalendarConflictPolicy {
  priority: 'onterapi' | 'external' | 'ask';
  bufferMinutes: number;
  respectResources: boolean;
  autoConfirmEvents: boolean;
}

export interface ClinicGoogleCalendarSettings {
  mode: 'one_way' | 'two_way';
  calendarPerProfessional: boolean;
  defaultCalendarSuffix?: string;
  hidePatientName: boolean;
  conflictPolicy: ClinicCalendarConflictPolicy;
  pendingEventTtlMinutes: number;
}

export interface ClinicEmailSettings {
  provider: 'resend' | 'sendgrid' | 'smtp';
  fromEmail: string;
  replyToEmail?: string;
  trackingEnabled: boolean;
  unsubscribeEnabled: boolean;
  brandingFooterEnabled: boolean;
}

export interface ClinicIntegrationSettings {
  whatsapp?: ClinicWhatsappSettings;
  googleCalendar?: ClinicGoogleCalendarSettings;
  email?: ClinicEmailSettings;
  externalAnalyticsIds?: string[];
}

export interface ClinicNotificationTemplateVariable {
  name: string;
  required: boolean;
  description?: string;
}

export interface ClinicNotificationTemplateVariant {
  id: string;
  language: string;
  channel: ClinicNotificationChannel;
  subject?: string;
  body: string;
  version: number;
  active: boolean;
  createdAt: Date;
}

export interface ClinicNotificationTemplate {
  id: string;
  clinicId: string;
  event: string;
  priority: ClinicNotificationPriority;
  variables: ClinicNotificationTemplateVariable[];
  variants: ClinicNotificationTemplateVariant[];
  defaultChannel: ClinicNotificationChannel;
  aBTestingEnabled: boolean;
}

export interface ClinicQuietHours {
  start: string;
  end: string;
  timezone: string;
  channel: ClinicNotificationChannel;
}

export interface ClinicNotificationSettings {
  enabledEvents: string[];
  quietHours: ClinicQuietHours[];
  templates: ClinicNotificationTemplate[];
  channelOverrides?: Record<string, ClinicNotificationChannel[]>;
}

export interface ClinicBrandingSettings {
  logoUrl?: string;
  lightLogoUrl?: string;
  darkLogoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  fontFamily?: string;
  customCss?: string;
  previewUrl?: string;
}

export interface ClinicHoldSettings {
  ttlMinutes: number;
  minAdvanceMinutes: number;
  maxAdvanceMinutes?: number;
  allowOverbooking: boolean;
  overbookingThreshold?: number;
  resourceMatchingStrict: boolean;
}

export interface ClinicEconomicAgreement {
  serviceTypeId: string;
  price: number;
  currency: ClinicCurrency;
  payoutModel: ClinicPayoutModel;
  payoutValue: number;
}

export interface ClinicInvitationEconomicSummary {
  items: ClinicEconomicAgreement[];
  orderOfRemainders: ClinicSplitRecipient[];
  roundingStrategy: 'half_even';
}

export interface ClinicInvitation {
  id: string;
  clinicId: string;
  tenantId: string;
  professionalId?: string;
  targetEmail?: string;
  issuedBy: string;
  status: ClinicInvitationStatus;
  tokenHash: string;
  channel: ClinicInvitationChannel;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  declinedAt?: Date;
  economicSummary: ClinicInvitationEconomicSummary;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ClinicMember {
  id: string;
  clinicId: string;
  userId: string;
  tenantId: string;
  role: ClinicStaffRole;
  status: ClinicMemberStatus;
  joinedAt?: Date;
  suspendedAt?: Date;
  scope: string[];
  preferences?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicConfigurationVersion {
  id: string;
  clinicId: string;
  section: ClinicConfigurationSection;
  version: number;
  payload: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  appliedAt?: Date;
  notes?: string;
}

export interface Clinic {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: ClinicStatus;
  document?: ClinicDocument;
  primaryOwnerId: string;
  configurationVersions?: Partial<Record<ClinicConfigurationSection, string>>;
  holdSettings: ClinicHoldSettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ClinicHold {
  id: string;
  clinicId: string;
  tenantId: string;
  professionalId: string;
  patientId: string;
  serviceTypeId: string;
  start: Date;
  end: Date;
  ttlExpiresAt: Date;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  locationId?: string;
  resources?: string[];
  idempotencyKey: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ClinicDashboardMetric {
  clinicId: string;
  month: string;
  revenue: number;
  appointments: number;
  activePatients: number;
  occupancyRate: number;
  satisfactionScore?: number;
  contributionMargin?: number;
}

export interface ClinicDashboardSnapshot {
  period: { start: Date; end: Date };
  totals: {
    clinics: number;
    professionals: number;
    activePatients: number;
    revenue: number;
  };
  metrics: ClinicDashboardMetric[];
  alerts: ClinicAlert[];
}

export interface ClinicComparisonEntry {
  clinicId: string;
  name: string;
  revenue: number;
  revenueVariationPercentage: number;
  appointments: number;
  appointmentsVariationPercentage: number;
  occupancyRate: number;
  satisfactionScore?: number;
  rankingPosition: number;
}

export interface ClinicForecastProjection {
  clinicId: string;
  month: string;
  projectedRevenue: number;
  projectedAppointments: number;
  projectedOccupancyRate: number;
}

export interface ClinicAlert {
  id: string;
  clinicId: string;
  type: ClinicAlertType;
  channel: ClinicAlertChannel;
  triggeredAt: Date;
  resolvedAt?: Date;
  payload: Record<string, unknown>;
}

export interface CreateClinicInput {
  tenantId: string;
  name: string;
  slug: string;
  primaryOwnerId: string;
  document?: ClinicDocument;
  holdSettings?: ClinicHoldSettings;
  metadata?: Record<string, unknown>;
}

export interface UpdateClinicGeneralSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  settings: ClinicGeneralSettings;
}

export interface UpdateClinicTeamSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  teamSettings: ClinicTeamSettings;
}

export interface UpdateClinicScheduleSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  scheduleSettings: ClinicScheduleSettings;
}

export interface UpsertClinicServiceTypeInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  service: Omit<ClinicServiceTypeDefinition, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  };
}

export interface RemoveClinicServiceTypeInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  serviceTypeId: string;
}

export interface UpdateClinicPaymentSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  paymentSettings: ClinicPaymentSettings;
}

export interface UpdateClinicIntegrationSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  integrationSettings: ClinicIntegrationSettings;
}

export interface UpdateClinicNotificationSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  notificationSettings: ClinicNotificationSettings;
}

export interface UpdateClinicBrandingSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  brandingSettings: ClinicBrandingSettings;
}

export interface UpdateClinicHoldSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  holdSettings: ClinicHoldSettings;
}

export interface ManageClinicMemberInput {
  clinicId: string;
  tenantId: string;
  performedBy: string;
  memberId: string;
  status?: ClinicMemberStatus;
  scope?: string[];
  role?: ClinicStaffRole;
}

export interface AddClinicMemberInput {
  clinicId: string;
  tenantId: string;
  performedBy: string;
  userId: string;
  role: ClinicStaffRole;
  status: ClinicMemberStatus;
  scope?: string[];
  joinedAt?: Date;
}

export interface RemoveClinicMemberInput {
  clinicId: string;
  tenantId: string;
  performedBy: string;
  memberId: string;
  effectiveDate?: Date;
  reason?: string;
}

export interface InviteClinicProfessionalInput {
  clinicId: string;
  tenantId: string;
  issuedBy: string;
  professionalId?: string;
  email?: string;
  channel: ClinicInvitationChannel;
  economicSummary: ClinicInvitationEconomicSummary;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AcceptClinicInvitationInput {
  invitationId: string;
  token: string;
  acceptedBy: string;
  tenantId: string;
  deviceInfo?: Record<string, unknown>;
}

export interface RevokeClinicInvitationInput {
  invitationId: string;
  tenantId: string;
  revokedBy: string;
  reason?: string;
}

export interface ClinicHoldRequestInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  professionalId: string;
  patientId: string;
  serviceTypeId: string;
  start: Date;
  end: Date;
  locationId?: string;
  resources?: string[];
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ClinicHoldConfirmationInput {
  holdId: string;
  clinicId: string;
  tenantId: string;
  confirmedBy: string;
  paymentTransactionId: string;
  idempotencyKey: string;
}

export interface ClinicAppointmentConfirmationResult {
  appointmentId: string;
  clinicId: string;
  holdId: string;
  paymentTransactionId: string;
  confirmedAt: Date;
  paymentStatus: 'approved' | 'failed';
}

export interface ClinicOverbookingReviewInput {
  clinicId: string;
  tenantId: string;
  performedBy: string;
  holdId: string;
  approve: boolean;
  justification?: string;
}

export interface ClinicDashboardQuery {
  tenantId: string;
  filters?: {
    clinicIds?: string[];
    status?: ClinicStatus[];
    from?: Date;
    to?: Date;
  };
  includeForecast?: boolean;
  includeComparisons?: boolean;
}

export interface ClinicComparisonQuery {
  tenantId: string;
  clinicIds?: string[];
  metric: 'revenue' | 'appointments' | 'occupancy' | 'satisfaction';
  period: { start: Date; end: Date };
}

export interface ClinicTemplatePropagationInput {
  templateClinicId: string;
  targetClinicIds: string[];
  sections: ClinicConfigurationSection[];
  versionNotes?: string;
  triggeredBy: string;
}

export interface TriggerClinicAlertInput {
  clinicId: string;
  tenantId: string;
  type: ClinicAlertType;
  channel: ClinicAlertChannel;
  payload: Record<string, unknown>;
  triggeredBy: string;
}

export interface SaveClinicConfigurationVersionInput {
  clinicId: string;
  tenantId: string;
  section: ClinicConfigurationSection;
  payload: Record<string, unknown>;
  versionNotes?: string;
  createdBy: string;
  autoApply?: boolean;
}

export interface ApplyClinicConfigurationVersionInput {
  clinicId: string;
  tenantId: string;
  section: ClinicConfigurationSection;
  versionId: string;
  appliedBy: string;
}
