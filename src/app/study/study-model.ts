import { newAssumptions, ProjectionAssumptions } from './projection-assumptions';
export interface Competitor {
  id: string;
  name: string;
  strength: string;
}
export interface Employee {
  id: string;
  role: string;
  count: string;
  salary: string;
  additional: string;
}
export interface Product {
  id: string;
  name: string;
  price: string;
  tax: string;
  sales: string;
  capacity: string;
  growth: string;
  priceGrowth: string;
  costGrowth: string;
  capacityGrowth: string;
  materials: string;
  labor: string;
  commissions: string;
  packaging: string;
  other: string;
}
export interface Expense {
  id: string;
  category: string;
  name: string;
  amount: string;
  period: string;
}
export interface Asset {
  id: string;
  category: string;
  name: string;
  quantity: string;
  cost: string;
  depreciable: boolean;
  usefulLife: string;
  residualValue: string;
}
export interface StudyData {
  assumptions: ProjectionAssumptions;
  project: {
    name: string;
    sector: string;
    activity: string;
    description: string;
    country: string;
    city: string;
    currency: string;
    years: string;
  };
  market: {
    customers: string;
    channels: string;
    advantages: string;
    none: boolean;
    competitors: Competitor[];
  };
  operations: {
    facilities: string;
    area: string;
    utilities: string;
    process: string;
    capacity: string;
    materials: string;
    suppliers: string;
    permits: string;
    safety: string;
    training: string;
  };
  staff: { none: boolean; items: Employee[] };
  products: { items: Product[] };
  expenses: { none: boolean; items: Expense[] };
  investment: {
    none: boolean;
    items: Asset[];
    deposits: string;
    inventory: string;
    reserve: string;
  };
  financing: { contribution: string; interest: string; fees: string; years: string };
}
export interface Logo {
  name: string;
  type: string;
  size: number;
  blob: Blob;
}
export interface FeasibilityStudyDraft {
  version: 2;
  id: string;
  data: StudyData;
  step: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  logo?: Logo;
}
export type FeasibilityStudyDraftV2 = FeasibilityStudyDraft;
export const newId = () => crypto.randomUUID();
export const newCompetitor = (): Competitor => ({ id: newId(), name: '', strength: '' });
export const newEmployee = (): Employee => ({
  id: newId(),
  role: '',
  count: '',
  salary: '',
  additional: '',
});
export const newProduct = (): Product => ({
  id: newId(),
  name: '',
  price: '',
  tax: '',
  sales: '',
  capacity: '',
  growth: '',
  priceGrowth: '',
  costGrowth: '',
  capacityGrowth: '',
  materials: '',
  labor: '',
  commissions: '',
  packaging: '',
  other: '',
});
export const newExpense = (): Expense => ({
  id: newId(),
  category: 'rent',
  name: '',
  amount: '',
  period: 'monthly',
});
export const newAsset = (): Asset => ({
  depreciable: false,
  usefulLife: '',
  residualValue: '0',
  id: newId(),
  category: 'equipment',
  name: '',
  quantity: '',
  cost: '',
});
export function newStudy(): StudyData {
  return {
    assumptions: newAssumptions(),
    project: {
      name: '',
      sector: '',
      activity: '',
      description: '',
      country: '',
      city: '',
      currency: '',
      years: '5',
    },
    market: {
      customers: '',
      channels: '',
      advantages: '',
      none: false,
      competitors: [newCompetitor()],
    },
    operations: {
      facilities: '',
      area: '',
      utilities: '',
      process: '',
      capacity: '',
      materials: '',
      suppliers: '',
      permits: '',
      safety: '',
      training: '',
    },
    staff: { none: false, items: [newEmployee()] },
    products: { items: [newProduct()] },
    expenses: { none: false, items: [newExpense()] },
    investment: { none: false, items: [newAsset()], deposits: '', inventory: '', reserve: '' },
    financing: { contribution: '', interest: '', fees: '', years: '5' },
  };
}
export const STEPS = [
  {
    title: 'نظرة على المشروع',
    description: 'لنبدأ بالفكرة التي تريد تحويلها إلى واقع.',
    icon: '◈',
  },
  {
    title: 'السوق والمنافسون',
    description: 'عرّفنا بعملائك وما يميّز مشروعك في السوق.',
    icon: '◎',
  },
  { title: 'التشغيل والتجهيز', description: 'كل ما يحتاجه مشروعك ليبدأ العمل.', icon: '⌘' },
  { title: 'فريق العمل', description: 'الأشخاص والمهارات وراء نجاح مشروعك.', icon: '♧' },
  {
    title: 'المنتجات والخدمات',
    description: 'حدّد ما تقدّمه، وتكلفته، ومبيعاته المتوقعة.',
    icon: '◇',
  },
  { title: 'المصروفات التشغيلية', description: 'صورة واضحة للتكاليف المستمرة لمشروعك.', icon: '≋' },
  { title: 'الاستثمار المبدئي', description: 'الأصول والمبالغ اللازمة للانطلاق.', icon: '▤' },
  { title: 'خطة التمويل', description: 'حدّد مساهمتك واحتياجات مشروعك التمويلية.', icon: '◷' },
  {
    title: 'المراجعة والحفظ',
    description: 'راجع تفاصيل دراستك قبل حفظ النسخة المكتملة.',
    icon: '✓',
  },
] as const;
export const SECTION_KEYS = [
  'project',
  'market',
  'operations',
  'staff',
  'products',
  'expenses',
  'investment',
  'financing',
] as const;
export const SECTORS = [
  { value: 'service', label: 'خدمات' },
  { value: 'trade', label: 'تجارة وتجزئة' },
  { value: 'manufacturing', label: 'صناعة وإنتاج' },
  { value: 'food', label: 'مطاعم وأغذية' },
  { value: 'technology', label: 'تقنية وتجارة إلكترونية' },
  { value: 'other', label: 'قطاع آخر' },
];
export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'الإيجارات' },
  { value: 'administration', label: 'إدارية وعمومية' },
  { value: 'marketing', label: 'التسويق' },
  { value: 'utilities', label: 'المرافق والطاقة' },
  { value: 'maintenance', label: 'الصيانة' },
  { value: 'other', label: 'مصروفات أخرى' },
];
export const ASSET_CATEGORIES = [
  { value: 'vehicles', label: 'المركبات ووسائل النقل' },
  { value: 'equipment', label: 'الآلات والمعدات' },
  { value: 'furniture', label: 'الأثاث' },
  { value: 'buildings', label: 'التجهيزات والمباني' },
  { value: 'other', label: 'أصول أخرى' },
  { value: 'establishment', label: 'نفقات التأسيس' },
];
