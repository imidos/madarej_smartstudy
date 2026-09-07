import { computed, effect, inject, Service, signal } from '@angular/core';
import { form, ReadonlyFieldTree, validateTree } from '@angular/forms/signals';
import { DraftRepository } from './draft-repository';
import { financials, money } from './financials';
import {
  FeasibilityStudyDraft,
  Logo,
  newId,
  newStudy,
  SECTION_KEYS,
  StudyData,
} from './study-model';
import { studyIssues } from './study-validation';
import { StudyFinalizer } from './study-finalizer';

function childField(root: unknown, path: string[]): ReadonlyFieldTree<unknown> {
  return path.reduce<unknown>(
    (field, key) => (field as Record<string, unknown>)[key],
    root,
  ) as ReadonlyFieldTree<unknown>;
}
@Service()
export class StudyStore {
  private readonly repository = inject(DraftRepository);
  private readonly finalizer = inject(StudyFinalizer);
  readonly data = signal(newStudy());
  readonly form = form(this.data, (path) => {
    validateTree(path, ({ value, fieldTree }) =>
      studyIssues(value()).map((issue) => ({
        kind: 'study',
        message: issue.message,
        fieldTree: childField(fieldTree, issue.path),
      })),
    );
  });
  readonly step = signal(0);
  readonly logo = signal<Logo | undefined>(undefined);
  readonly ready = signal(false);
  readonly loadFailed = signal(false);
  readonly busy = signal(false);
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly savedAt = signal('');
  readonly notice = signal('');
  readonly issues = computed(() => studyIssues(this.data()));
  readonly totals = computed(() => financials(this.data()));
  private readonly completedModel = signal<StudyData | undefined>(undefined);
  private readonly completedLogo = signal<Logo | undefined>(undefined);
  readonly completed = computed(
    () => this.completedModel() === this.data() && this.completedLogo() === this.logo(),
  );
  readonly validSteps = computed(() =>
    SECTION_KEYS.map((_, i) => !this.issues().some((issue) => issue.step === i)),
  );
  readonly progress = computed(() =>
    Math.round((this.validSteps().filter(Boolean).length / 8) * 100),
  );
  private id: string = newId();
  private createdAt = new Date().toISOString();
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect((onCleanup) => {
      const snapshot = this.snapshot();
      if (!this.ready() || this.loadFailed() || this.busy()) return;
      const generation = ++this.generation;
      this.saveState.set('saving');
      this.saveTimer = setTimeout(() => {
        if (generation === this.generation) void this.enqueueSave(snapshot, generation);
      }, 450);
      onCleanup(() => this.cancelPendingSave());
    });
  }
  async load(): Promise<void> {
    this.cancelPendingSave();
    this.ready.set(false);
    this.notice.set('');
    try {
      const draft = await this.repository.load();
      if (draft) {
        this.id = draft.id;
        this.createdAt = draft.createdAt;
        this.data.set(draft.data);
        this.logo.set(draft.logo);
        this.step.set(draft.step);
        if (draft.completed && !studyIssues(draft.data).length) {
          this.completedModel.set(draft.data);
          this.completedLogo.set(draft.logo);
        }
        this.savedAt.set(draft.updatedAt);
        this.notice.set('تمت استعادة مسودتك. يمكنك المتابعة من حيث توقفت.');
      }
      this.loadFailed.set(false);
    } catch (error) {
      this.loadFailed.set(true);
      this.saveState.set('error');
      this.notice.set(
        error instanceof Error && error.message === 'invalid-draft'
          ? 'تعذر قراءة المسودة المحفوظة. أعد المحاولة أو احذفها لبدء دراسة جديدة.'
          : 'تعذر الوصول إلى التخزين على هذا الجهاز. يمكنك المتابعة دون حفظ؛ لن يتم استبدال مسودتك السابقة.',
      );
    } finally {
      this.ready.set(true);
    }
  }
  format(value: ReturnType<typeof financials>['investment']): string {
    return money(value, this.data().project.currency);
  }
  snapshot(): FeasibilityStudyDraft {
    return {
      version: 1,
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      data: this.data(),
      step: this.step(),
      completed: this.completed(),
      ...(this.logo() ? { logo: this.logo() } : {}),
    };
  }
  private enqueueSave(snapshot: FeasibilityStudyDraft, generation: number): Promise<boolean> {
    const task = this.queue.catch(() => undefined).then(() => this.repository.save(snapshot));
    this.queue = task;
    return task.then(
      () => {
        if (generation === this.generation) {
          this.saveState.set('saved');
          this.savedAt.set(snapshot.updatedAt);
        }
        return true;
      },
      () => {
        if (generation === this.generation) this.saveState.set('error');
        return false;
      },
    );
  }
  async saveNow(): Promise<boolean> {
    if (this.loadFailed()) return false;
    this.cancelPendingSave();
    this.saveState.set('saving');
    return this.enqueueSave(this.snapshot(), ++this.generation);
  }
  private cancelPendingSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
  }
  touchStep(step: number): void {
    const section = SECTION_KEYS[step];
    if (section) this.form[section]().markAsTouched();
  }
  goTo(step: number): boolean {
    if (step > this.step()) {
      const firstInvalid = this.validSteps().findIndex((valid, index) => index < step && !valid);
      if (firstInvalid !== -1) {
        this.step.set(firstInvalid);
        this.touchStep(firstInvalid);
        return false;
      }
    }
    this.step.set(step);
    return true;
  }
  async finalize(): Promise<boolean> {
    this.form().markAsTouched();
    if (this.form().invalid() || this.loadFailed()) return false;
    this.cancelPendingSave();
    this.busy.set(true);
    this.saveState.set('saving');
    ++this.generation;
    try {
      await this.queue.catch(() => undefined);
      const source = this.data(),
        logo = this.logo();
      const snapshot = await this.finalizer.finalize(this.snapshot());
      this.completedModel.set(source);
      this.completedLogo.set(logo);
      this.savedAt.set(snapshot.updatedAt);
      this.saveState.set('saved');
      return true;
    } catch {
      this.saveState.set('error');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async deleteDraft(): Promise<boolean> {
    this.cancelPendingSave();
    this.ready.set(false);
    ++this.generation;
    try {
      await this.queue.catch(() => undefined);
      await this.repository.delete();
      this.data.set(newStudy());
      this.step.set(0);
      this.logo.set(undefined);
      this.id = newId();
      this.createdAt = new Date().toISOString();
      this.completedModel.set(undefined);
      this.loadFailed.set(false);
      this.notice.set('تم حذف المسودة. ابدأ دراسة جديدة.');
      this.savedAt.set('');
      return true;
    } catch {
      this.notice.set('تعذر حذف المسودة. لم تتغير بياناتك.');
      this.saveState.set('error');
      return false;
    } finally {
      this.ready.set(true);
    }
  }
}
