import 'fake-indexeddb/auto';
import { DraftRepository, isDraft } from './draft-repository';
import { validDraft } from './testing/study-fixture';

describe('IndexedDB draft repository', () => {
  let repository: DraftRepository;
  beforeEach(async () => {
    repository = new DraftRepository();
    await repository.delete();
  });
  it('round-trips a draft, current step and completion state', async () => {
    const draft = validDraft();
    draft.completed = true;
    await repository.save(draft);
    expect(await repository.load()).toEqual(draft);
  });
  it('persists explicit zero and empty fields without coercion', async () => {
    const draft = validDraft();
    draft.data.investment.reserve = '';
    draft.data.investment.deposits = '0';
    await repository.save(draft);
    const restored = await repository.load();
    expect(restored?.data.investment.reserve).toBe('');
    expect(restored?.data.investment.deposits).toBe('0');
  });
  it('deletes the active draft', async () => {
    await repository.save(validDraft());
    await repository.delete();
    expect(await repository.load()).toBeUndefined();
  });
  it('rejects unsupported versions, malformed data and duplicate row IDs', () => {
    const d = validDraft();
    expect(isDraft({ ...d, version: 2 })).toBe(false);
    expect(isDraft({ ...d, step: 9 })).toBe(false);
    expect(isDraft({ ...d, data: {} })).toBe(false);
    expect(isDraft({ ...d, updatedAt: 'bad' })).toBe(false);
    d.data.products.items.push({ ...d.data.products.items[0] });
    expect(isDraft(d)).toBe(false);
  });
  it('rejects invalid logo metadata', () => {
    expect(
      isDraft({ ...validDraft(), logo: { name: 'x', type: 'image/svg+xml', size: 5, blob: {} } }),
    ).toBe(false);
  });
  it('reports unavailable storage instead of claiming a successful save', async () => {
    vi.stubGlobal('indexedDB', {
      open() {
        throw new Error('denied');
      },
    });
    try {
      await expect(repository.save(validDraft())).rejects.toThrow('denied');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
