import { Component, input } from '@angular/core';
import { ScenarioProjection } from '../study/projections';
import { metricRows } from './metric-rows';
@Component({
  selector: 'app-projection-details',
  template: `
    <dl class="assumption-list">
      @for (row of metrics(scenario()); track row.label) {
        <div>
          <dt>{{ row.label }}</dt>
          <dd>{{ format(row.value) }}</dd>
        </div>
      }
    </dl>
    <p>
      حالة العائد الداخلي للمشروع: {{ status(scenario().project.irrStatus) }}. للملاك:
      {{ status(scenario().equity.irrStatus) }}. القيمة غير المتاحة تعني أن المؤشر لا ينطبق أو أن
      الاسترداد لم يتحقق خلال الأفق.
    </p>
    <details>
      <summary>وحدات المنتجات والطاقة والطلب غير المخدوم</summary>
      <div class="table-scroll" role="region" tabindex="0" aria-label="جدول المنتجات السنوي">
        <table>
          <thead>
            <tr>
              <th scope="col">السنة</th>
              <th scope="col">المنتج</th>
              <th scope="col">الوحدات</th>
              <th scope="col">الطاقة</th>
              <th scope="col">الاستغلال %</th>
              <th scope="col">طلب غير مخدوم</th>
            </tr>
          </thead>
          <tbody>
            @for (year of scenario().years; track year.period) {
              @for (p of year.products; track p.id) {
                <tr>
                  <th scope="row">{{ year.period }}</th>
                  <td>{{ p.name }}</td>
                  <td>{{ format(p.units) }}</td>
                  <td>{{ format(p.capacity) }}</td>
                  <td>{{ format(p.utilization) }}</td>
                  <td>{{ format(p.unmetDemand) }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </details>
    <details>
      <summary>تدفقات التقييم الشهرية مع البداية والاسترداد النهائي</summary>
      <div class="table-scroll" role="region" tabindex="0" aria-label="جدول تدفقات التقييم">
        <table>
          <thead>
            <tr>
              <th scope="col">الفترة</th>
              <th scope="col">تدفق المشروع</th>
              <th scope="col">تدفق الملاك</th>
            </tr>
          </thead>
          <tbody>
            @for (flow of scenario().projectFlows; track $index; let i = $index) {
              <tr>
                <th scope="row">{{ i === 0 ? 'البداية' : scenario().months[i - 1].period }}</th>
                <td>{{ format(flow) }}</td>
                <td>{{ format(scenario().equityFlows[i]) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </details>
  `,
})
export class ProjectionDetails {
  readonly scenario = input.required<ScenarioProjection>();
  readonly metrics = metricRows;
  format(value: string | null): string {
    return value === null
      ? 'غير متاح'
      : new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(Number(value));
  }
  status(value: string): string {
    return value === 'ambiguous'
      ? 'ملتبس، لا يوجد معدل وحيد معتمد'
      : value === 'value'
        ? 'قابل للحساب'
        : 'غير قابل للحساب';
  }
}
