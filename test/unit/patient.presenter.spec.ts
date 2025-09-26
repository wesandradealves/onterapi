import { Patient, PatientListItem } from '@domain/patients/types/patient.types';
import { PatientPresenter } from '@modules/patients/api/presenters/patient.presenter';

const buildPatient = (overrides: Partial<Patient> = {}): Patient => {
  const now = new Date('2025-01-05T10:00:00.000Z');

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
      complement: 'Conjunto 101',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      country: 'Brasil',
    },
    medical: {
      allergies: ['poeira'],
      chronicConditions: ['hipertensao'],
      preExistingConditions: ['diabetes'],
      medications: ['Losartana'],
      continuousMedications: [
        { name: 'Losartana', dosage: '50mg', frequency: '1x ao dia', condition: 'Pressao alta' },
      ],
      heightCm: 168,
      weightKg: 70,
      observations: 'Paciente com acompanhamento recorrente',
      bloodType: 'O+',
      lifestyle: 'Ativo',
    },
    tags: [{ id: 'vip', label: 'VIP', color: '#ff0' }],
    riskLevel: 'medium',
    lastAppointmentAt: now,
    nextAppointmentAt: now,
    acceptedTerms: true,
    acceptedTermsAt: now,
    createdAt: now,
    updatedAt: now,
    archivedAt: undefined,
    ...overrides,
  };
};

const buildListItem = (
  patient: Patient,
  overrides: Partial<PatientListItem> = {},
): PatientListItem => ({
  id: patient.id,
  slug: patient.slug,
  fullName: patient.fullName,
  shortName: patient.shortName,
  status: patient.status,
  riskLevel: patient.riskLevel,
  cpfMasked: '111.***.***.44',
  contact: {
    email: patient.contact.email,
    phone: patient.contact.phone,
    whatsapp: patient.contact.whatsapp,
  },
  medical: patient.medical,
  acceptedTerms: patient.acceptedTerms,
  acceptedTermsAt: patient.acceptedTermsAt,
  professionalId: patient.professionalId,
  professionalName: 'Dra. Teste',
  nextAppointmentAt: patient.nextAppointmentAt,
  lastAppointmentAt: patient.lastAppointmentAt,
  tags: patient.tags,
  revenueTotal: 1000,
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt,
  ...overrides,
});

describe('PatientPresenter', () => {
  it('formata list item expondo campos medicos e aceite de termos', () => {
    const patient = buildPatient();

    const presented = PatientPresenter.listItem(buildListItem(patient));

    expect(presented).toMatchObject({
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      status: patient.status,
      cpfMasked: '111.***.***.44',
      professionalId: patient.professionalId,
      acceptedTerms: true,
      acceptedTermsAt: patient.acceptedTermsAt?.toISOString(),
      medical: {
        allergies: ['poeira'],
        chronicConditions: ['hipertensao'],
        preExistingConditions: ['diabetes'],
        medications: ['Losartana'],
        continuousMedications: [
          {
            name: 'Losartana',
            dosage: '50mg',
            frequency: '1x ao dia',
            condition: 'Pressao alta',
          },
        ],
        heightCm: 168,
        weightKg: 70,
        observations: 'Paciente com acompanhamento recorrente',
        bloodType: 'O+',
        lifestyle: 'Ativo',
      },
    });

    expect(presented.createdAt).toBe(patient.createdAt.toISOString());
    expect(presented.updatedAt).toBe(patient.updatedAt.toISOString());
    expect(presented.tags).toEqual(['VIP']);
  });

  it('mantem datas em formato string ao apresentar list item', () => {
    const patient = buildPatient();
    const listItem = buildListItem(patient, {
      nextAppointmentAt: '2025-05-05T12:00:00.000Z' as unknown as Date,
      lastAppointmentAt: '2025-06-06T12:00:00.000Z' as unknown as Date,
      createdAt: '2024-12-31T10:00:00.000Z' as unknown as Date,
      updatedAt: '2025-01-15T10:00:00.000Z' as unknown as Date,
    });

    const presented = PatientPresenter.listItem(listItem);

    expect(presented.nextAppointmentAt).toBe('2025-05-05T12:00:00.000Z');
    expect(presented.lastAppointmentAt).toBe('2025-06-06T12:00:00.000Z');
    expect(presented.createdAt).toBe('2024-12-31T10:00:00.000Z');
    expect(presented.updatedAt).toBe('2025-01-15T10:00:00.000Z');
  });

  it('mascara CPF e inclui tagDetails e contato no detalhe', () => {
    const patient = buildPatient();

    const detail = PatientPresenter.detail(patient);

    expect(detail).toEqual(
      expect.objectContaining({
        id: patient.id,
        slug: patient.slug,
        cpfMasked: '111.***.***.44',
        professionalId: patient.professionalId,
        riskLevel: patient.riskLevel,
        acceptedTerms: true,
        acceptedTermsAt: patient.acceptedTermsAt?.toISOString(),
        contact: {
          email: 'paciente@example.com',
          phone: '11999990000',
          whatsapp: '11999990000',
        },
        address: patient.address,
        medical: expect.objectContaining({
          continuousMedications: [
            expect.objectContaining({
              name: 'Losartana',
              dosage: '50mg',
              frequency: '1x ao dia',
              condition: 'Pressao alta',
            }),
          ],
        }),
      }),
    );

    expect(detail.tags).toEqual(['VIP']);
    expect(detail.tagDetails).toEqual([{ id: 'vip', label: 'VIP', color: '#ff0' }]);
  });

  it('omite contato, endereco e medicacoes continuas quando ausentes', () => {
    const patient = buildPatient({
      contact: undefined as unknown as Patient['contact'],
      address: undefined,
      tags: [{ id: 'blank', label: ' ', color: undefined }],
      medical: {
        allergies: [],
        chronicConditions: [],
        preExistingConditions: [],
        medications: [],
        continuousMedications: [{ name: '' }],
        observations: undefined,
        bloodType: undefined,
        lifestyle: undefined,
        heightCm: undefined,
        weightKg: undefined,
      },
    });

    const detail = PatientPresenter.detail(patient);
    expect(detail.contact).toBeUndefined();
    expect(detail.address).toBeUndefined();
    expect(detail.medical).toBeUndefined();
    expect(detail.tagDetails).toEqual([{ id: 'blank', label: ' ', color: undefined }]);

    const listItem: PatientListItem = {
      id: patient.id,
      slug: patient.slug,
      fullName: patient.fullName,
      shortName: patient.shortName,
      status: patient.status,
      riskLevel: patient.riskLevel,
      cpfMasked: '***',
      contact: { email: undefined, phone: undefined, whatsapp: undefined },
      medical: patient.medical,
      acceptedTerms: patient.acceptedTerms,
      acceptedTermsAt: patient.acceptedTermsAt,
      professionalId: patient.professionalId,
      professionalName: undefined,
      nextAppointmentAt: patient.nextAppointmentAt,
      lastAppointmentAt: patient.lastAppointmentAt,
      tags: patient.tags,
      revenueTotal: 0,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };

    const presented = PatientPresenter.listItem(listItem);
    expect(presented.medical).toBeUndefined();
    expect(presented.tags).toBeUndefined();
  });

  it('normaliza campos quando dados opcionais ausentes', () => {
    const patient = buildPatient({
      tags: [],
      contact: {
        email: undefined,
        phone: undefined,
        whatsapp: undefined,
      },
      address: {
        zipCode: undefined,
        street: undefined,
        number: undefined,
        complement: undefined,
        district: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
      },
      medical: {
        allergies: [],
        chronicConditions: [],
        preExistingConditions: [],
        medications: [],
        continuousMedications: [],
        observations: undefined,
        bloodType: undefined,
        lifestyle: undefined,
        heightCm: undefined,
        weightKg: undefined,
      },
      nextAppointmentAt: 123 as unknown as Date,
      lastAppointmentAt: undefined,
    });

    const summary = PatientPresenter.summary(patient);
    const detail = PatientPresenter.detail(patient);
    const listItem = PatientPresenter.listItem(
      buildListItem(patient, {
        medical: undefined,
        tags: undefined,
        acceptedTerms: false,
        acceptedTermsAt: undefined,
        contact: { email: undefined, phone: undefined, whatsapp: undefined },
      }),
    );

    expect(summary.tags).toBeUndefined();
    expect(summary.medical).toBeUndefined();
    expect(detail.medical).toBeUndefined();
    expect(detail.tagDetails).toBeUndefined();
    expect(detail.contact).toBeUndefined();
    expect(detail.address).toBeUndefined();
    expect(listItem.tags).toBeUndefined();
    expect(listItem.medical).toBeUndefined();
    expect(listItem.acceptedTerms).toBe(false);
    expect(listItem.acceptedTermsAt).toBeUndefined();
    expect(listItem.nextAppointmentAt).toBeUndefined();
    expect(listItem.lastAppointmentAt).toBeUndefined();
  });
});
