import { BadRequestException } from '@nestjs/common';

import { validateAnamnesisStepPayload } from '@modules/anamnesis/utils/anamnesis-step-validation.util';

describe('validateAnamnesisStepPayload', () => {
  it('normalizes identification step data in strict mode', () => {
    const result = validateAnamnesisStepPayload(
      'identification',
      {
        personalInfo: {
          fullName: '  Maria   das   Dores  ',
          birthDate: '1990-01-10',
          gender: 'female',
        },
        contactInfo: {
          phone: '(11) 99999-9999',
        },
      },
      'strict',
    );

    expect(result.personalInfo?.fullName).toBe('Maria das Dores');
    expect((result.personalInfo?.birthDate as string).startsWith('1990-01-10')).toBe(true);
    expect(result.contactInfo?.phone).toBe('11999999999');
  });

  it('allows relaxed identification payload without required fields', () => {
    expect(() =>
      validateAnamnesisStepPayload(
        'identification',
        {
          personalInfo: {
            fullName: 'Ana',
          },
        },
        'relaxed',
      ),
    ).not.toThrow();
  });

  it('throws bad request for invalid identification in strict mode', () => {
    expect(() =>
      validateAnamnesisStepPayload(
        'identification',
        {
          personalInfo: {
            fullName: 'Joao',
          },
        },
        'strict',
      ),
    ).toThrow(BadRequestException);
  });

  it('computes packYears for lifestyle smoking history', () => {
    const result = validateAnamnesisStepPayload(
      'lifestyle',
      {
        smoking: {
          status: 'current',
          startAge: 20,
          cigarettesPerDay: 10,
        },
      },
      'strict',
      { patientAge: 40 },
    );

    expect(result.smoking?.packYears).toBe(10);
  });

  it('computes bmi and category for physical exam anthropometry', () => {
    const result = validateAnamnesisStepPayload(
      'physicalExam',
      {
        anthropometry: {
          height: 170,
          weight: 70,
        },
      },
      'strict',
    );

    expect(result.anthropometry?.bmi).toBeCloseTo(24.22, 2);
    expect(result.anthropometry?.bmiCategory).toBe('normal');
  });

  it('rejects anthropometry with missing paired values', () => {
    expect(() =>
      validateAnamnesisStepPayload(
        'physicalExam',
        {
          anthropometry: {
            height: 170,
          },
        },
        'strict',
      ),
    ).toThrow(BadRequestException);
  });
});
