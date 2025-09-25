import { mapRoleToDatabase, mapRoleToDomain, ROLE_DATABASE_VALUES } from '@shared/utils/role.utils';

describe('role.utils', () => {
  it('normaliza sinonimos em portugues para RolesEnum', () => {
    expect(mapRoleToDomain('SECRETARIA')).toBe('SECRETARY');
    expect(mapRoleToDomain('profissional')).toBe('PROFESSIONAL');
    expect(mapRoleToDomain('GESTOR')).toBe('MANAGER');
  });

  it('aceita valores ja normalizados com espacos', () => {
    expect(mapRoleToDomain('  SUPER_ADMIN  ')).toBe('SUPER_ADMIN');
  });

  it('aceita valores em minusculo via mapa interno', () => {
    expect(mapRoleToDomain('super_admin')).toBe('SUPER_ADMIN');
  });

  it('aceita valores mistos convertendo para uppercase', () => {
    expect(mapRoleToDomain('Manager')).toBe('MANAGER');
  });

  it('retorna undefined para valores desconhecidos ou vazios', () => {
    expect(mapRoleToDomain('UNKNOWN_ROLE')).toBeUndefined();
    expect(mapRoleToDomain(undefined)).toBeUndefined();
  });

  it('mapeia para valor persistido no banco usando enum direto', () => {
    expect(mapRoleToDatabase('SUPER_ADMIN')).toBe('super_admin');
  });

  it('mapeia para valor persistido usando sinonimos', () => {
    expect(mapRoleToDatabase('SECRETARIA')).toBe('secretary');
    expect(mapRoleToDatabase('professional')).toBe('professional');
  });

  it('mapeia valores mistos convertendo para uppercase', () => {
    expect(mapRoleToDatabase('Super_Admin')).toBe('super_admin');
  });

  it('mapeia valores customizados para minusculo', () => {
    expect(mapRoleToDatabase('ROLE_CUSTOM')).toBe('role_custom');
  });

  it('retorna undefined quando role nao informado', () => {
    expect(mapRoleToDatabase(undefined)).toBeUndefined();
  });

  it('exibe ao menos os valores default esperados', () => {
    expect(ROLE_DATABASE_VALUES).toEqual(
      expect.arrayContaining(['super_admin', 'professional', 'secretary']),
    );
  });
});
