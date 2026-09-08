import { Component, input } from '@angular/core';
import { ProjectionPeriod } from '../study/projections';
export const FINANCIAL_ROWS: {
  key: Exclude<keyof ProjectionPeriod, 'products' | 'period'>;
  label: string;
}[] = [
  { key: 'revenue', label: 'المبيعات دون الضريبة' },
  { key: 'variableCosts', label: 'التكاليف المتغيرة' },
  { key: 'grossProfit', label: 'مجمل الربح' },
  { key: 'payroll', label: 'الرواتب' },
  { key: 'expenses', label: 'المصروفات التشغيلية' },
  { key: 'depreciation', label: 'الإهلاك' },
  { key: 'operatingProfit', label: 'الربح التشغيلي' },
  { key: 'interest', label: 'الفائدة' },
  { key: 'tax', label: 'ضريبة الربح' },
  { key: 'netProfit', label: 'صافي الربح' },
  { key: 'openingDebt', label: 'رصيد القرض أول الفترة' },
  { key: 'principal', label: 'أصل القرض المسدد' },
  { key: 'installment', label: 'مدفوعات القرض' },
  { key: 'debt', label: 'رصيد القرض آخر الفترة' },
  { key: 'purchases', label: 'مشتريات المواد' },
  { key: 'cashChange', label: 'التغير النقدي' },
  { key: 'cash', label: 'الرصيد النقدي' },
  { key: 'receivables', label: 'العملاء' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'payables', label: 'الموردون' },
  { key: 'fixedAssets', label: 'صافي الأصول الثابتة' },
  { key: 'deposits', label: 'الودائع' },
  { key: 'equity', label: 'حقوق الملكية' },
  { key: 'balanceCheck', label: 'فرق موازنة الأصول والالتزامات والحقوق' },
  { key: 'projectCashFlow', label: 'تدفق المشروع قبل التمويل' },
  { key: 'equityCashFlow', label: 'تدفق حقوق الملاك قبل التصفية' },
];
@Component({
  selector: 'app-financial-tables',
  template: `<div
    class="table-scroll"
    role="region"
    tabindex="0"
    aria-label="جدول القوائم المالية قابل للتمرير"
  >
    <table>
      <caption>
        {{
          title()
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">البند</th>
          @for (period of periods(); track period.period) {
            <th scope="col">{{ period.period }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows; track row.key) {
          <tr>
            <th scope="row">{{ row.label }}</th>
            @for (period of periods(); track period.period) {
              <td>{{ format(period[row.key]) }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  </div>`,
})
export class FinancialTables {
  readonly periods = input.required<ProjectionPeriod[]>();
  readonly title = input('القوائم المالية بعملة الدراسة');
  readonly rows = FINANCIAL_ROWS;
  format(value: string): string {
    return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(Number(value));
  }
}
