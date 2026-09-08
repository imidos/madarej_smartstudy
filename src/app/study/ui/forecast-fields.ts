import { Component, inject, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { StudyStore } from '../study-store';
import { ProjectionAssumptions } from '../projection-assumptions';
import { StudyField } from './study-field/study-field';

export interface AssumptionField {
  key: keyof ProjectionAssumptions;
  label: string;
  step: number;
  kind?: 'text' | 'textarea';
  optional?: boolean;
}
export const ASSUMPTION_FIELDS: AssumptionField[] = [
  { key: 'startDate', label: 'تاريخ بدء التشغيل (YYYY-MM-DD)', step: 0, kind: 'text' },
  { key: 'rampMonths', label: 'عدد أشهر الوصول للتشغيل المستقر', step: 0 },
  { key: 'rampPercent', label: 'نسبة المبيعات في بداية التشغيل (%)', step: 0 },
  { key: 'marketSize', label: 'حجم السوق التقديري بعملة الدراسة', step: 1, optional: true },
  { key: 'marketYear', label: 'سنة تقدير حجم السوق', step: 1, optional: true },
  {
    key: 'marketGeography',
    label: 'النطاق الجغرافي لتقدير السوق',
    step: 1,
    kind: 'text',
    optional: true,
  },
  {
    key: 'sourceLinks',
    label: 'روابط المصادر — رابط كامل في كل سطر',
    step: 1,
    kind: 'textarea',
    optional: true,
  },
  {
    key: 'competitorDetails',
    label: 'أسعار المنافسين وحصصهم ونقاط ضعفهم المعروفة',
    step: 1,
    kind: 'textarea',
    optional: true,
  },
  { key: 'salaryGrowth', label: 'زيادة الرواتب السنوية (%)', step: 3 },
  { key: 'priceGrowth', label: 'تغير أسعار البيع السنوي لجميع المنتجات (%)', step: 4 },
  { key: 'unitCostGrowth', label: 'تغير تكلفة الوحدة السنوي لجميع المنتجات (%)', step: 4 },
  { key: 'capacityGrowth', label: 'تغير الطاقة الشهرية السنوي لجميع المنتجات (%)', step: 4 },
  { key: 'expenseGrowth', label: 'زيادة المصروفات التشغيلية السنوية (%)', step: 5 },
  { key: 'receivableDays', label: 'متوسط أيام التحصيل من العملاء', step: 6 },
  { key: 'inventoryDays', label: 'متوسط أيام الاحتفاظ بمخزون المواد', step: 6 },
  { key: 'payableDays', label: 'متوسط أيام سداد الموردين', step: 6 },
  { key: 'minimumCash', label: 'الحد الأدنى المطلوب للرصيد النقدي', step: 6 },
  { key: 'profitTax', label: 'معدل الضريبة الفعلي على الأرباح (%)', step: 7 },
  { key: 'discountRate', label: 'معدل الخصم السنوي لتقييم الاستثمار (%)', step: 7 },
  { key: 'terminalRecovery', label: 'نسبة استرداد الأصول والودائع في نهاية الدراسة (%)', step: 7 },
  { key: 'optimisticSales', label: 'السيناريو المتفائل: تغير المبيعات (%)', step: 7 },
  { key: 'optimisticCosts', label: 'السيناريو المتفائل: تغير تكلفة الوحدة (%)', step: 7 },
  { key: 'pessimisticSales', label: 'السيناريو المتحفظ: تغير المبيعات (%)', step: 7 },
  { key: 'pessimisticCosts', label: 'السيناريو المتحفظ: تغير تكلفة الوحدة (%)', step: 7 },
];
@Component({
  selector: 'app-forecast-fields',
  imports: [StudyField, FormField],
  template: `
    @if (step() !== 2 && step() !== 8) {
      <details class="forecast-assumptions" open>
        <summary>افتراضات الدراسة المالية والتحليل</summary>
        <p class="fine-print">
          راجع الافتراضات قبل المتابعة. الصفر يعني عدم وجود تغير أو تكلفة. لا نفترض ضرائب أو أسعاراً
          بناءً على الدولة.
        </p>
        <div class="fields-grid">
          @for (item of fields; track item.key) {
            @if (item.step === step()) {
              <app-study-field
                [id]="'assumption-' + item.key"
                [label]="item.label"
                [field]="store.form.assumptions[item.key]"
                [kind]="item.kind ?? 'number'"
                [required]="!item.optional"
              />
            }
          }
        </div>
        @if (step() === 6 && !store.data().investment.none) {
          @for (asset of store.form.investment.items; track asset.id().value(); let i = $index) {
            @if (asset.category().value() !== 'establishment') {
              <div class="row-card">
                <h3>{{ asset.name().value() || 'الأصل ' + (i + 1) }}</h3>
                <label class="none-toggle"
                  ><input type="checkbox" [formField]="asset.depreciable" /> أصل قابل للإهلاك</label
                >
                @if (asset.depreciable().value()) {
                  <div class="fields-grid">
                    <app-study-field
                      [id]="'asset-life-' + i"
                      label="العمر الإنتاجي بالسنوات"
                      [field]="asset.usefulLife"
                      kind="number"
                    />
                    <app-study-field
                      [id]="'asset-residual-' + i"
                      label="القيمة المتبقية للوحدة"
                      [field]="asset.residualValue"
                      kind="number"
                    />
                  </div>
                }
              </div>
            }
          }
        }
      </details>
    }
  `,
})
export class ForecastFields {
  readonly store = inject(StudyStore);
  readonly step = input.required<number>();
  readonly fields = ASSUMPTION_FIELDS;
}
