import {
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

  it('monta CreatePatientInput com data e estruturas aninhadas', () => {
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
      medications: ['inalador'],
      observations: 'Paciente com acompanhamentos mensais',
      tags: ['VIP'],
      professionalId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'active',
      tenantId: undefined,
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
        medications: payload.medications,
        observations: payload.observations,
      },
      tags: payload.tags,
      status: 'active',
    });
    expect(result.birthDate?.toISOString()).toBe(payload.birthDate);
  });

  it('mantem estrutura minima no UpdatePatientInput quando campos opcionais ausentes', () => {
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
    expect(result.medical).toBeUndefined();
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

  it('monta entrada de arquivamento com motivo e flag', () => {
    const payload: ArchivePatientSchema = {
      reason: 'Solicitado pelo paciente',
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

  it('transforma filtros e formato da exportacao', () => {
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
  });  it('usa defaults vazios quando apenas zip informado', () => {
    const payload: CreatePatientSchema = {
      fullName: 'Paciente Sem Endereco',
      cpf: '98765432100',
      zipCode: '04000000',
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
    expect(result.birthDate).toBeUndefined();
    expect(result.medical).toBeUndefined();
  });

  it('mantem medical quando apenas observacao informada', () => {
    const payload: UpdatePatientSchema = {
      observations: 'Necessita acompanhamento anual',
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result.medical).toEqual({
      allergies: undefined,
      chronicConditions: undefined,
      medications: undefined,
      observations: payload.observations,
    });
  });

  it('mantem medical quando apenas condicoes cronicas informadas', () => {
    const payload: UpdatePatientSchema = {
      chronicConditions: ['hipertensao'],
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result.medical).toEqual({
      allergies: undefined,
      chronicConditions: payload.chronicConditions,
      medications: undefined,
      observations: undefined,
    });
  });

  it('mantem medical quando apenas medicacoes informadas', () => {
    const payload: UpdatePatientSchema = {
      medications: ['Losartana 50mg'],
    };

    const result = toUpdatePatientInput('patient-slug', payload, context);

    expect(result.medical).toEqual({
      allergies: undefined,
      chronicConditions: undefined,
      medications: payload.medications,
      observations: undefined,
    });
  });
  it('omite effectiveAt quando nao informado', () => {
    const payload: TransferPatientSchema = {
      toProfessionalId: 'prof-xyz',
      reason: 'Balancear carga de atendimentos',
    };

    const result = toTransferPatientInput('patient-slug', payload, context);

    expect(result.effectiveAt).toBeUndefined();
  });

});

