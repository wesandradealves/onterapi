import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { IPatientRepository } from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import {
  ArchivePatientInput,
  CreatePatientInput,
  Patient,
  PatientExportRequest,
  PatientListFilters,
  PatientListItem,
  PatientSummary,
  PatientTimelineEntry,
  TransferPatientInput,
  UpdatePatientInput,
} from '../../../domain/patients/types/patient.types';
import { SupabaseService } from '../../auth/services/supabase.service';
import { PatientMapper, SupabasePatientRecord } from '../../../shared/mappers/patient.mapper';
import { appendSlugSuffix, slugify } from '../../../shared/utils/slug.util';
import { clampLimit, clampPage } from '../../../shared/utils/pagination.util';

const toISODate = (value?: Date): string | null => (value ? value.toISOString() : null);
const normaliseString = (value?: string | null): string | undefined =>
  value && value.trim().length ? value.trim() : undefined;

const toJsonRecord = (value: unknown): Record<string, unknown> => {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return { ...(parsed as Record<string, unknown>) };
      }
      return {};
    } catch {
      return {};
    }
  }

  if (typeof value === 'object') {
    return { ...(value as Record<string, unknown>) };
  }

  return {};
};

@Injectable()
export class PatientRepository implements IPatientRepository {
  private readonly logger = new Logger(PatientRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  private async patientSlugExists(
    tenantId: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    let query = this.client
      .from('patients')
      .select('id', { head: true, count: 'exact' })
      .eq('clinic_id', tenantId)
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
      this.logger.error('Failed to verify patient slug uniqueness', { tenantId, slug, error });
      throw error;
    }

    return (count ?? 0) > 0;
  }

  private async generateUniqueSlug(
    tenantId: string,
    fullName: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(fullName || 'paciente');
    let slug = baseSlug;
    let counter = 1;

    while (await this.patientSlugExists(tenantId, slug, excludeId)) {
      slug = appendSlugSuffix(baseSlug, ++counter);
    }

    return slug;
  }

  private async resolvePatientIdOrThrow(
    tenantId: string,
    identifiers: { patientId?: string; patientSlug?: string },
  ): Promise<string> {
    if (identifiers.patientId) {
      return identifiers.patientId;
    }

    if (!identifiers.patientSlug) {
      throw new Error('Patient identifier is required');
    }

    const { data, error } = await this.client
      .from('patients')
      .select('id')
      .eq('clinic_id', tenantId)
      .eq('slug', identifiers.patientSlug)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to resolve patient by slug', {
        tenantId,
        slug: identifiers.patientSlug,
        error,
      });
      throw error;
    }

    if (!data) {
      throw new Error('Patient not found');
    }

    return data.id;
  }

  async create(input: CreatePatientInput): Promise<Patient> {
    const now = new Date().toISOString();
    const slug = await this.generateUniqueSlug(input.tenantId, input.fullName);

    const medicalHistory = {
      fullName: input.fullName,
      cpf: input.cpf,
      maritalStatus: input.maritalStatus,
      status: input.status ?? 'new',
      tags: input.tags ?? [],
      observations: input.medical?.observations,
      address: input.address ?? undefined,
      chronicConditions: input.medical?.chronicConditions ?? undefined,
      preExistingConditions: input.medical?.preExistingConditions ?? undefined,
      continuousMedications: input.medical?.continuousMedications ?? undefined,
      heightCm: input.medical?.heightCm ?? undefined,
      weightKg: input.medical?.weightKg ?? undefined,
      bloodType: input.medical?.bloodType ?? undefined,
      lifestyle: input.medical?.lifestyle ?? undefined,
      acceptedTerms: input.acceptedTerms,
      acceptedTermsAt:
        input.acceptedTermsAt?.toISOString() ?? (input.acceptedTerms ? now : undefined),
    };

    const emergencyContact = {
      email: input.contact?.email ?? null,
      phone: input.contact?.phone ?? null,
      whatsapp: input.contact?.whatsapp ?? null,
    };

    const payload = {
      id: uuid(),
      slug,
      clinic_id: input.tenantId,
      user_id: null,
      professional_id: input.professionalId ?? null,
      birth_date: input.birthDate ? input.birthDate.toISOString().split('T')[0] : null,
      gender: input.gender ?? null,
      emergency_contact: emergencyContact,
      medical_history: medicalHistory,
      allergies: input.medical?.allergies ?? [],
      current_medications: input.medical?.medications ?? [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.client.from('patients').insert(payload).select('*').single();

    if (error || !data) {
      this.logger.error('Failed to create patient', error);
      throw error || new Error('Unable to create patient');
    }

    return PatientMapper.toDomain(data as SupabasePatientRecord);
  }

  private buildListQuery(tenantId: string, filters?: PatientListFilters) {
    let query = this.client
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('clinic_id', tenantId);

    if (filters?.query?.trim()) {
      const value = filters.query.trim().replace(/[%_]/g, '\\$&');
      query = query.ilike('medical_history->>fullName', `%${value}%`);
    }

    if (filters?.status?.length) {
      query = query.in('medical_history->>status', filters.status);
    }

    if (filters?.assignedProfessionalIds?.length) {
      query = query.in('professional_id', filters.assignedProfessionalIds);
    }

    if (filters?.tags?.length) {
      query = query.contains('medical_history->tags', filters.tags);
    }

    return query;
  }

  async findAll(params: {
    tenantId: string;
    filters?: PatientListFilters;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientListItem[]; total: number }> {
    const { tenantId, filters, sortBy, sortOrder = 'asc' } = params;
    const page = clampPage(params.page);
    const limit = clampLimit(params.limit, 20, 200);

    const validSortColumns = new Map<string, string>([
      ['createdAt', 'created_at'],
      ['updatedAt', 'updated_at'],
      ['fullName', 'medical_history->>fullName'],
    ]);

    const orderColumn = validSortColumns.get(sortBy ?? '') ?? 'created_at';
    const ascending = sortOrder === 'asc';
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.buildListQuery(tenantId, filters)
      .order(orderColumn, { ascending, nullsFirst: true })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to list patients', error);
      throw error;
    }

    const items = (data || []).map((record: SupabasePatientRecord) =>
      PatientMapper.toListItem(record),
    );

    return {
      data: items,
      total: count ?? items.length,
    };
  }

  async findById(tenantId: string, patientId: string): Promise<Patient | null> {
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('clinic_id', tenantId)
      .eq('id', patientId)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to load patient', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return PatientMapper.toDomain(data as SupabasePatientRecord);
  }

  async findBySlug(tenantId: string, slug: string): Promise<Patient | null> {
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('clinic_id', tenantId)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to load patient by slug', { tenantId, slug, error });
      throw error;
    }

    if (!data) {
      return null;
    }

    return PatientMapper.toDomain(data as SupabasePatientRecord);
  }

  async findSummary(tenantId: string, patientId: string): Promise<PatientSummary> {
    this.logger.log('patient summaries not available, returning defaults', { tenantId, patientId });
    return {
      totals: {
        appointments: 0,
        completedAppointments: 0,
        cancellations: 0,
        revenue: 0,
        pendingPayments: 0,
      },
      alerts: [],
      retentionScore: undefined,
    };
  }

  async findTimeline(tenantId: string, patientId: string): Promise<PatientTimelineEntry[]> {
    this.logger.log('patient timeline not available, returning empty list', {
      tenantId,
      patientId,
    });
    return [];
  }

  async update(input: UpdatePatientInput): Promise<Patient> {
    const patientId = await this.resolvePatientIdOrThrow(input.tenantId, input);

    const existing = await this.client
      .from('patients')
      .select('medical_history, emergency_contact, allergies, current_medications')
      .eq('clinic_id', input.tenantId)
      .eq('id', patientId)
      .maybeSingle();

    if (existing.error) {
      this.logger.error('Failed to load patient for update', existing.error);
      throw existing.error;
    }

    if (!existing.data) {
      throw new Error('Patient not found');
    }

    const currentHistory = toJsonRecord(existing.data.medical_history);
    const currentEmergency = toJsonRecord(existing.data.emergency_contact);

    const existingCpf = normaliseString(currentHistory.cpf as string | undefined);
    const requestedShortName = input.shortName ?? input.fullName?.split(' ')[0];

    const now = new Date().toISOString();

    const existingAcceptedTerms =
      typeof currentHistory.acceptedTerms === 'boolean'
        ? (currentHistory.acceptedTerms as boolean)
        : false;
    const existingAcceptedTermsAt =
      typeof currentHistory.acceptedTermsAt === 'string'
        ? (currentHistory.acceptedTermsAt as string)
        : undefined;

    let acceptedTerms = existingAcceptedTerms;
    let acceptedTermsAt = existingAcceptedTermsAt;

    if (typeof input.acceptedTerms === 'boolean') {
      acceptedTerms = input.acceptedTerms;
      if (!acceptedTerms) {
        acceptedTermsAt = undefined;
      }
    }

    if (input.acceptedTermsAt) {
      acceptedTermsAt = input.acceptedTermsAt.toISOString();
    } else if (
      typeof input.acceptedTerms === 'boolean' &&
      input.acceptedTerms &&
      !acceptedTermsAt
    ) {
      acceptedTermsAt = now;
    }

    const updatedHistory = {
      ...currentHistory,
      fullName: normaliseString(input.fullName) ?? currentHistory.fullName,
      cpf: existingCpf ?? currentHistory.cpf,
      shortName: normaliseString(requestedShortName) ?? currentHistory.shortName,
      status: input.status ?? currentHistory.status ?? 'active',
      tags: input.tags ?? (currentHistory.tags as string[] | undefined) ?? [],
      observations: input.medical?.observations ?? currentHistory.observations,
      chronicConditions: input.medical?.chronicConditions ?? currentHistory.chronicConditions,
      preExistingConditions:
        input.medical?.preExistingConditions ?? currentHistory.preExistingConditions,
      continuousMedications:
        input.medical?.continuousMedications ?? currentHistory.continuousMedications,
      heightCm: input.medical?.heightCm ?? currentHistory.heightCm,
      weightKg: input.medical?.weightKg ?? currentHistory.weightKg,
      bloodType: input.medical?.bloodType ?? currentHistory.bloodType,
      lifestyle: input.medical?.lifestyle ?? currentHistory.lifestyle,
      address: input.address ?? currentHistory.address,
      acceptedTerms,
      acceptedTermsAt,
    };

    const updatedEmergency = {
      ...currentEmergency,
      email: input.contact?.email ?? currentEmergency.email,
      phone: input.contact?.phone ?? currentEmergency.phone,
      whatsapp: input.contact?.whatsapp ?? currentEmergency.whatsapp,
    };

    const payload = {
      professional_id: input.professionalId ?? null,
      medical_history: updatedHistory,
      emergency_contact: updatedEmergency,
      allergies: input.medical?.allergies ?? existing.data.allergies ?? [],
      current_medications: input.medical?.medications ?? existing.data.current_medications ?? [],
      updated_at: now,
    };

    const { data, error } = await this.client
      .from('patients')
      .update(payload)
      .eq('clinic_id', input.tenantId)
      .eq('id', patientId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error('Failed to update patient', error);
      throw error || new Error('Patient not found');
    }

    return PatientMapper.toDomain(data as SupabasePatientRecord);
  }

  async transfer(input: TransferPatientInput): Promise<Patient> {
    const patientId = await this.resolvePatientIdOrThrow(input.tenantId, input);

    const { data: existingRecord, error: fetchError } = await this.client
      .from('patients')
      .select('medical_history, professional_id')
      .eq('clinic_id', input.tenantId)
      .eq('id', patientId)
      .maybeSingle<{
        medical_history: Record<string, unknown> | null;
        professional_id: string | null;
      }>();

    if (fetchError) {
      this.logger.error('Failed to load patient before transfer', fetchError);
      throw fetchError;
    }

    if (!existingRecord) {
      throw new Error('Patient not found');
    }

    const currentHistory = toJsonRecord(existingRecord.medical_history);

    const updatedHistory: Record<string, unknown> = {
      ...currentHistory,
      lastTransferReason: input.reason,
      lastTransferAt: toISODate(input.effectiveAt ?? new Date()),
    };

    const payload = {
      professional_id: input.toProfessionalId,
      medical_history: updatedHistory,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('patients')
      .update(payload)
      .eq('clinic_id', input.tenantId)
      .eq('id', patientId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error('Failed to transfer patient', error);
      throw error || new Error('Patient not found');
    }

    return PatientMapper.toDomain(data as SupabasePatientRecord);
  }

  async archive(input: ArchivePatientInput): Promise<void> {
    const patientId = await this.resolvePatientIdOrThrow(input.tenantId, input);

    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('patients')
      .select('medical_history')
      .eq('clinic_id', input.tenantId)
      .eq('id', patientId)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to load patient for archive', error);
      throw error;
    }

    if (!data) {
      throw new Error('Patient not found');
    }

    const history = (data.medical_history as Record<string, unknown>) || {};

    const updatedHistory = {
      ...history,
      status: 'inactive',
      archivedAt: now,
      archivedReason: input.reason ?? null,
    };

    const updateResult = await this.client
      .from('patients')
      .update({ medical_history: updatedHistory, updated_at: now })
      .eq('clinic_id', input.tenantId)
      .eq('id', patientId);

    if (updateResult.error) {
      this.logger.error('Failed to archive patient', updateResult.error);
      throw updateResult.error;
    }
  }

  async restore(tenantId: string, patientId: string, requestedBy: string): Promise<Patient> {
    const now = new Date().toISOString();
    const existing = await this.client
      .from('patients')
      .select('medical_history')
      .eq('clinic_id', tenantId)
      .eq('id', patientId)
      .maybeSingle();

    if (existing.error || !existing.data) {
      this.logger.error('Failed to load patient for restore', existing.error);
      throw existing.error || new Error('Patient not found');
    }

    const history = (existing.data.medical_history as Record<string, unknown>) || {};

    const updatedHistory = {
      ...history,
      status: 'active',
      archivedAt: null,
      archivedReason: null,
      restoredBy: requestedBy,
      restoredAt: now,
    };

    const { data, error } = await this.client
      .from('patients')
      .update({ medical_history: updatedHistory, updated_at: now })
      .eq('clinic_id', tenantId)
      .eq('id', patientId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error('Failed to restore patient', error);
      throw error || new Error('Patient not found');
    }

    return PatientMapper.toDomain(data as SupabasePatientRecord);
  }

  async existsByCpf(tenantId: string, cpf: string, excludePatientId?: string): Promise<boolean> {
    let query = this.client
      .from('patients')
      .select('id', { head: true, count: 'exact' })
      .eq('clinic_id', tenantId)
      .eq('medical_history->>cpf', cpf);

    if (excludePatientId) {
      query = query.neq('id', excludePatientId);
    }

    const { count, error } = await query;

    if (error) {
      this.logger.error('CPF existence check failed', error);
      throw error;
    }

    return (count ?? 0) > 0;
  }

  async findDuplicates(tenantId: string, cpf: string): Promise<PatientListItem[]> {
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('clinic_id', tenantId)
      .eq('medical_history->>cpf', cpf);

    if (error) {
      this.logger.error('Failed to search duplicates', error);
      throw error;
    }

    return (data || []).map((record: SupabasePatientRecord) => PatientMapper.toListItem(record));
  }

  async export(request: PatientExportRequest): Promise<string> {
    const payload = {
      clinic_id: request.tenantId,
      requested_by: request.requestedBy,
      requester_role: request.requesterRole,
      format: request.format,
      filters: request.filters ?? {},
      include_medical_data: request.includeMedicalData ?? false,
      status: 'pending',
    };

    const { data, error } = await this.client
      .from('patient_exports')
      .insert(payload)
      .select('file_path')
      .single();

    if (error) {
      this.logger.error('Failed to enqueue export', error);
      throw error;
    }

    return data?.file_path ?? '';
  }
}
