import {
  calculateOverrideDiff,
  hashOverridePayload,
  mergeTemplatePayload,
  TEMPLATE_OVERRIDE_UNSET_FLAG,
} from '../../../src/modules/clinic/utils/template-override.util';

describe('template-override.util', () => {
  describe('calculateOverrideDiff', () => {
    it('retorna undefined quando base e alvo são iguais', () => {
      const base = { timezone: 'UTC', allowOnline: true };
      const target = { timezone: 'UTC', allowOnline: true };

      const diff = calculateOverrideDiff(base, target);

      expect(diff).toBeUndefined();
    });

    it('identifica diferenças simples', () => {
      const base = { timezone: 'UTC', allowOnline: true };
      const target = { timezone: 'America/Sao_Paulo', allowOnline: true };

      const diff = calculateOverrideDiff(base, target);

      expect(diff).toEqual({ timezone: 'America/Sao_Paulo' });
    });

    it('marca remoções de chaves corretamente', () => {
      const base = { timezone: 'UTC', allowOnline: true };
      const target = { allowOnline: true };

      const diff = calculateOverrideDiff(base, target);

      expect(diff).toEqual({ timezone: { [TEMPLATE_OVERRIDE_UNSET_FLAG]: true } });
    });

    it('marca diferenças em profundidade', () => {
      const base = { notifications: { email: { enabled: true, quietHours: '22:00' } } };
      const target = { notifications: { email: { enabled: false, quietHours: '22:00' } } };

      const diff = calculateOverrideDiff(base, target);

      expect(diff).toEqual({ notifications: { email: { enabled: false } } });
    });
  });

  describe('mergeTemplatePayload', () => {
    it('aplica diff sobre o payload base', () => {
      const base = { timezone: 'UTC', allowOnline: true };
      const diff = { timezone: 'America/Sao_Paulo' };

      const result = mergeTemplatePayload(base, diff);

      expect(result).toEqual({ timezone: 'America/Sao_Paulo', allowOnline: true });
      expect(base).toEqual({ timezone: 'UTC', allowOnline: true });
    });

    it('remove campos quando marcado para remoção', () => {
      const base = { timezone: 'UTC', allowOnline: true };
      const diff = { timezone: { [TEMPLATE_OVERRIDE_UNSET_FLAG]: true } };

      const result = mergeTemplatePayload(base, diff);

      expect(result).toEqual({ allowOnline: true });
    });
  });

  describe('hashOverridePayload', () => {
    it('mantém hash estável para payloads equivalentes', () => {
      const payloadA = { timezone: 'UTC', allowOnline: true };
      const payloadB = { allowOnline: true, timezone: 'UTC' };

      expect(hashOverridePayload(payloadA)).toBe(hashOverridePayload(payloadB));
    });
  });
});
