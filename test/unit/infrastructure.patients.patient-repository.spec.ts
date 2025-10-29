import { PatientRepository } from '@infrastructure/patients/repositories/patient.repository';
import { SupabaseService } from '@infrastructure/auth/services/supabase.service';
import { TransferPatientInput } from '@domain/patients/types/patient.types';

describe('PatientRepository', () => {
  describe('transfer', () => {
    it('preserva o historico ao transferir o paciente', async () => {
      const existingHistory: Record<string, unknown> = {
        fullName: 'Paciente Curl Teste',
        acceptedTerms: true,
        acceptedTermsAt: '2025-09-26T07:15:07.324Z',
        tags: ['curl-test'],
      };

      const existingRecord = {
        medical_history: existingHistory,
        professional_id: 'professional-1',
      };

      const updatedRecord = {
        id: 'patient-1',
        clinic_id: 'tenant-1',
        slug: 'paciente-curl-teste',
        professional_id: 'professional-2',
        medical_history: {
          ...existingHistory,
          lastTransferReason: 'Realloc',
          lastTransferAt: '2024-01-01T00:00:00.000Z',
        },
        emergency_contact: null,
        allergies: [],
        current_medications: [],
        created_at: '2025-09-26T07:15:07.324Z',
        updated_at: '2025-09-26T07:16:22.875Z',
      };

      const selectChain = {
        eq: jest.fn(),
        maybeSingle: jest.fn(),
      };
      selectChain.eq.mockImplementation(() => selectChain);
      selectChain.maybeSingle.mockResolvedValue({ data: existingRecord, error: null });

      let lastUpdatePayload: Record<string, unknown> | null = null;

      const updateResultSelectChain = {
        single: jest.fn().mockResolvedValue({ data: updatedRecord, error: null }),
      };

      const updateResult = {
        eq: jest.fn(),
        select: jest.fn().mockReturnValue(updateResultSelectChain),
      };
      updateResult.eq.mockImplementation(() => updateResult);

      const updateMock = jest.fn().mockImplementation((payload: Record<string, unknown>) => {
        lastUpdatePayload = payload;
        return updateResult;
      });

      const client = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue(selectChain),
          update: updateMock,
        }),
      };

      const supabaseService = {
        getClient: jest.fn().mockReturnValue(client),
      } as unknown as SupabaseService;

      const repository = new PatientRepository(supabaseService);

      const input: TransferPatientInput = {
        tenantId: 'tenant-1',
        patientSlug: 'paciente-curl-teste',
        patientId: 'patient-1',
        requestedBy: 'admin-1',
        requesterRole: 'SUPER_ADMIN',
        toProfessionalId: 'professional-2',
        reason: 'Realloc',
        effectiveAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const result = await repository.transfer(input);

      expect(client.from).toHaveBeenCalledWith('patients');
      expect(selectChain.maybeSingle).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalled();
      expect(lastUpdatePayload).not.toBeNull();
      expect(lastUpdatePayload).toEqual(
        expect.objectContaining({
          professional_id: 'professional-2',
          medical_history: expect.objectContaining({
            fullName: 'Paciente Curl Teste',
            acceptedTerms: true,
            tags: ['curl-test'],
            lastTransferReason: 'Realloc',
            lastTransferAt: '2024-01-01T00:00:00.000Z',
          }),
        }),
      );

      expect(result.fullName).toBe('Paciente Curl Teste');
      expect(result.acceptedTerms).toBe(true);
      expect(result.tags).toEqual([{ id: 'curl-test', label: 'curl-test' }]);
      expect(result.professionalId).toBe('professional-2');
    });
  });

  describe('transfer with serialized medical history', () => {
    it('interprets persisted JSON strings before merging', async () => {
      const existingHistory = {
        fullName: 'Paciente Curl Teste',
        acceptedTerms: true,
        tags: ['curl-test'],
      };

      const selectChain = {
        eq: jest.fn(),
        maybeSingle: jest.fn(),
      };
      selectChain.eq.mockImplementation(() => selectChain);
      selectChain.maybeSingle.mockResolvedValue({
        data: {
          medical_history: JSON.stringify(existingHistory),
          professional_id: 'professional-1',
        },
        error: null,
      });

      const updatedRecord = {
        id: 'patient-1',
        clinic_id: 'tenant-1',
        slug: 'paciente-curl-teste',
        professional_id: 'professional-2',
        medical_history: {
          ...existingHistory,
          lastTransferReason: 'Mudan a de agenda',
        },
        emergency_contact: null,
        allergies: [],
        current_medications: [],
        created_at: '2025-09-26T07:15:07.324Z',
        updated_at: '2025-09-26T07:16:22.875Z',
      };

      const updateResultSelectChain = {
        single: jest.fn().mockResolvedValue({ data: updatedRecord, error: null }),
      };

      const updateResult = {
        eq: jest.fn(),
        select: jest.fn().mockReturnValue(updateResultSelectChain),
      };
      updateResult.eq.mockImplementation(() => updateResult);

      const updateMock = jest.fn().mockReturnValue(updateResult);

      const client = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue(selectChain),
          update: updateMock,
        }),
      };

      const supabaseService = {
        getClient: jest.fn().mockReturnValue(client),
      } as unknown as SupabaseService;

      const repository = new PatientRepository(supabaseService);

      const input: TransferPatientInput = {
        tenantId: 'tenant-1',
        patientSlug: 'paciente-curl-teste',
        requestedBy: 'admin-1',
        requesterRole: 'SUPER_ADMIN',
        toProfessionalId: 'professional-2',
        reason: 'Mudan a de agenda',
        effectiveAt: undefined,
      };

      const result = await repository.transfer(input);

      const updatePayload = updateMock.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(updatePayload.medical_history).toMatchObject({
        fullName: 'Paciente Curl Teste',
        acceptedTerms: true,
        tags: ['curl-test'],
        lastTransferReason: 'Mudan a de agenda',
      });

      expect(result.fullName).toBe('Paciente Curl Teste');
      expect(result.tags).toEqual([{ id: 'curl-test', label: 'curl-test' }]);
    });
  });
});
