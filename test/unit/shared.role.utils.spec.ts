import { mapRoleToDatabase, mapRoleToDomain, ROLE_DATABASE_VALUES } from '@shared/utils/role.utils';

describe('role.utils', () => {
  it('normaliza sinonimos em portugues para RolesEnum', () => {
    expect(mapRoleToDomain('SECRETARIA')).toBe('SECRETARY');
    expect(mapRoleToDomain('profissional')).toBe('PROFESSIONAL');
    expect(mapRoleToDomain('GESTOR')).toBe('MANAGER');
  });

  it('aceita valores ja normalizados', () => {
    expect(mapRoleToDomain('SUPER_ADMIN')).toBe('SUPER_ADMIN');
  });

  it('retorna undefined para valores desconhecidos', () => {
    expect(mapRoleToDomain('UNKNOWN_ROLE')).toBeUndefined();
  });

  it('mapeia para valor persistido no banco', () => {
    expect(mapRoleToDatabase('SUPER_ADMIN')).toBe('super_admin');
    expect(mapRoleToDatabase('SECRETARIA')).toBe('secretary');
  });

  it('mantem valores desconhecidos em minusculo ao mapear para banco', () => {
    expect(mapRoleToDatabase('ROLE_CUSTOM')).toBe('role_custom');
  });

  it('exibe ao menos os valores default esperados', () => {
    expect(ROLE_DATABASE_VALUES).toEqual(
      expect.arrayContaining(['super_admin', 'professional', 'secretary']),
    );
  });
});
