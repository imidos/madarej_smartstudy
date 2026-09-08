import { FinancialProjection } from '../study/projections';
import { StudyData } from '../study/study-model';
import { normalizeNumber } from '../study/financials';
export interface ReportChartData {
  id: string;
  title: string;
  description: string;
  type: 'bar' | 'line' | 'doughnut';
  labels: string[];
  series: { label: string; values: number[] }[];
}
export function reportCharts(p: FinancialProjection, data: StudyData): ReportChartData[] {
  const base = p.scenarios[0],
    years = base.years,
    labels = years.map((y) => y.period);
  let cumulative = 0;
  return [
    {
      id: 'performance',
      title: 'المبيعات والتكاليف والأرباح',
      description: 'قيم سنوية بعملة الدراسة دون ضريبة المبيعات.',
      type: 'bar',
      labels,
      series: [
        { label: 'المبيعات', values: years.map((y) => Number(y.revenue)) },
        {
          label: 'تكاليف التشغيل',
          values: years.map(
            (y) => Number(y.variableCosts) + Number(y.payroll) + Number(y.expenses),
          ),
        },
        { label: 'صافي الربح', values: years.map((y) => Number(y.netProfit)) },
      ],
    },
    {
      id: 'products',
      title: 'مزيج المبيعات في السنة الأولى',
      description: 'حصة كل منتج من الإيراد المتوقع.',
      type: 'doughnut',
      labels: years[0].products.map((p) => p.name),
      series: [{ label: 'الإيراد', values: years[0].products.map((p) => Number(p.revenue)) }],
    },
    {
      id: 'investment',
      title: 'توزيع الاستثمار المبدئي',
      description: 'الأصول والتأسيس والودائع والمخزون والسيولة الافتتاحية.',
      type: 'doughnut',
      labels: ['الأصول والتأسيس', 'الودائع', 'المخزون الأولي', 'احتياطي السيولة'],
      series: [
        {
          label: 'المبلغ',
          values: [
            Number(p.investment) -
              Number(normalizeNumber(data.investment.deposits)) -
              Number(normalizeNumber(data.investment.inventory)) -
              Number(normalizeNumber(data.investment.reserve)),
            Number(normalizeNumber(data.investment.deposits)),
            Number(normalizeNumber(data.investment.inventory)),
            Number(normalizeNumber(data.investment.reserve)),
          ],
        },
      ],
    },
    {
      id: 'costs',
      title: 'تركيب تكاليف السنة الأولى',
      description: 'الرواتب مستقلة عن التكاليف المتغيرة ولا تحتسب مرتين.',
      type: 'doughnut',
      labels: ['تكاليف متغيرة', 'رواتب', 'مصروفات تشغيلية'],
      series: [
        {
          label: 'المبلغ',
          values: [
            Number(years[0].variableCosts),
            Number(years[0].payroll),
            Number(years[0].expenses),
          ],
        },
      ],
    },
    {
      id: 'cash',
      title: 'السيولة والتدفقات المتراكمة',
      description:
        'رصيد نهاية السنة والتدفق النقدي التشغيلي والتمويلي المتراكم، قبل التصفية الافتراضية.',
      type: 'line',
      labels,
      series: [
        { label: 'الرصيد النقدي', values: years.map((y) => Number(y.cash)) },
        {
          label: 'التدفق المتراكم',
          values: years.map((y) => (cumulative += Number(y.cashChange))),
        },
      ],
    },
    {
      id: 'debt',
      title: 'سداد القرض',
      description: 'توزيع المدفوعات السنوية بين أصل القرض والفائدة.',
      type: 'bar',
      labels,
      series: [
        { label: 'أصل القرض', values: years.map((y) => Number(y.principal)) },
        { label: 'الفائدة', values: years.map((y) => Number(y.interest)) },
      ],
    },
    {
      id: 'breakeven',
      title: 'المبيعات ونقطة التعادل',
      description:
        'تعادل تشغيلي للسنة الأولى يشمل الإهلاك، قبل الفائدة والضرائب؛ يحافظ على مزيج المبيعات المتوقع.',
      type: 'bar',
      labels: ['السنة الأولى'],
      series: [
        { label: 'المبيعات المتوقعة', values: [Number(years[0].revenue)] },
        ...(base.breakEvenRevenue === null
          ? []
          : [{ label: 'مبيعات التعادل', values: [Number(base.breakEvenRevenue)] }]),
      ],
    },
    {
      id: 'scenarios',
      title: 'صافي القيمة الحالية بحسب السيناريو',
      description: 'حساسية افتراضية وليست احتمالاً أو ضماناً للنتيجة.',
      type: 'bar',
      labels: ['الأساسي', 'المتفائل', 'المتحفظ'],
      series: [
        { label: 'صافي القيمة الحالية', values: p.scenarios.map((s) => Number(s.project.npv)) },
      ],
    },
    {
      id: 'sensitivity',
      title: 'حساسية القيمة الحالية لحجم المبيعات',
      description: 'تغيير المبيعات وحدها مع ثبات باقي الافتراضات واحترام الطاقة المتاحة.',
      type: 'line',
      labels: p.sensitivity.map((s) => s.label),
      series: [{ label: 'صافي القيمة الحالية', values: p.sensitivity.map((s) => Number(s.npv)) }],
    },
  ];
}
