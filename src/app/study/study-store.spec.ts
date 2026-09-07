import { TestBed } from '@angular/core/testing';
import { DraftRepository } from './draft-repository';
import { StudyStore } from './study-store';
import { StudyFinalizer } from './study-finalizer';
import { validDraft, validStudy } from './testing/study-fixture';

describe('Signal form and draft lifecycle', () => {
  const repository = { load: vi.fn(), save: vi.fn(), delete: vi.fn() };
  let store: StudyStore;
  beforeEach(() => {
    vi.resetAllMocks();
    repository.load.mockResolvedValue(undefined);
    repository.save.mockResolvedValue(undefined);
    repository.delete.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: DraftRepository, useValue: repository }],
    });
    store = TestBed.inject(StudyStore);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('binds validation to the actual leaf and step fields', () => {
    expect(store.form.project.name().invalid()).toBe(true);
    expect(store.form.project().invalid()).toBe(true);
    store.data.set(validStudy());
    expect(store.form().valid()).toBe(true);
    store.form.project.name().value.set('');
    expect(store.form.project.name().invalid()).toBe(true);
  });
  it('blocks forward jumps at the earliest missing section but permits returning', () => {
    expect(store.goTo(8)).toBe(false);
    expect(store.step()).toBe(0);
    expect(store.form.project.name().touched()).toBe(true);
    store.data.set(validStudy());
    expect(store.goTo(8)).toBe(true);
    expect(store.goTo(2)).toBe(true);
  });
  it('autosaves only after initialization and restores the last step', async () => {
    vi.useFakeTimers();
    repository.load.mockResolvedValue(validDraft());
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.save).not.toHaveBeenCalled();
    await store.load();
    expect(store.step()).toBe(4);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.save).toHaveBeenCalled();
    expect(store.saveState()).toBe('saved');
  });
  it('does not overwrite a malformed stored draft', async () => {
    vi.useFakeTimers();
    repository.load.mockRejectedValue(new Error('invalid-draft'));
    await store.load();
    store.form.project.name().value.set('مسودة جديدة');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(500);
    expect(store.loadFailed()).toBe(true);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('surfaces save failures and supports retry', async () => {
    repository.save.mockRejectedValueOnce(new Error('quota'));
    expect(await store.saveNow()).toBe(false);
    expect(store.saveState()).toBe('error');
    expect(await store.saveNow()).toBe(true);
    expect(store.saveState()).toBe('saved');
  });
  it('finalizes a valid snapshot and invalidates completion on editing', async () => {
    store.data.set(validStudy());
    expect(await store.finalize()).toBe(true);
    expect(store.completed()).toBe(true);
    expect(repository.save.mock.lastCall?.[0].completed).toBe(true);
    store.form.project.name().value.set('مشروع معدّل');
    expect(store.completed()).toBe(false);
  });
  it('does not claim completion when finalization fails', async () => {
    store.data.set(validStudy());
    repository.save.mockRejectedValue(new Error('quota'));
    expect(await store.finalize()).toBe(false);
    expect(store.completed()).toBe(false);
  });
  it('cancels a pending incomplete autosave before finalization', async () => {
    vi.useFakeTimers();
    await store.load();
    store.data.set(validStudy());
    TestBed.tick();
    await store.finalize();
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.save.mock.calls.every(([draft]) => draft.completed)).toBe(true);
  });
  it('cancels a pending autosave before deleting the draft', async () => {
    vi.useFakeTimers();
    await store.load();
    store.data.set(validStudy());
    TestBed.tick();
    await store.deleteDraft();
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.delete).toHaveBeenCalledOnce();
    expect(repository.save.mock.calls.every(([draft]) => draft.data.project.name === '')).toBe(
      true,
    );
  });
  it('validates independently at the finalization boundary', async () => {
    const finalizer = TestBed.inject(StudyFinalizer);
    const d = validDraft();
    d.data.products.items = [];
    await expect(finalizer.finalize(d)).rejects.toThrow('incomplete-study');
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('does not lose the current model when deletion fails', async () => {
    store.data.set(validStudy());
    repository.delete.mockRejectedValue(new Error('denied'));
    expect(await store.deleteDraft()).toBe(false);
    expect(store.data().project.name).toBe('مشروع تجريبي');
  });
  it('clears data, logo and completion only after successful deletion', async () => {
    store.data.set(validStudy());
    await store.finalize();
    expect(await store.deleteDraft()).toBe(true);
    expect(store.data().project.name).toBe('');
    expect(store.step()).toBe(0);
    expect(store.completed()).toBe(false);
  });
});
