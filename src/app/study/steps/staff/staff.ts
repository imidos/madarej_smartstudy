import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { NoneToggle } from '../../ui/none-toggle';
import { RowCard, confirmRowRemoval, focusLastRow } from '../../ui/row-card';
import { StudyStore } from '../../study-store';
import { newEmployee } from '../../study-model';
@Component({
  selector: 'app-staff',
  imports: [StudyField, NoneToggle, RowCard],
  template: `
    <div class="info-note">
      التكلفة الإضافية تخص الموظف الواحد شهرياً، مثل التأمين والبدلات. أدخل صفراً إذا لم توجد.
    </div>
    <app-none-toggle [field]="f.none" label="لا يوجد موظفون بأجر في المشروع" />
    @if (!f.none().value()) {
      @for (row of f.items; track row.id().value(); let i = $index) {
        <app-row-card [title]="'الوظيفة ' + (i + 1)" (remove)="remove(i)"
          ><div class="fields-grid">
            <app-study-field [id]="'staff-role-' + i" label="المسمى الوظيفي" [field]="row.role" />
            <app-study-field
              [id]="'staff-count-' + i"
              label="عدد الموظفين"
              [field]="row.count"
              kind="number"
            />
            <app-study-field
              [id]="'staff-salary-' + i"
              label="راتب الموظف شهرياً"
              [field]="row.salary"
              kind="number"
              [suffix]="store.data().project.currency"
            />
            <app-study-field
              [id]="'staff-additional-' + i"
              label="تكاليف إضافية للموظف شهرياً"
              [field]="row.additional"
              kind="number"
              [suffix]="store.data().project.currency"
            /></div
        ></app-row-card>
      }
      <button type="button" class="add-button" (click)="add()">＋ إضافة وظيفة</button>
    }
    <div class="total-strip">
      <span>إجمالي الرواتب والتكاليف شهرياً</span
      ><strong>{{ store.format(store.totals().payroll) }}</strong>
    </div>
  `,
})
export class Staff {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.staff;
  add() {
    this.store.data.update((d) => ({
      ...d,
      staff: { ...d.staff, items: [...d.staff.items, newEmployee()] },
    }));
    focusLastRow();
  }
  remove(i: number) {
    if (confirmRowRemoval(this.store.data().staff.items[i]))
      this.store.data.update((d) => ({
        ...d,
        staff: { ...d.staff, items: d.staff.items.filter((_, index) => index !== i) },
      }));
  }
}
