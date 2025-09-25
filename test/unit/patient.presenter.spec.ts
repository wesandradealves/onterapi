import { Patient } from '@domain/patients/types/patient.types';
import { PatientPresenter } from '@modules/patients/api/presenters/patient.presenter';

const buildPatient = (overrides: Partial<Patient> = {}): Patient => {
  const now = new Date();
  return {
    id: 'patient-id',
    slug: 'patient-slug',
    tenantId: 'tenant-id',
    professionalId: 'professional-id',
    fullName: 'Paciente Teste',
    shortName: 'Paciente',
    cpf: '11122233344',
    birthDate: now,
    gender: 'F',
    maritalStatus: 'Casada',
    status: 'active',
    emailVerified: true,
    preferredLanguage: undefined,
    contact: {
      email: 'paciente@example.com',
      phone: '11999990000',
      whatsapp: '11999990000',
    },
    address: {
      zipCode: '01310000',
      street: 'Av Paulista',
      number: '1000',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      country: 'Brasil',
    },
    medical: {
      allergies: ['poeira'],
      chronicConditions: ['hipertensao'],
      medications: ['Losartana'],
      observations: 'Paciente com acompanhamento recorrente',
    },
    tags: [{ id: 'vip', label: 'VIP', color: '#ff0' }],
    riskLevel: 'medium',
    lastAppointmentAt: now,
    nextAppointmentAt: now,
    createdAt: now,
    updatedAt: now,
    archivedAt: undefined,
    ...overrides,
  };
};

describe('PatientPresenter', () => {
  it('formata list item mantendo campos opcionais', () => {
    const patient = buildPatient();
    const listItem = PatientPresenter.listItem({
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      shortName: patient.shortName,
      status: patient.status,
      riskLevel: patient.riskLevel,
      cpfMasked: '111.***.***.44',
      contact: patient.contact,
      professionalId: patient.professionalId,
      professionalName: 'Dra. Teste',
      nextAppointmentAt: patient.nextAppointmentAt,
      lastAppointmentAt: patient.lastAppointmentAt,
      tags: patient.tags,
      revenueTotal: 1000,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    });

    expect(listItem).toMatchObject({
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: '111.***.***.44',
      professionalId: patient.professionalId,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('mascara CPF e expande campos de detalhes', () => {
    const patient = buildPatient();

    const detail = PatientPresenter.detail(patient);

    expect(detail).toEqual(
      expect.objectContaining({
        id: patient.id,
        slug: patient.slug,
        cpfMasked: '111.***.***.44',
        contact: patient.contact,
        address: patient.address,
        professionalId: patient.professionalId,
        riskLevel: patient.riskLevel,
      }),
    );
    expect(detail.tags).toEqual([{ id: 'vip', label: 'VIP', color: '#ff0' }]);
  });

  it('retorna resumo com timestamps em ISO', () => {
    const patient = buildPatient();

    const summary = PatientPresenter.summary(patient);

    expect(summary.createdAt).toBe(patient.createdAt.toISOString());
    expect(summary.updatedAt).toBe(patient.updatedAt.toISOString());
  });

  it('normaliza campos quando dados opcionais nao existem', () => {
    const patient = buildPatient({
      tags: [],
      contact: {
        email: undefined,
        phone: undefined,
        whatsapp: undefined,
      },
      nextAppointmentAt: 123 as any,
      lastAppointmentAt: '2025-01-02T10:00:00.000Z',
    });

    const summary = PatientPresenter.summary(patient);
    const detail = PatientPresenter.detail(patient);
    const listItem = PatientPresenter.listItem({
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      shortName: patient.shortName,
      status: patient.status,
      riskLevel: patient.riskLevel,
      cpfMasked: '***',
      contact: patient.contact,
      professionalId: patient.professionalId,
      professionalName: undefined,
      nextAppointmentAt: patient.nextAppointmentAt,
      lastAppointmentAt: patient.lastAppointmentAt,
      tags: patient.tags,
      revenueTotal: 0,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    });

    expect(summary.tags).toBeUndefined();
    expect(summary.nextAppointmentAt).toBeUndefined();
    expect(summary.lastAppointmentAt).toBe('2025-01-02T10:00:00.000Z');
    expect(detail.tags).toEqual([]);
    expect(detail.nextAppointmentAt).toBeUndefined();
    expect(listItem.tags).toBeUndefined();
    expect(listItem.nextAppointmentAt).toBeUndefined();
    expect(listItem.lastAppointmentAt).toBe('2025-01-02T10:00:00.000Z');
  });
});
