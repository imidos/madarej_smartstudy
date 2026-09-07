import { FeasibilityStudyDraft, newStudy, StudyData } from '../study-model';
export function validStudy(manufacturing = false): StudyData {
  const d = newStudy();
  d.project = {
    name: 'مشروع تجريبي',
    sector: manufacturing ? 'manufacturing' : 'service',
    activity: 'خدمات تصميم',
    description: 'تصميم هويات للشركات الصغيرة',
    country: 'SA',
    city: 'الرياض',
    currency: 'SAR',
    years: '5',
  };
  d.market = {
    customers: 'شركات صغيرة',
    channels: 'الموقع الإلكتروني',
    advantages: 'خدمة متخصصة',
    none: true,
    competitors: [],
  };
  d.operations = {
    facilities: 'مكتب',
    area: '80',
    utilities: 'كهرباء وإنترنت',
    process: 'استلام الطلب ثم التنفيذ والتسليم',
    capacity: manufacturing ? '١٠٠ قطعة يومياً' : '',
    materials: manufacturing ? 'خشب' : '',
    suppliers: manufacturing ? 'مورد محلي' : '',
    permits: 'رخصة نشاط',
    safety: 'طفايات حريق',
    training: 'تدريب أولي',
  };
  d.staff.items = [
    { id: 'employee-1', role: 'مصمم', count: '2', salary: '3000', additional: '500' },
  ];
  d.products.items = [
    {
      id: 'product-1',
      name: 'تصميم هوية',
      price: '115',
      tax: '15',
      sales: '100',
      capacity: '200',
      growth: '5',
      materials: '10',
      labor: '5',
      commissions: '2',
      packaging: '1',
      other: '2',
    },
  ];
  d.expenses.items = [
    { id: 'expense-1', category: 'rent', name: 'إيجار المكتب', amount: '12000', period: 'yearly' },
  ];
  d.investment.items = [
    { id: 'asset-1', category: 'equipment', name: 'أجهزة', quantity: '2', cost: '10000' },
  ];
  d.investment.deposits = '1000';
  d.investment.inventory = '2000';
  d.investment.reserve = '7000';
  d.financing = { contribution: '6000', interest: '0', fees: '100', years: '2' };
  return d;
}
export function validDraft(): FeasibilityStudyDraft {
  return {
    version: 1,
    id: 'draft-1',
    data: validStudy(),
    step: 4,
    completed: false,
    createdAt: '2026-09-07T12:00:00.000Z',
    updatedAt: '2026-09-07T12:00:00.000Z',
  };
}
