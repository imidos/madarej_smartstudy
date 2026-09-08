import { StudyData } from '../study/study-model';
import { normalizeNumber } from '../study/financials';

export function inputCaveats(data: StudyData): string[] {
  const assumptions = data.assumptions;
  const caveats: string[] = [];
  const isZero = (value: string) => normalizeNumber(value).trim() === '0';
  if (!assumptions.marketSize.trim() && !assumptions.sourceLinks.trim())
    caveats.push('لم يقدّم العميل حجم سوق أو مصادر سوقية؛ لا يمكن اعتبار تقدير الطلب متحققاً.');
  if (data.market.none && !assumptions.competitorDetails.trim())
    caveats.push('لم تُدرج أسماء منافسين أو بيانات مقارنة؛ يجب التحقق من المنافسة قبل اتخاذ القرار.');
  if (isZero(assumptions.rampMonths))
    caveats.push('يفترض النموذج بدء المبيعات بكامل الحجم من الشهر الأول دون فترة تدرج.');
  if (isZero(assumptions.receivableDays))
    caveats.push('يفترض النموذج تحصيل المبيعات فوراً؛ أي تأخير فعلي سيؤثر في السيولة.');
  if (
    isZero(assumptions.priceGrowth) &&
    isZero(assumptions.unitCostGrowth) &&
    isZero(assumptions.salaryGrowth) &&
    isZero(assumptions.expenseGrowth)
  )
    caveats.push('تفترض الدراسة ثبات الأسعار والتكاليف والرواتب والمصروفات طوال المدة.');
  if (isZero(assumptions.profitTax))
    caveats.push('معدل ضريبة الأرباح مدخل بصفر؛ يلزم التحقق من المعالجة الضريبية الملائمة.');
  if (
    !data.investment.none &&
    data.investment.items.every((asset) => asset.category === 'establishment' || !asset.depreciable)
  )
    caveats.push('لا يتضمن النموذج إهلاكاً للأصول؛ راجع ما إذا كان ذلك مناسباً للاستخدام المقصود.');
  return caveats;
}
