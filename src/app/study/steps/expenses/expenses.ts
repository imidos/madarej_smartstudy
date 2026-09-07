import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { NoneToggle } from '../../ui/none-toggle';
import { RowCard, confirmRowRemoval, focusLastRow } from '../../ui/row-card';
import { StudyStore } from '../../study-store';
import { newExpense, EXPENSE_CATEGORIES } from '../../study-model';
import { PERIODS } from '../../options';
@Component({
  selector: 'app-expenses',
  imports: [StudyField, NoneToggle, RowCard],
  template: `
    <div class="info-note">
      سجّل التكاليف المستمرة فقط. الرواتب محسوبة تلقائياً، وتكاليف المنتجات مسجلة في الخطوة السابقة؛
      لا تكررها هنا.
    </div>
    <app-none-toggle [field]="f.none" label="لا توجد مصروفات تشغيلية إضافية" />
    @if (!f.none().value()) {
      @for (row of f.items; track row.id().value(); let i = $index) {
        <app-row-card [title]="'المصروف ' + (i + 1)" (remove)="remove(i)"
          ><div class="fields-grid">
            <app-study-field
              [id]="'expense-category-' + i"
              label="فئة المصروف"
              [field]="row.category"
              kind="select"
              [options]="categories"
            />
            <app-study-field [id]="'expense-name-' + i" label="وصف المصروف" [field]="row.name" />
            <app-study-field
              [id]="'expense-amount-' + i"
              label="قيمة المصروف"
              [field]="row.amount"
              kind="number"
              [suffix]="store.data().project.currency"
            />
            <app-study-field
              [id]="'expense-period-' + i"
              label="دورية المصروف"
              [field]="row.period"
              kind="select"
              [options]="periods"
            /></div
        ></app-row-card>
      }
      <button type="button" class="add-button" (click)="add()">＋ إضافة مصروف</button>
    }
    <dl class="totals-list">
      <div>
        <dt>الرواتب والتكاليف المرتبطة شهرياً</dt>
        <dd>{{ store.format(store.totals().payroll) }}</dd>
      </div>
      <div>
        <dt>المصروفات الأخرى بعد تحويلها إلى شهري</dt>
        <dd>{{ store.format(store.totals().expenses) }}</dd>
      </div>
    </dl>
    <div class="total-strip">
      <span>إجمالي المصروفات التشغيلية الثابتة شهرياً</span
      ><strong>{{ store.format(store.totals().operating) }}</strong>
    </div>
  `,
})
export class Expenses {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.expenses;
  readonly categories = EXPENSE_CATEGORIES;
  readonly periods = PERIODS;
  add() {
    this.store.data.update((d) => ({
      ...d,
      expenses: { ...d.expenses, items: [...d.expenses.items, newExpense()] },
    }));
    focusLastRow();
  }
  remove(i: number) {
    if (confirmRowRemoval(this.store.data().expenses.items[i]))
      this.store.data.update((d) => ({
        ...d,
        expenses: { ...d.expenses, items: d.expenses.items.filter((_, index) => index !== i) },
      }));
  }
}
