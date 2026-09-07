import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { NoneToggle } from '../../ui/none-toggle';
import { RowCard, confirmRowRemoval, focusLastRow } from '../../ui/row-card';
import { StudyStore } from '../../study-store';
import { newAsset, ASSET_CATEGORIES } from '../../study-model';
@Component({
  selector: 'app-investment',
  imports: [StudyField, NoneToggle, RowCard],
  template: `
    <div class="info-note">
      أضف مصروفات ما قبل التشغيل والأصول مرة واحدة. لا تكرر الودائع أو المخزون أو الاحتياطي ضمن
      قائمة الأصول.
    </div>
    <app-none-toggle [field]="f.none" label="لا توجد أصول أو نفقات تأسيس لشرائها" />
    @if (!f.none().value()) {
      @for (row of f.items; track row.id().value(); let i = $index) {
        <app-row-card [title]="'البند الاستثماري ' + (i + 1)" (remove)="remove(i)"
          ><div class="fields-grid">
            <app-study-field
              [id]="'asset-category-' + i"
              label="فئة البند"
              [field]="row.category"
              kind="select"
              [options]="categories"
            />
            <app-study-field [id]="'asset-name-' + i" label="وصف البند" [field]="row.name" />
            <app-study-field
              [id]="'asset-quantity-' + i"
              label="الكمية"
              [field]="row.quantity"
              kind="number"
            />
            <app-study-field
              [id]="'asset-cost-' + i"
              label="تكلفة الوحدة"
              [field]="row.cost"
              kind="number"
              [suffix]="store.data().project.currency"
            /></div
        ></app-row-card>
      }
      <button type="button" class="add-button" (click)="add()">＋ إضافة أصل أو نفقة تأسيس</button>
    }
    <div class="section-divider"></div>
    <h3>مبالغ مطلوبة عند الانطلاق</h3>
    <div class="fields-grid">
      <app-study-field
        id="investment-deposits"
        label="الودائع والتأمينات"
        [field]="f.deposits"
        kind="number"
        [suffix]="store.data().project.currency"
      />
      <app-study-field
        id="investment-inventory"
        label="المخزون الأولي"
        [field]="f.inventory"
        kind="number"
        [suffix]="store.data().project.currency"
        hint="رصيد نقدي مطلوب للشراء عند البداية؛ لا يُضاف مرة ثانية إلى المصروفات الشهرية."
      />
      <app-study-field
        id="investment-reserve"
        label="احتياطي رأس المال العامل"
        [field]="f.reserve"
        kind="number"
        [suffix]="store.data().project.currency"
        hint="مبلغ نقدي لتغطية التشغيل قبل انتظام الإيرادات. أدخل صفراً إذا لم تخصص احتياطياً."
      />
    </div>
    <div class="total-strip">
      <span>إجمالي الاستثمار المطلوب</span
      ><strong>{{ store.format(store.totals().investment) }}</strong>
    </div>
  `,
})
export class Investment {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.investment;
  readonly categories = ASSET_CATEGORIES;
  add() {
    this.store.data.update((d) => ({
      ...d,
      investment: { ...d.investment, items: [...d.investment.items, newAsset()] },
    }));
    focusLastRow();
  }
  remove(i: number) {
    if (confirmRowRemoval(this.store.data().investment.items[i]))
      this.store.data.update((d) => ({
        ...d,
        investment: {
          ...d.investment,
          items: d.investment.items.filter((_, index) => index !== i),
        },
      }));
  }
}
