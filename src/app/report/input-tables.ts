import { StudyData } from '../study/study-model';
export interface InputTable {
  title: string;
  headers: string[];
  rows: string[][];
}
export function inputTables(d: StudyData): InputTable[] {
  return [
    {
      title: 'بيانات المشروع والسوق والتشغيل',
      headers: ['البند', 'المدخل'],
      rows: [
        ['النشاط', d.project.activity],
        ['الوصف', d.project.description],
        ['العملاء', d.market.customers],
        ['قنوات البيع', d.market.channels],
        ['المزايا', d.market.advantages],
        ['المرافق', d.operations.facilities],
        ['المساحة م²', d.operations.area],
        ['الخدمات', d.operations.utilities],
        ['التشغيل', d.operations.process],
        ['الطاقة', d.operations.capacity],
        ['المواد', d.operations.materials],
        ['الموردون', d.operations.suppliers],
        ['التصاريح', d.operations.permits],
        ['السلامة', d.operations.safety],
        ['التدريب', d.operations.training],
      ].map(([label, value]) => [label, value || 'لا ينطبق / لم يحدد']),
    },
    {
      title: 'المنافسون حسب بيانات العميل',
      headers: ['المنافس', 'نقاط القوة'],
      rows: d.market.none
        ? [['لا يوجد', 'حسب إفادة العميل']]
        : d.market.competitors.map((r) => [r.name, r.strength]),
    },
    {
      title: 'الرواتب الشهرية',
      headers: ['الدور', 'العدد', 'راتب الفرد', 'تكاليف إضافية للفرد'],
      rows: d.staff.none
        ? [['لا يوجد', '0', '0', '0']]
        : d.staff.items.map((r) => [r.role, r.count, r.salary, r.additional]),
    },
    ...d.products.items.map((p) => ({
      title: 'المنتج / الخدمة: ' + p.name,
      headers: ['الافتراض', 'القيمة'],
      rows: [
        ['سعر البيع شامل الضريبة', p.price],
        ['ضريبة المبيعات %', p.tax],
        ['وحدات البيع الشهرية', p.sales],
        ['الطاقة الشهرية', p.capacity],
        ['نمو الحجم السنوي %', p.growth],
        ['تغير سعر البيع السنوي %', p.priceGrowth || d.assumptions.priceGrowth],
        ['تغير تكلفة الوحدة السنوي %', p.costGrowth || d.assumptions.unitCostGrowth],
        ['تغير الطاقة السنوي %', p.capacityGrowth || d.assumptions.capacityGrowth],
        ['مواد للوحدة', p.materials],
        ['عمالة إضافية للوحدة', p.labor],
        ['عمولات للوحدة', p.commissions],
        ['تغليف للوحدة', p.packaging],
        ['تكلفة أخرى للوحدة', p.other],
      ],
    })),
    {
      title: 'المصروفات التشغيلية',
      headers: ['المصروف', 'المبلغ', 'الفترة'],
      rows: d.expenses.none
        ? [['لا يوجد', '0', 'شهري']]
        : d.expenses.items.map((r) => [r.name, r.amount, r.period === 'yearly' ? 'سنوي' : 'شهري']),
    },
    {
      title: 'الأصول والتأسيس',
      headers: ['البند', 'العدد', 'تكلفة الوحدة', 'عمر الإهلاك / سنة', 'متبقي الوحدة'],
      rows: d.investment.none
        ? [['لا يوجد', '0', '0', 'لا ينطبق', '0']]
        : d.investment.items.map((r) => [
            r.name,
            r.quantity,
            r.cost,
            r.depreciable ? r.usefulLife : 'لا ينطبق',
            r.depreciable ? r.residualValue : 'لا ينطبق',
          ]),
    },
    {
      title: 'رأس المال والتمويل',
      headers: ['البند', 'القيمة'],
      rows: [
        ['الودائع', d.investment.deposits],
        ['المخزون الافتتاحي', d.investment.inventory],
        ['الاحتياطي الممول', d.investment.reserve],
        ['مساهمة المالك', d.financing.contribution],
        ['فائدة القرض السنوية %', d.financing.interest || 'لا ينطبق'],
        ['رسوم القرض مقدماً', d.financing.fees || 'لا ينطبق'],
        ['مدة السداد بالسنوات', d.financing.years || 'لا ينطبق'],
      ],
    },
  ];
}
