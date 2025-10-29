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
  | 'security'
  | 'branding';

export type ClinicConfigurationState = 'idle' | 'saving' | 'saved' | 'error';

export interface ClinicConfigurationTelemetry {
  section: ClinicConfigurationSection;
  state: ClinicConfigurationState;
  completionScore: number;
  lastAttemptAt?: Date;
  lastSavedAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  lastUpdatedBy?: string;
  autosaveIntervalSeconds?: number;
  pendingConflicts?: number;
}

export type ClinicStaffRole =
  | RolesEnum.CLINIC_OWNER
  | RolesEnum.MANAGER
  | RolesEnum.PROFESSIONAL
  | RolesEnum.SECRETARY;

export type ClinicMemberStatus = 'pending_invitation' | 'active' | 'inactive' | 'suspended';

export type ClinicInvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

export type ClinicInvitationChannel = 'email' | 'whatsapp';

export type ClinicInvitationChannelScope = 'direct' | 'marketplace' | 'both';

export type ClinicAppointmentChannel = 'direct' | 'marketplace';

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

export type ClinicTrendDirection = 'upward' | 'downward' | 'stable';

export type ClinicComplianceStatus =
  | 'valid'
  | 'pending'
  | 'expired'
  | 'missing'
  | 'submitted'
  | 'review'
  | 'unknown';

export interface ClinicComplianceDocumentStatus {
  id?: string;
  type: string;
  name?: string;
  expiresAt?: Date | null;
  required?: boolean;
  status?: ClinicComplianceStatus;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
  updatedBy?: string;
}

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
  requireFinancialClearance: boolean;
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

export interface ClinicServiceSettingsItem {
  serviceTypeId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  price: number;
  currency: ClinicCurrency;
  isActive: boolean;
  requiresAnamnesis: boolean;
  enableOnlineScheduling: boolean;
  minAdvanceMinutes: number;
  maxAdvanceMinutes?: number;
  cancellationPolicyType?: ClinicCancellationPolicyType;
  cancellationPolicyWindowMinutes?: number;
  cancellationPolicyPercentage?: number;
  allowNewPatients: boolean;
  allowExistingPatients: boolean;
  minimumAge?: number;
  maximumAge?: number;
  allowedTags?: string[];
  color?: string;
  instructions?: string;
  requiredDocuments?: string[];
}

export interface ClinicServiceSettings {
  services: ClinicServiceSettingsItem[];
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

export interface ClinicPaymentCredentials {
  provider: 'asaas';
  productionApiKey: string;
  sandboxApiKey?: string;
}

export type ClinicPaymentPayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ClinicPaymentPayoutSplitAllocation extends ClinicPaymentSplitAllocation {}

export interface ClinicPaymentPayoutRequest {
  id: string;
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId: string | null;
  coverageId: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  provider: string;
  credentialsId: string;
  sandboxMode: boolean;
  bankAccountId?: string | null;
  baseAmountCents: number;
  netAmountCents?: number | null;
  remainderCents: number;
  split: ClinicPaymentPayoutSplitAllocation[];
  currency: ClinicCurrency;
  gatewayStatus: string;
  eventType?: string | null;
  fingerprint?: string | null;
  payloadId?: string | null;
  sandbox: boolean;
  settledAt: Date;
  providerPayoutId?: string | null;
  providerStatus?: string | null;
  providerPayload?: Record<string, unknown> | null;
  executedAt?: Date | null;
  status: ClinicPaymentPayoutStatus;
  attempts: number;
  lastError?: string | null;
  requestedAt: Date;
  lastAttemptedAt?: Date | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueClinicPaymentPayoutRequestInput {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  provider: string;
  credentialsId: string;
  sandboxMode: boolean;
  bankAccountId?: string | null;
  baseAmountCents: number;
  netAmountCents?: number | null;
  remainderCents: number;
  split: ClinicPaymentPayoutSplitAllocation[];
  currency: ClinicCurrency;
  gatewayStatus: string;
  eventType?: string | null;
  fingerprint?: string | null;
  payloadId?: string | null;
  sandbox: boolean;
  settledAt: Date;
  requestedAt: Date;
}

export interface ClinicPaymentWebhookPayload {
  event: string;
  id?: string;
  sandbox?: boolean;
  payment: {
    id: string;
    status?: string;
    dueDate?: string;
    paymentDate?: string;
    customer?: string;
    billingType?: string;
    netValue?: number;
    value?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ProcessClinicPaymentWebhookInput {
  provider: 'asaas';
  payload: ClinicPaymentWebhookPayload;
  receivedAt: Date;
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

export interface ClinicIntegrationWhatsAppTemplateConfig {
  name: string;
  status: string;
  category?: string;
  lastUpdatedAt?: string;
}

export interface ClinicIntegrationWhatsAppQuietHoursConfig {
  start: string;
  end: string;
  timezone?: string;
}

export interface ClinicIntegrationWhatsAppConfig {
  enabled: boolean;
  provider?: 'evolution' | 'meta';
  businessNumber?: string;
  instanceStatus?: string;
  qrCodeUrl?: string;
  templates?: ClinicIntegrationWhatsAppTemplateConfig[];
  quietHours?: ClinicIntegrationWhatsAppQuietHoursConfig;
  webhookUrl?: string;
}

export interface ClinicIntegrationGoogleCalendarConfig {
  enabled: boolean;
  syncMode: 'one_way' | 'two_way';
  conflictPolicy: 'onterapi_wins' | 'google_wins' | 'ask_user';
  requireValidationForExternalEvents: boolean;
  defaultCalendarId?: string;
  hidePatientName?: boolean;
  prefix?: string;
}

export interface ClinicIntegrationEmailConfig {
  enabled: boolean;
  provider?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  tracking?: {
    open: boolean;
    click: boolean;
    bounce: boolean;
  };
  templates?: string[];
}

export interface ClinicIntegrationSettingsConfig {
  whatsapp?: ClinicIntegrationWhatsAppConfig;
  googleCalendar?: ClinicIntegrationGoogleCalendarConfig;
  email?: ClinicIntegrationEmailConfig;
  webhooks?: { event: string; url: string; active: boolean }[];
  metadata?: Record<string, unknown>;
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

export interface ClinicNotificationChannelConfig {
  type: string;
  enabled: boolean;
  defaultEnabled: boolean;
  quietHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
}

export interface ClinicNotificationTemplateVariableConfig {
  name: string;
  required: boolean;
}

export interface ClinicNotificationTemplateConfig {
  id: string;
  event: string;
  channel: string;
  version: string;
  active: boolean;
  language?: string;
  abGroup?: string;
  variables: ClinicNotificationTemplateVariableConfig[];
}

export interface ClinicNotificationRuleConfig {
  event: string;
  channels: string[];
  enabled: boolean;
}

export interface ClinicNotificationSettingsConfig {
  channels: ClinicNotificationChannelConfig[];
  templates: ClinicNotificationTemplateConfig[];
  rules: ClinicNotificationRuleConfig[];
  quietHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
  events?: string[];
  metadata?: Record<string, unknown>;
}

export interface ClinicSecurityTwoFactorSettings {
  enabled: boolean;
  requiredRoles: ClinicStaffRole[];
  backupCodesEnabled: boolean;
}

export interface ClinicSecurityPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
}

export interface ClinicSecuritySessionSettings {
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
}

export interface ClinicSecurityComplianceDocument {
  id?: string;
  type: string;
  name?: string;
  required?: boolean;
  status?: ClinicComplianceStatus;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface ClinicSecurityComplianceSettings {
  documents: ClinicSecurityComplianceDocument[];
}

export interface ClinicSecurityLoginAlertSettings {
  email: boolean;
  whatsapp: boolean;
}

export interface ClinicSecurityIpRestrictionSettings {
  enabled: boolean;
  allowlist: string[];
  blocklist: string[];
}

export interface ClinicSecurityAuditSettings {
  retentionDays: number;
  exportEnabled: boolean;
}

export interface ClinicSecuritySettings {
  twoFactor: ClinicSecurityTwoFactorSettings;
  passwordPolicy: ClinicSecurityPasswordPolicy;
  session: ClinicSecuritySessionSettings;
  loginAlerts: ClinicSecurityLoginAlertSettings;
  ipRestrictions: ClinicSecurityIpRestrictionSettings;
  audit: ClinicSecurityAuditSettings;
  compliance?: ClinicSecurityComplianceSettings;
  metadata?: Record<string, unknown>;
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

export interface ClinicBrandingPaletteConfig {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
}

export interface ClinicBrandingTypographyConfig {
  primaryFont?: string;
  secondaryFont?: string;
  headingWeight?: number;
  bodyWeight?: number;
}

export interface ClinicBrandingPreviewConfig {
  mode: string;
  generatedAt?: string;
  previewUrl?: string;
}

export interface ClinicBrandingSettingsConfig {
  logoUrl?: string;
  darkLogoUrl?: string;
  palette?: ClinicBrandingPaletteConfig;
  typography?: ClinicBrandingTypographyConfig;
  customCss?: string;
  applyMode: string;
  preview?: ClinicBrandingPreviewConfig;
  versionLabel?: string;
  metadata?: Record<string, unknown>;
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
  channelScope: ClinicInvitationChannelScope;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  acceptedEconomicSnapshot?: ClinicInvitationEconomicSummary;
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string | null;
  declinedAt?: Date;
  declinedBy?: string;
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
  endedAt?: Date;
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
  autoApply: boolean;
  telemetry?: ClinicConfigurationTelemetry;
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
  configurationTelemetry?: Partial<
    Record<ClinicConfigurationSection, ClinicConfigurationTelemetry>
  >;
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
  channel?: ClinicAppointmentChannel;
  professionalPolicySnapshot?: ClinicHoldProfessionalPolicySnapshot;
  confirmedAt?: Date;
  confirmedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export type ClinicExternalCalendarEventInboundStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface ClinicExternalCalendarEventPayload {
  externalEventId: string;
  status: ClinicExternalCalendarEventInboundStatus;
  startAt: Date;
  endAt: Date;
  timezone: string;
  summary?: string;
  description?: string;
  locationId?: string;
  resources?: string[];
  calendarId?: string;
  rawPayload?: Record<string, unknown>;
}

export interface ProcessClinicExternalCalendarEventInput {
  tenantId: string;
  clinicId: string;
  professionalId: string;
  payload: ClinicExternalCalendarEventPayload;
  triggeredBy?: string;
}

export type ClinicAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type ClinicPaymentStatus = 'approved' | 'settled' | 'refunded' | 'chargeback' | 'failed';

export interface CheckClinicProfessionalFinancialClearanceInput {
  clinicId: string;
  tenantId: string;
  professionalId?: string;
}

export interface ClinicProfessionalFinancialClearanceStatus {
  requiresClearance: boolean;
  hasPendencies: boolean;
  pendingCount: number;
  statusesEvaluated: ClinicPaymentStatus[];
}

export interface ClinicPaymentSplitAllocation {
  recipient: ClinicSplitRecipient;
  percentage: number;
  amountCents: number;
}

export interface ClinicPaymentLedgerEventEntry {
  type: 'status_changed' | 'settled' | 'refunded' | 'chargeback' | 'failed';
  gatewayStatus: string;
  eventType?: string;
  recordedAt: string;
  fingerprint?: string;
  sandbox: boolean;
  metadata?: Record<string, unknown>;
}

export interface ReissueClinicInvitationInput {
  invitationId: string;
  tenantId: string;
  reissuedBy: string;
  expiresAt: Date;
  channel?: ClinicInvitationChannel;
  channelScope?: ClinicInvitationChannelScope;
}

export interface DeclineClinicInvitationInput {
  invitationId: string;
  tenantId: string;
  declinedBy: string;
  reason?: string;
}

export interface ClinicProfessionalPolicy {
  id: string;
  clinicId: string;
  tenantId: string;
  professionalId: string;
  channelScope: ClinicInvitationChannelScope;
  economicSummary: ClinicInvitationEconomicSummary;
  effectiveAt: Date;
  endedAt?: Date;
  sourceInvitationId: string;
  acceptedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClinicProfessionalPolicyInput {
  clinicId: string;
  tenantId: string;
  professionalId: string;
  channelScope: ClinicInvitationChannelScope;
  economicSummary: ClinicInvitationEconomicSummary;
  effectiveAt: Date;
  sourceInvitationId: string;
  acceptedBy: string;
}

export interface ClinicInvitationExpirationRecord {
  invitationId: string;
  clinicId: string;
  tenantId: string;
  expiredAt: Date;
}

export interface ClinicPaymentLedgerSettlement {
  settledAt: string;
  baseAmountCents: number;
  netAmountCents?: number;
  split: ClinicPaymentSplitAllocation[];
  remainderCents: number;
  fingerprint?: string;
  gatewayStatus: string;
}

export interface ClinicPaymentLedgerRefund {
  refundedAt: string;
  amountCents?: number;
  netAmountCents?: number;
  fingerprint?: string;
  gatewayStatus: string;
}

export interface ClinicPaymentLedgerChargeback {
  chargebackAt: string;
  amountCents?: number;
  netAmountCents?: number;
  fingerprint?: string;
  gatewayStatus: string;
}

export interface ClinicPaymentLedger {
  currency: ClinicCurrency;
  lastUpdatedAt: string;
  events: ClinicPaymentLedgerEventEntry[];
  settlement?: ClinicPaymentLedgerSettlement;
  refund?: ClinicPaymentLedgerRefund;
  chargeback?: ClinicPaymentLedgerChargeback;
  metadata?: Record<string, unknown>;
}

export interface ClinicPaymentWebhookEventRecord {
  id: string;
  tenantId: string;
  clinicId: string;
  provider: string;
  paymentTransactionId: string;
  fingerprint: string;
  appointmentId?: string | null;
  eventType?: string | null;
  gatewayStatus?: string | null;
  payloadId?: string | null;
  sandbox?: boolean | null;
  receivedAt: Date;
  processedAt: Date;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface ClinicAppointment {
  id: string;
  clinicId: string;
  tenantId: string;
  holdId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  professionalId: string;
  patientId: string;
  serviceTypeId: string;
  start: Date;
  end: Date;
  status: ClinicAppointmentStatus;
  paymentStatus: ClinicPaymentStatus;
  paymentTransactionId: string;
  confirmedAt: Date;
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
  comparisons?: ClinicDashboardComparison;
  forecast?: ClinicDashboardForecast;
}

export interface ClinicComparisonEntry {
  clinicId: string;
  name: string;
  revenue: number;
  revenueVariationPercentage: number;
  appointments: number;
  appointmentsVariationPercentage: number;
  activePatients: number;
  activePatientsVariationPercentage: number;
  occupancyRate: number;
  occupancyVariationPercentage: number;
  satisfactionScore?: number;
  satisfactionVariationPercentage?: number;
  rankingPosition: number;
  trendDirection: ClinicTrendDirection;
  trendPercentage: number;
  benchmarkValue: number;
  benchmarkGapPercentage: number;
  benchmarkPercentile: number;
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
  tenantId: string;
  type: ClinicAlertType;
  channel: ClinicAlertChannel;
  triggeredBy: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  payload: Record<string, unknown>;
}

export interface ClinicDashboardComparisonMetric {
  metric: ClinicComparisonQuery['metric'];
  entries: ClinicComparisonEntry[];
}

export interface ClinicDashboardComparison {
  period: { start: Date; end: Date };
  previousPeriod: { start: Date; end: Date };
  metrics: ClinicDashboardComparisonMetric[];
}

export interface ClinicDashboardForecast {
  period: { start: Date; end: Date };
  projections: ClinicForecastProjection[];
}

export interface ClinicManagementOverviewQuery {
  tenantId: string;
  filters?: {
    clinicIds?: string[];
    status?: ClinicStatus[];
    from?: Date;
    to?: Date;
  };
  includeForecast?: boolean;
  includeComparisons?: boolean;
  includeAlerts?: boolean;
  includeTeamDistribution?: boolean;
  includeFinancials?: boolean;
  includeCoverageSummary?: boolean;
}

export interface ClinicManagementAlertsQuery {
  tenantId: string;
  clinicIds?: string[];
  types?: ClinicAlertType[];
  activeOnly?: boolean;
  limit?: number;
}

export interface ClinicManagementTeamDistributionEntry {
  role: ClinicStaffRole;
  count: number;
}

export interface ClinicManagementTemplateSectionInfo {
  section: ClinicConfigurationSection;
  templateVersionId: string;
  templateVersionNumber?: number;
  propagatedVersionId?: string;
  propagatedAt?: Date;
  triggeredBy?: string;
  override?: {
    overrideId: string;
    overrideVersion: number;
    overrideHash?: string;
    overrideUpdatedAt?: Date;
    overrideUpdatedBy?: string;
    overrideAppliedVersionId?: string | null;
  };
}

export interface ClinicManagementTemplateInfo {
  templateClinicId?: string;
  lastPropagationAt?: Date;
  lastTriggeredBy?: string;
  sections: ClinicManagementTemplateSectionInfo[];
}

export interface ClinicFinancialSnapshot {
  clinicId: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  contributionPercentage: number;
}

export interface ClinicFinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  averageMargin: number;
  clinics: ClinicFinancialSnapshot[];
}

export interface ClinicManagementComplianceSummary {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  missing: number;
  pending: number;
  review: number;
  submitted: number;
  unknown: number;
  documents: ClinicComplianceDocumentStatus[];
  nextExpiration?: {
    type: string;
    expiresAt: Date;
  };
}

export interface ClinicManagementClinicSummary {
  clinicId: string;
  name: string;
  slug?: string;
  status: ClinicStatus;
  primaryOwnerId?: string;
  lastActivityAt?: Date;
  metrics: {
    revenue: number;
    appointments: number;
    activePatients: number;
    occupancyRate: number;
    satisfactionScore?: number;
    contributionMargin?: number;
  };
  financials?: ClinicFinancialSnapshot;
  alerts: ClinicAlert[];
  teamDistribution?: ClinicManagementTeamDistributionEntry[];
  template?: ClinicManagementTemplateInfo;
  compliance?: ClinicManagementComplianceSummary;
  coverage?: ClinicManagementCoverageSummary;
}

export interface ClinicManagementOverview {
  period: { start: Date; end: Date };
  totals: ClinicDashboardSnapshot['totals'];
  clinics: ClinicManagementClinicSummary[];
  alerts: ClinicAlert[];
  comparisons?: ClinicDashboardComparison;
  forecast?: ClinicDashboardForecast;
  financials?: ClinicFinancialSummary;
}

export interface ClinicManagementCoverageSummary {
  scheduled: number;
  active: number;
  completedLast30Days: number;
  lastUpdatedAt?: Date;
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

export interface ClinicAuditLog {
  id: string;
  tenantId: string;
  clinicId?: string;
  event: string;
  performedBy?: string;
  detail: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateClinicAuditLogInput {
  tenantId: string;
  clinicId?: string;
  event: string;
  performedBy?: string;
  detail: Record<string, unknown>;
}

export interface ListClinicAuditLogsInput {
  tenantId: string;
  clinicId?: string;
  events?: string[];
  page?: number;
  limit?: number;
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

export interface UpdateClinicServiceSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  serviceSettings: ClinicServiceSettings;
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
  integrationSettings: ClinicIntegrationSettingsConfig;
}

export interface UpdateClinicNotificationSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  notificationSettings: ClinicNotificationSettingsConfig;
}

export interface UpdateClinicSecuritySettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  securitySettings: ClinicSecuritySettings;
}

export interface UpdateClinicBrandingSettingsInput {
  clinicId: string;
  tenantId: string;
  requestedBy: string;
  brandingSettings: ClinicBrandingSettingsConfig;
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
  channelScope: ClinicInvitationChannelScope;
  economicSummary: ClinicInvitationEconomicSummary;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateClinicInvitationAddendumInput {
  clinicId: string;
  tenantId: string;
  issuedBy: string;
  professionalId: string;
  channel: ClinicInvitationChannel;
  channelScope: ClinicInvitationChannelScope;
  economicSummary: ClinicInvitationEconomicSummary;
  expiresAt: Date;
  effectiveAt?: Date;
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
  channel?: ClinicAppointmentChannel;
  metadata?: Record<string, unknown>;
}

export interface ClinicHoldProfessionalPolicySnapshot {
  policyId: string;
  channelScope: ClinicInvitationChannelScope;
  acceptedBy: string;
  sourceInvitationId: string;
  effectiveAt: Date;
  economicSummary: ClinicInvitationEconomicSummary;
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
  paymentStatus: ClinicPaymentStatus;
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
  comparisonMetrics?: ClinicComparisonQuery['metric'][];
}

export interface ClinicComparisonQuery {
  tenantId: string;
  clinicIds?: string[];
  metric: 'revenue' | 'appointments' | 'patients' | 'occupancy' | 'satisfaction';
  period: { start: Date; end: Date };
  limit?: number;
}

export interface ClinicTemplatePropagationInput {
  tenantId: string;
  templateClinicId: string;
  targetClinicIds: string[];
  sections: ClinicConfigurationSection[];
  versionNotes?: string;
  triggeredBy: string;
}

export interface ClinicProfessionalTransferResult {
  fromMembership: ClinicMember;
  toMembership: ClinicMember;
  effectiveDate: Date;
  transferPatients: boolean;
}

export interface TransferClinicProfessionalInput {
  tenantId: string;
  professionalId: string;
  fromClinicId: string;
  toClinicId: string;
  effectiveDate: Date;
  transferPatients: boolean;
  performedBy: string;
}

export type ClinicProfessionalCoverageStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface ClinicProfessionalCoverage {
  id: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  coverageProfessionalId: string;
  startAt: Date;
  endAt: Date;
  status: ClinicProfessionalCoverageStatus;
  reason?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateClinicProfessionalCoverageInput {
  tenantId: string;
  clinicId: string;
  professionalId: string;
  coverageProfessionalId: string;
  startAt: Date;
  endAt: Date;
  reason?: string;
  notes?: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

export interface CancelClinicProfessionalCoverageInput {
  tenantId: string;
  clinicId: string;
  coverageId: string;
  cancelledBy: string;
  cancellationReason?: string;
}

export interface ListClinicProfessionalCoveragesQuery {
  tenantId: string;
  clinicId?: string;
  clinicIds?: string[];
  professionalId?: string;
  coverageProfessionalId?: string;
  statuses?: ClinicProfessionalCoverageStatus[];
  from?: Date;
  to?: Date;
  includeCancelled?: boolean;
  page?: number;
  limit?: number;
}

export interface ClinicProfessionalCoverageClinicSummary {
  clinicId: string;
  scheduled: number;
  active: number;
  completedLast30Days: number;
  lastUpdatedAt?: Date;
}

export interface ClinicTemplateOverride {
  id: string;
  clinicId: string;
  tenantId: string;
  templateClinicId: string;
  section: ClinicConfigurationSection;
  overrideVersion: number;
  overridePayload: Record<string, unknown>;
  overrideHash: string;
  baseTemplateVersionId: string;
  baseTemplateVersionNumber: number;
  appliedConfigurationVersionId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  supersededAt?: Date;
  supersededBy?: string;
}

export interface CreateClinicTemplateOverrideInput {
  clinicId: string;
  tenantId: string;
  templateClinicId: string;
  section: ClinicConfigurationSection;
  baseTemplateVersionId: string;
  baseTemplateVersionNumber: number;
  overridePayload: Record<string, unknown>;
  overrideHash: string;
  createdBy: string;
}

export interface FindClinicTemplateOverrideParams {
  clinicId: string;
  tenantId: string;
  section: ClinicConfigurationSection;
}

export interface SupersedeClinicTemplateOverrideInput {
  overrideId: string;
  supersededBy: string;
  supersededAt?: Date;
}

export interface UpdateClinicTemplateOverrideAppliedInput {
  overrideId: string;
  appliedConfigurationVersionId: string | null;
  appliedAt: Date;
}

export interface UpdateClinicTemplateOverrideBaseVersionInput {
  overrideId: string;
  baseTemplateVersionId: string;
  baseTemplateVersionNumber: number;
}

export interface ListClinicTemplateOverridesInput {
  tenantId: string;
  clinicId: string;
  section?: ClinicConfigurationSection;
  includeSuperseded?: boolean;
  page?: number;
  limit?: number;
}

export interface ClinicTemplateOverrideListResult {
  data: ClinicTemplateOverride[];
  total: number;
  page: number;
  limit: number;
}

export interface ResolveClinicAlertInput {
  tenantId: string;
  alertId: string;
  resolvedBy: string;
  resolvedAt?: Date;
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
