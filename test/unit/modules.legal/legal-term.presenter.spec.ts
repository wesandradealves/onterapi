import { LegalTerm } from '@domain/legal/types/legal-term.types';
import { LegalTermPresenter } from '@modules/legal/api/presenters/legal-term.presenter';

const buildLegalTerm = (overrides: Partial<LegalTerm> = {}): LegalTerm => {
  const timestamp = new Date('2025-01-01T12:00:00.000Z');

  return {
    id: 'term-id',
    tenantId: 'tenant-id',
    context: 'therapeutic_plan',
    version: 'v1.0',
    content: 'Conteudo do termo',
    status: 'published',
    isActive: true,
    createdBy: 'creator-id',
    publishedAt: timestamp,
    publishedBy: 'publisher-id',
    retiredAt: timestamp,
    retiredBy: 'retirer-id',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
};

describe('LegalTermPresenter', () => {
  it('formata termo com todos os campos preenchidos', () => {
    const term = buildLegalTerm();

    const dto = LegalTermPresenter.toDto(term);

    expect(dto).toEqual({
      id: 'term-id',
      tenantId: 'tenant-id',
      context: 'therapeutic_plan',
      version: 'v1.0',
      content: 'Conteudo do termo',
      status: 'published',
      isActive: true,
      publishedAt: term.publishedAt?.toISOString() ?? null,
      createdBy: 'creator-id',
      publishedBy: 'publisher-id',
      retiredAt: term.retiredAt?.toISOString() ?? null,
      retiredBy: 'retirer-id',
      createdAt: term.createdAt.toISOString(),
      updatedAt: term.updatedAt.toISOString(),
    });
  });

  it('normaliza campos opcionais ausentes como null', () => {
    const now = new Date('2025-04-10T08:30:00.000Z');
    const term = buildLegalTerm({
      tenantId: undefined,
      createdBy: undefined,
      publishedAt: undefined,
      publishedBy: undefined,
      retiredAt: undefined,
      retiredBy: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const dto = LegalTermPresenter.toDto(term);

    expect(dto).toEqual({
      id: 'term-id',
      tenantId: null,
      context: 'therapeutic_plan',
      version: 'v1.0',
      content: 'Conteudo do termo',
      status: 'published',
      isActive: true,
      publishedAt: null,
      createdBy: null,
      publishedBy: null,
      retiredAt: null,
      retiredBy: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('converte lista de termos em lista de dtos', () => {
    const first = buildLegalTerm({ id: 'term-1', version: 'v1', content: 'Primeiro' });
    const second = buildLegalTerm({
      id: 'term-2',
      version: 'v2',
      content: 'Segundo',
      tenantId: null,
    });

    const dtos = LegalTermPresenter.toDtoList([first, second]);

    expect(dtos).toHaveLength(2);
    expect(dtos[0]).toEqual(LegalTermPresenter.toDto(first));
    expect(dtos[1]).toEqual(LegalTermPresenter.toDto(second));
  });
});
