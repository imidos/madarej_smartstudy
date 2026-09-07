import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { StudyStore } from '../study-store';
import { STEPS } from '../study-model';
import { Overview } from '../steps/overview/overview';
import { Market } from '../steps/market/market';
import { Operations } from '../steps/operations/operations';
import { Staff } from '../steps/staff/staff';
import { Products } from '../steps/products/products';
import { Expenses } from '../steps/expenses/expenses';
import { Investment } from '../steps/investment/investment';
import { Financing } from '../steps/financing/financing';
import { Review } from '../steps/review/review';
@Component({
  selector: 'app-wizard',
  imports: [Overview, Market, Operations, Staff, Products, Expenses, Investment, Financing, Review],
  templateUrl: './wizard.html',
})
export class Wizard implements OnInit {
  readonly store = inject(StudyStore);
  readonly steps = STEPS;
  readonly attempted = signal(false);
  readonly current = computed(() => STEPS[this.store.step()]);
  readonly currentIssues = computed(() =>
    this.store.issues().filter((i) => i.step === this.store.step()),
  );
  readonly saveLabel = computed(
    () =>
      ({
        idle: 'الحفظ التلقائي مفعّل',
        saving: 'جارٍ حفظ التغييرات…',
        saved: 'تم حفظ المسودة',
        error: 'التغييرات غير محفوظة',
      })[this.store.saveState()],
  );
  readonly savedTime = computed(() =>
    this.store.savedAt()
      ? new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(
          new Date(this.store.savedAt()),
        )
      : '',
  );
  ngOnInit(): void {
    void this.store.load();
  }
  skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById('study-content')?.focus();
  }
  navigate(step: number): void {
    const success = this.store.goTo(step);
    this.attempted.set(!success);
    requestAnimationFrame(() => this.focus(!success));
  }
  private focus(error: boolean): void {
    const target = error
      ? (document.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        document.getElementById('step-errors'))
      : document.getElementById('step-title');
    target?.focus();
    target?.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
  async advance(): Promise<void> {
    if (this.store.step() < 8) {
      this.navigate(this.store.step() + 1);
      if (!this.attempted()) await this.store.saveNow();
      return;
    }
    if (this.store.issues().length) {
      this.navigate(this.store.issues()[0].step);
      this.store.touchStep(this.store.step());
      this.attempted.set(true);
      requestAnimationFrame(() => this.focus(true));
      return;
    }
    if (await this.store.finalize())
      requestAnimationFrame(() => document.getElementById('completion-title')?.focus());
  }
  async discard(): Promise<void> {
    if (
      !window.confirm(
        'سيتم حذف المسودة وشعار المشروع من هذا الجهاز نهائياً. هل تريد بدء دراسة جديدة؟',
      )
    )
      return;
    if (await this.store.deleteDraft()) {
      this.attempted.set(false);
      requestAnimationFrame(() => this.focus(false));
    }
  }
}
