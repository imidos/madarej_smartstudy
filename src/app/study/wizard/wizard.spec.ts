import { TestBed } from '@angular/core/testing';
import { Wizard } from './wizard';
import { StudyStore } from '../study-store';
import { DraftRepository } from '../draft-repository';
import { validDraft } from '../testing/study-fixture';
import { STEPS } from '../study-model';
import { provideRouter } from '@angular/router';

describe('Wizard screens', () => {
  const repository = { load: vi.fn(), save: vi.fn(), delete: vi.fn() };
  beforeEach(() => {
    repository.load.mockResolvedValue(validDraft());
    repository.save.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      imports: [Wizard],
      providers: [provideRouter([]), { provide: DraftRepository, useValue: repository }],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  for (let step = 0; step < STEPS.length; step++) {
    it(`renders step ${step + 1} with unique IDs and labels linked to every input`, async () => {
      const fixture = TestBed.createComponent(Wizard);
      const store = TestBed.inject(StudyStore);
      await fixture.whenStable();
      store.step.set(step);
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('#step-title')?.textContent).toBe(STEPS[step].title);
      const ids = [...root.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const control of root.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input, select, textarea')) {
        expect(control.labels?.length, `Missing label: ${control.id}`).toBeGreaterThan(0);
      }
    });
  }
  it('updates the Signal Forms model from native input and tracks interaction', async () => {
    const fixture = TestBed.createComponent(Wizard);
    const store = TestBed.inject(StudyStore);
    await fixture.whenStable();
    store.step.set(0);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector<HTMLInputElement>('#project-name-input')!;
    input.value = 'اسم جديد';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(store.data().project.name).toBe('اسم جديد');
    expect(store.form.project.name().dirty()).toBe(true);
    expect(store.form.project.name().touched()).toBe(true);
  });
  it('excludes manufacturing-only capacity from the service screen', async () => {
    const fixture = TestBed.createComponent(Wizard);
    const store = TestBed.inject(StudyStore);
    await fixture.whenStable();
    store.step.set(2);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('#operations-capacity-input')).toBeNull();
    store.form.project.sector().value.set('manufacturing');
    await fixture.whenStable();
    expect(root.querySelector('#operations-capacity-input')).not.toBeNull();
  });
});
