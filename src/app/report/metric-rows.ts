import { ScenarioProjection } from '../study/projections';
export function metricRows(s: ScenarioProjection): { label: string; value: string | null }[] {
  return [
    { label: 'هامش مجمل الربح (%)', value: s.grossMargin },
    { label: 'هامش التشغيل (%)', value: s.operatingMargin },
    { label: 'هامش صافي الربح (%)', value: s.netMargin },
    { label: 'صافي القيمة الحالية للمشروع', value: s.project.npv },
    { label: 'العائد الداخلي السنوي للمشروع (%)', value: s.project.irr },
    { label: 'الاسترداد للمشروع بالأشهر', value: s.project.paybackMonths },
    { label: 'الاسترداد المخصوم للمشروع بالأشهر', value: s.project.discountedPaybackMonths },
    { label: 'صافي القيمة الحالية للملاك', value: s.equity.npv },
    { label: 'العائد الداخلي السنوي للملاك (%)', value: s.equity.irr },
    { label: 'الاسترداد للملاك بالأشهر', value: s.equity.paybackMonths },
    { label: 'الاسترداد المخصوم للملاك بالأشهر', value: s.equity.discountedPaybackMonths },
    { label: 'تغطية خدمة الدين', value: s.dscr },
    { label: 'مبيعات التعادل السنوية', value: s.breakEvenRevenue },
    { label: 'وحدات تعادل سلة المبيعات السنوية', value: s.breakEvenUnits },
    { label: 'أقل رصيد نقدي', value: s.minimumCash },
    { label: 'التمويل الإضافي اللازم للحد الأدنى النقدي', value: s.fundingShortfall },
  ];
}
