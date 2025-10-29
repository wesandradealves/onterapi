import 'reflect-metadata';

if (!process.env.CLINIC_INVITATION_TOKEN_SECRET) {
  process.env.CLINIC_INVITATION_TOKEN_SECRET = 'test-invitation-secret';
}

// Ajusta timeout padrao para testes de integracao/E2E.
jest.setTimeout(30000);
