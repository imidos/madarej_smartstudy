import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { RowCard, confirmRowRemoval, focusLastRow } from '../../ui/row-card';
import { StudyStore } from '../../study-store';
import { newProduct } from '../../study-model';
import { unitCost } from '../../financials';
@Component({
  selector: 'app-products',
  imports: [StudyField, RowCard],
  template: `
    <div class="info-note">
      أدخل تكاليف الوحدة الواحدة دون ضريبة مبيعات قابلة للاسترداد. العمالة الإضافية لا تشمل الرواتب
      المسجلة سابقاً. أدخل صفراً للتكاليف غير الموجودة.
    </div>
    @for (row of f.items; track row.id().value(); let i = $index) {
      <app-row-card [title]="'المنتج أو الخدمة ' + (i + 1)" (remove)="remove(i)">
        <div class="fields-grid">
          <app-study-field
            class="full-width"
            [id]="'product-name-' + i"
            label="اسم المنتج أو الخدمة"
            [field]="row.name"
          />
          <app-study-field
            [id]="'product-price-' + i"
            label="سعر بيع الوحدة شامل الضريبة"
            [field]="row.price"
            kind="number"
            [suffix]="store.data().project.currency"
          />
          <app-study-field
            [id]="'product-tax-' + i"
            label="ضريبة المبيعات"
            [field]="row.tax"
            kind="number"
            suffix="%"
          />
          <app-study-field
            [id]="'product-sales-' + i"
            label="المبيعات الشهرية المتوقعة بالوحدات"
            [field]="row.sales"
            kind="number"
          />
          <app-study-field
            [id]="'product-capacity-' + i"
            label="القدرة الشهرية القصوى بالوحدات"
            [field]="row.capacity"
            kind="number"
          />
          <app-study-field
            [id]="'product-growth-' + i"
            label="نمو حجم المبيعات السنوي"
            [field]="row.growth"
            kind="number"
            suffix="%"
            hint="يمكن إدخال نسبة سالبة عند توقع انخفاض المبيعات."
          />
        </div>
        <h4 class="subheading">تكلفة الوحدة الواحدة</h4>
        <details class="forecast-assumptions">
          <summary>تغيرات سنوية خاصة بهذا المنتج</summary>
          <p>اتركها فارغة لاستخدام الافتراض العام أدناه. أدخل صفراً لتثبيت القيمة لهذا المنتج.</p>
          <div class="fields-grid">
            <app-study-field
              [id]="'price-growth-' + i"
              label="التغير السنوي في سعر البيع (%)"
              [field]="row.priceGrowth"
              kind="number"
              [required]="false"
            />
            <app-study-field
              [id]="'cost-growth-' + i"
              label="التغير السنوي في تكلفة الوحدة (%)"
              [field]="row.costGrowth"
              kind="number"
              [required]="false"
            />
            <app-study-field
              [id]="'capacity-growth-' + i"
              label="التغير السنوي في الطاقة (%)"
              [field]="row.capacityGrowth"
              kind="number"
              [required]="false"
            />
          </div>
        </details>
        <div class="fields-grid three-columns">
          <app-study-field
            [id]="'product-materials-' + i"
            label="المواد الخام"
            [field]="row.materials"
            kind="number"
            [suffix]="store.data().project.currency"
          />
          <app-study-field
            [id]="'product-labor-' + i"
            label="العمالة الإضافية"
            [field]="row.labor"
            kind="number"
            [suffix]="store.data().project.currency"
          />
          <app-study-field
            [id]="'product-commissions-' + i"
            label="البيع والعمولات"
            [field]="row.commissions"
            kind="number"
            [suffix]="store.data().project.currency"
          />
          <app-study-field
            [id]="'product-packaging-' + i"
            label="التعبئة والتغليف"
            [field]="row.packaging"
            kind="number"
            [suffix]="store.data().project.currency"
          />
          <app-study-field
            [id]="'product-other-' + i"
            label="تكاليف أخرى"
            [field]="row.other"
            kind="number"
            [suffix]="store.data().project.currency"
          />
        </div>
        <div class="row-total">
          <span>إجمالي تكلفة الوحدة</span
          ><strong>{{ store.format(cost(store.data().products.items[i])) }}</strong>
        </div>
      </app-row-card>
    }
    <button type="button" class="add-button" (click)="add()">＋ إضافة منتج أو خدمة</button>
    <div class="total-strip">
      <span>المبيعات الشهرية المتوقعة دون الضريبة</span
      ><strong>{{ store.format(store.totals().revenue) }}</strong>
    </div>
  `,
})
export class Products {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.products;
  readonly cost = unitCost;
  add() {
    this.store.data.update((d) => ({
      ...d,
      products: { items: [...d.products.items, newProduct()] },
    }));
    focusLastRow();
  }
  remove(i: number) {
    if (confirmRowRemoval(this.store.data().products.items[i]))
      this.store.data.update((d) => ({
        ...d,
        products: { items: d.products.items.filter((_, index) => index !== i) },
      }));
  }
}
