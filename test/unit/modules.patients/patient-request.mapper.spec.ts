import {
  __patientRequestMapperInternals,
  toArchivePatientInput,
  toCreatePatientInput,
  toExportPatientRequest,
  toPatientListFilters,
  toTransferPatientInput,
  toUpdatePatientInput,
} from '@modules/patients/api/mappers/patient-request.mapper';

import { CreatePatientSchema } from '@modules/patients/api/schemas/create-patient.schema';

import { UpdatePatientSchema } from '@modules/patients/api/schemas/update-patient.schema';

import { TransferPatientSchema } from '@modules/patients/api/schemas/transfer-patient.schema';

import { ArchivePatientSchema } from '@modules/patients/api/schemas/archive-patient.schema';

import { ExportPatientsSchema } from '@modules/patients/api/schemas/export-patients.schema';

import { ListPatientsSchema } from '@modules/patients/api/schemas/list-patients.schema';

describe('patient-request.mapper', () => {
  const context = {
    tenantId: 'tenant-001',

    userId: 'user-001',

    role: 'SUPER_ADMIN',
  };

  it('monta CreatePatientInput com campos medicos e aceite de termos', () => {
    const payload: CreatePatientSchema = {
      fullName: 'Alice Example',

      cpf: '12345678901',

      birthDate: '2025-01-01T12:00:00.000Z',

      gender: 'female',

      maritalStatus: 'single',

      email: 'alice@example.com',

      phone: '11999990000',

      whatsapp: '11988887777',

      zipCode: '01310930',

      street: 'Avenida Paulista',

      number: '1000',

      complement: 'Conjunto 101',

      district: 'Bela Vista',

      city: 'Sao Paulo',

      state: 'SP',

      country: 'Brasil',

      allergies: ['poeira'],

      chronicConditions: ['asma'],

      preExistingConditions: ['hipertensao'],

      medications: ['inalador'],

      continuousMedications: [
        { name: 'Losartana', dosage: '50mg', frequency: '1x ao dia', condition: 'Pressao alta' },

        { name: 'Vitamina D' },
      ],

      heightCm: 172,

      weightKg: 68.5,

      observations: 'Paciente com acompanhamentos mensais',

      tags: ['VIP'],

      professionalId: '550e8400-e29b-41d4-a716-446655440000',

      status: 'active',

      tenantId: undefined,

      acceptedTerms: true,

      acceptedTermsAt: '2025-01-01T12:05:00.000Z',
    };

    const result = toCreatePatientInput(payload, context);

    expect(result).toMatchObject({
      tenantId: context.tenantId,

      createdBy: context.userId,

      requesterRole: context.role,

      professionalId: payload.professionalId,

      fullName: payload.fullName,

      cpf: payload.cpf,

      gender: payload.gender,

      maritalStatus: payload.maritalStatus,

      contact: {
        email: payload.email,

        phone: payload.phone,

        whatsapp: payload.whatsapp,
      },

      address: {
        zipCode: payload.zipCode,

        street: payload.street,

        number: payload.number,

        complement: payload.complement,

        district: payload.district,

        city: payload.city,

        state: payload.state,

        country: payload.country,
      },

      medical: {
        allergies: payload.allergies,

        chronicConditions: payload.chronicConditions,

        preExistingConditions: payload.preExistingConditions,

        medications: payload.medications,

        continuousMedications: payload.continuousMedications,

        heightCm: payload.heightCm,

        weightKg: payload.weightKg,

        observations: payload.observations,
      },

      tags: payload.tags,

      status: 'active',

      acceptedTerms: true,
    });

    expect(result.birthDate?.toISOString()).toBe(payload.birthDate);

    expect(result.acceptedTermsAt?.toISOString()).toBe(payload.acceptedTermsAt);
  });

  it('omite campos vazios e mantem contrato minimo', () => {
    const payload: CreatePatientSchema = {
      fullName: 'Paciente Sem Endereco',

      cpf: '98765432100',

      zipCode: '04000000',

      acceptedTerms: true,
    };

    const result = toCreatePatientInput(payload, context);

    expect(result.address).toEqual({
      zipCode: '04000000',

      street: '',

      number: undefined,

      complement: undefined,

      district: undefined,

      city: '',

      state: '',

      country: undefined,
    });

    expect(result.medical).toBeUndefined();
  });

  it('ignora medicamentos continuos sem nome valido', () => {
    const { mapContinuousMedications } = __patientRequestMapperInternals;

    const result = mapContinuousMedications([
      { name: '   ' },
      { name: undefined, dosage: '10mg' },
      { name: 'Vitamina C  ', dosage: ' 500mg ', frequency: '1x/dia' },
    ]);

    expect(result).toEqual([
      {
        name: 'Vitamina C',
        dosage: '500mg',
        frequency: '1x/dia',
      },
    ]);
  });

  it('normaliza continuousMedications removendo entradas sem nome', () => {
    const payload: UpdatePatientSchema = {
      continuousMedications: [
        { name: 'Amiodarona', dosage: '200mg' },

        { name: '', dosage: '20mg' },

        { dosage: '10mg' } as any,
      ],
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result.medical?.continuousMedications).toEqual([
      { name: 'Amiodarona', dosage: '200mg', frequency: undefined, condition: undefined },
    ]);
  });

  it('ignora array de medicacao continua sem nomes', () => {
    const payload: UpdatePatientSchema = {
      continuousMedications: [{ dosage: '10mg' } as any],
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result.medical).toBeUndefined();
  });

  it('omite medical quando medicacao continua vazia', () => {
    const payload: CreatePatientSchema = {
      fullName: 'Paciente Sem Medicacao',

      cpf: '32165498700',

      continuousMedications: [],

      acceptedTerms: true,
    };

    const result = toCreatePatientInput(payload, context);

    expect(result.medical).toBeUndefined();
  });

  it('propaga aceite de termos no update quando informado', () => {
    const payload: UpdatePatientSchema = {
      acceptedTerms: true,

      acceptedTermsAt: '2025-02-01T10:00:00.000Z',
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result.acceptedTerms).toBe(true);

    expect(result.acceptedTermsAt?.toISOString()).toBe('2025-02-01T10:00:00.000Z');
  });

  it('mantem resultado minimo quando campos opcionais ausentes no update', () => {
    const payload: UpdatePatientSchema = {
      shortName: 'Alice',

      riskLevel: 'high',

      professionalId: null,
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result).toMatchObject({
      patientSlug: 'patient-slug',

      tenantId: context.tenantId,

      updatedBy: context.userId,

      requesterRole: context.role,

      shortName: payload.shortName,

      riskLevel: 'high',

      professionalId: undefined,
    });

    expect(result.contact).toEqual({ email: undefined, phone: undefined, whatsapp: undefined });

    expect(result.address).toBeUndefined();
  });

  it('converte campos de transferencia para o dominio', () => {
    const payload: TransferPatientSchema = {
      toProfessionalId: 'prof-002',

      reason: 'Redistribuicao de agenda',

      effectiveAt: '2025-02-01T08:30:00.000Z',
    };

    const result = toTransferPatientInput('patient-slug', payload, context);

    expect(result).toMatchObject({
      patientSlug: 'patient-slug',

      tenantId: context.tenantId,

      requestedBy: context.userId,

      requesterRole: context.role,

      toProfessionalId: payload.toProfessionalId,

      reason: payload.reason,
    });

    expect(result.effectiveAt?.toISOString()).toBe(payload.effectiveAt);
  });

  it('omite effectiveAt quando nao informado', () => {
    const payload: TransferPatientSchema = {
      toProfessionalId: 'prof-xyz',

      reason: 'Balancear carga de atendimentos',
    };

    const result = toTransferPatientInput('patient-slug', payload, context);

    expect(result.effectiveAt).toBeUndefined();
  });

  it('monta ArchivePatientInput com flags adicionais', () => {
    const payload: ArchivePatientSchema = {
      reason: 'Solicitacao do paciente',

      archiveRelatedData: true,
    };

    const result = toArchivePatientInput('patient-slug', payload, context);

    expect(result).toEqual({
      patientSlug: 'patient-slug',

      tenantId: context.tenantId,

      requestedBy: context.userId,

      requesterRole: context.role,

      reason: payload.reason,

      archiveRelatedData: payload.archiveRelatedData,
    });
  });

  it('monta payload de exportacao com filtros basicos', () => {
    const payload: ExportPatientsSchema = {
      format: 'csv',

      professionalIds: ['prof-001', 'prof-003'],

      status: ['active', 'finished'],

      quickFilter: 'inactive_30_days',

      includeMedicalData: true,

      tenantId: 'override-tenant',
    };

    const result = toExportPatientRequest(payload, context);

    expect(result).toEqual({
      tenantId: context.tenantId,

      requestedBy: context.userId,

      requesterRole: context.role,

      format: payload.format,

      includeMedicalData: payload.includeMedicalData,

      filters: {
        assignedProfessionalIds: payload.professionalIds,

        status: payload.status,

        quickFilter: payload.quickFilter,
      },
    });
  });

  it('normaliza filtros de listagem', () => {
    const payload: ListPatientsSchema = {
      query: 'ana',

      status: ['active'],

      riskLevel: ['medium'],

      professionalIds: ['prof-001'],

      tags: ['VIP'],

      quickFilter: 'needs_follow_up',

      page: 1,

      limit: 20,

      sortBy: undefined,

      sortOrder: undefined,

      tenantId: undefined,
    };

    const result = toPatientListFilters(payload);

    expect(result).toEqual({
      query: payload.query,

      status: payload.status,

      riskLevel: payload.riskLevel,

      assignedProfessionalIds: payload.professionalIds,

      tags: payload.tags,

      quickFilter: payload.quickFilter,
    });
  });

  it('retorna undefined quando continuousMedications nao informado', () => {
    const result = __patientRequestMapperInternals.mapContinuousMedications(undefined);

    expect(result).toBeUndefined();
  });
});
