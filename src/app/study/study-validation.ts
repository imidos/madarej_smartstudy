import { ASSET_CATEGORIES, EXPENSE_CATEGORIES, SECTORS, StudyData } from './study-model';
import { financials, parseAmount } from './financials';
import { COUNTRIES, CURRENCIES } from './options';

export interface StudyIssue {
  path: string[];
  step: number;
  message: string;
}
export function studyIssues(data: StudyData): StudyIssue[] {
  const issues: StudyIssue[] = [];
  const add = (step: number, path: string, message: string) =>
    issues.push({ step, path: path.split('.'), message });
  const text = (step: number, path: string, value: string, optional = false) => {
    if (!optional && !value.trim()) add(step, path, 'هذا الحقل مطلوب');
    else if (value.length > 4000) add(step, path, 'الحد الأقصى ٤٠٠٠ حرف');
  };
  const number = (
    step: number,
    path: string,
    value: string,
    options: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {},
  ) => {
    if (!value.trim()) {
      if (!options.optional) add(step, path, 'أدخل قيمة، أو صفراً إذا لم توجد تكلفة');
      return;
    }
    const parsed = parseAmount(value);
    if (!parsed) add(step, path, 'أدخل رقماً صحيح الصيغة دون فواصل آلاف، وبحد أقصى ٦ منازل عشرية');
    else if (parsed.lt(options.min ?? 0) || parsed.gt(options.max ?? 1e12))
      add(step, path, `أدخل قيمة بين ${options.min ?? 0} و${options.max ?? 1e12}`);
    else if (options.integer && !parsed.isInteger()) add(step, path, 'أدخل عدداً صحيحاً');
  };
  const choice = (step: number, path: string, value: string, choices: string[]) => {
    if (!choices.includes(value)) add(step, path, 'اختر قيمة من القائمة');
  };
  const rows = (step: number, path: string, values: unknown[]) => {
    if (!values.length) add(step, path, 'أضف بنداً واحداً على الأقل أو اختر لا يوجد');
  };
  for (const key of ['name', 'activity', 'description', 'city'] as const)
    text(0, `project.${key}`, data.project[key]);
  choice(
    0,
    'project.sector',
    data.project.sector,
    SECTORS.map((x) => x.value),
  );
  choice(0, 'project.years', data.project.years, ['3', '5']);
  choice(
    0,
    'project.country',
    data.project.country,
    COUNTRIES.map((x) => x.value),
  );
  choice(
    0,
    'project.currency',
    data.project.currency,
    CURRENCIES.map((x) => x.value),
  );
  for (const key of ['customers', 'channels', 'advantages'] as const)
    text(1, `market.${key}`, data.market[key]);
  if (!data.market.none) {
    rows(1, 'market.competitors', data.market.competitors);
    data.market.competitors.forEach((row, i) => {
      text(1, `market.competitors.${i}.name`, row.name);
      text(1, `market.competitors.${i}.strength`, row.strength);
    });
  }
  for (const key of [
    'facilities',
    'utilities',
    'process',
    'permits',
    'safety',
    'training',
  ] as const)
    text(2, `operations.${key}`, data.operations[key]);
  number(2, 'operations.area', data.operations.area);
  for (const key of ['capacity', 'materials', 'suppliers'] as const)
    text(2, `operations.${key}`, data.operations[key], data.project.sector !== 'manufacturing');
  if (!data.staff.none) {
    rows(3, 'staff.items', data.staff.items);
    data.staff.items.forEach((row, i) => {
      text(3, `staff.items.${i}.role`, row.role);
      number(3, `staff.items.${i}.count`, row.count, { min: 1, max: 100000, integer: true });
      number(3, `staff.items.${i}.salary`, row.salary);
      number(3, `staff.items.${i}.additional`, row.additional);
    });
  }
  rows(4, 'products.items', data.products.items);
  data.products.items.forEach((row, i) => {
    const path = `products.items.${i}`;
    text(4, `${path}.name`, row.name);
    number(4, `${path}.price`, row.price, { min: 0.000001 });
    for (const key of [
      'materials',
      'labor',
      'commissions',
      'packaging',
      'other',
      'sales',
      'capacity',
    ] as const)
      number(4, `${path}.${key}`, row[key]);
    number(4, `${path}.tax`, row.tax, { max: 100 });
    number(4, `${path}.growth`, row.growth, { min: -100, max: 1000 });
    const sales = parseAmount(row.sales),
      capacity = parseAmount(row.capacity);
    if (sales && capacity && sales.gt(capacity))
      add(4, `${path}.sales`, 'المبيعات المتوقعة تتجاوز القدرة الشهرية');
  });
  if (!data.expenses.none) {
    rows(5, 'expenses.items', data.expenses.items);
    data.expenses.items.forEach((row, i) => {
      text(5, `expenses.items.${i}.name`, row.name);
      number(5, `expenses.items.${i}.amount`, row.amount);
      choice(
        5,
        `expenses.items.${i}.category`,
        row.category,
        EXPENSE_CATEGORIES.map((x) => x.value),
      );
      choice(5, `expenses.items.${i}.period`, row.period, ['monthly', 'yearly']);
    });
  }
  if (!data.investment.none) {
    rows(6, 'investment.items', data.investment.items);
    data.investment.items.forEach((row, i) => {
      text(6, `investment.items.${i}.name`, row.name);
      choice(
        6,
        `investment.items.${i}.category`,
        row.category,
        ASSET_CATEGORIES.map((x) => x.value),
      );
      number(6, `investment.items.${i}.quantity`, row.quantity, { min: 1, integer: true });
      number(6, `investment.items.${i}.cost`, row.cost);
    });
  }
  for (const key of ['deposits', 'inventory', 'reserve'] as const)
    number(6, `investment.${key}`, data.investment[key]);
  number(7, 'financing.contribution', data.financing.contribution);
  const totals = financials(data),
    contribution = parseAmount(data.financing.contribution);
  if (contribution && contribution.gt(totals.investment))
    add(7, 'financing.contribution', 'المساهمة تتجاوز إجمالي الاستثمار المطلوب');
  if (totals.borrowing.gt(0)) {
    number(7, 'financing.interest', data.financing.interest, { max: 100 });
    number(7, 'financing.fees', data.financing.fees);
    number(7, 'financing.years', data.financing.years, { min: 1, max: 30, integer: true });
  }
  return issues;
}
