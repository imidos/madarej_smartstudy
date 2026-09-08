import Decimal from 'decimal.js';
import { financials, normalizeNumber, unitCost } from './financials';
import { StudyData } from './study-model';

Decimal.set({ precision: 32 });
const d = (v: string | number | Decimal) => new Decimal(v);
// Calculated values retain eight decimals and may exceed the input amount limit.
const n = (v: string) => {
  const value = normalizeNumber(v);
  return /^-?\d+(\.\d+)?$/.test(value) ? d(value) : d(0);
};
const sum = (v: Decimal[]) => v.reduce((a, b) => a.plus(b), d(0));
const pct = (v: string) => n(v).div(100);
const growth = (v: string, year: number) => d(1).plus(pct(v)).pow(year);
const out = (v: Decimal) => v.toDecimalPlaces(8).toFixed();
export interface ProductProjection {
  id: string;
  name: string;
  units: string;
  capacity: string;
  unmetDemand: string;
  revenue: string;
  variableCosts: string;
  utilization: string | null;
}
export interface ProjectionPeriod {
  period: string;
  revenue: string;
  variableCosts: string;
  materials: string;
  payroll: string;
  expenses: string;
  depreciation: string;
  interest: string;
  principal: string;
  installment: string;
  openingDebt: string;
  debt: string;
  grossProfit: string;
  operatingProfit: string;
  tax: string;
  netProfit: string;
  receivables: string;
  inventory: string;
  purchases: string;
  payables: string;
  cash: string;
  cashChange: string;
  fixedAssets: string;
  deposits: string;
  equity: string;
  balanceCheck: string;
  projectCashFlow: string;
  equityCashFlow: string;
  products: ProductProjection[];
}
export interface Valuation {
  npv: string;
  irr: string | null;
  irrStatus: 'value' | 'unavailable' | 'ambiguous';
  paybackMonths: string | null;
  discountedPaybackMonths: string | null;
}
export interface ScenarioProjection {
  id: 'base' | 'optimistic' | 'pessimistic';
  months: ProjectionPeriod[];
  years: ProjectionPeriod[];
  project: Valuation;
  equity: Valuation;
  projectFlows: string[];
  equityFlows: string[];
  operatingMargin: string | null;
  grossMargin: string | null;
  netMargin: string | null;
  dscr: string | null;
  breakEvenRevenue: string | null;
  breakEvenUnits: string | null;
  minimumCash: string;
  fundingShortfall: string;
  warnings: string[];
}
export interface FinancialProjection {
  version: 1;
  investment: string;
  borrowing: string;
  upfrontFees: string;
  scenarios: ScenarioProjection[];
  sensitivity: { label: string; npv: string }[];
  methodology: string[];
}

export function valuation(flows: Decimal[], annualRate: Decimal): Valuation {
  const discount = annualRate.div(100).plus(1).pow(d(1).div(12));
  const discounted = flows.map((v, i) => v.div(discount.pow(i)));
  const payback = (series: Decimal[]) => {
    if (!series[0].isNegative()) return null;
    let cumulative = series[0];
    for (let i = 1; i < series.length; i++) {
      const previous = cumulative;
      cumulative = cumulative.plus(series[i]);
      if (cumulative.gte(0)) return out(d(i - 1).plus(previous.negated().div(series[i])));
    }
    return null;
  };
  const signs = flows.filter((v) => !v.isZero()).map((v) => v.isPositive());
  const changes = signs.slice(1).filter((v, i) => v !== signs[i]).length;
  let irr: string | null = null;
  let status: Valuation['irrStatus'] = changes > 1 ? 'ambiguous' : 'unavailable';
  if (changes === 1) {
    const npvAt = (rate: Decimal) => {
      const factor = rate.plus(1);
      let result = flows.at(-1)!;
      for (let i = flows.length - 2; i >= 0; i--) result = result.div(factor).plus(flows[i]);
      return result;
    };
    let low = d('-0.95'),
      high = d(1);
    let lowValue = npvAt(low);
    let highValue = npvAt(high);
    while (lowValue.times(highValue).gt(0) && high.lt(1024)) {
      high = high.times(2);
      highValue = npvAt(high);
    }
    if (lowValue.times(highValue).lte(0)) {
      // 48 bisections over this bracket are much more precise than the 8 stored decimal places.
      for (let i = 0; i < 48; i++) {
        const mid = low.plus(high).div(2),
          value = npvAt(mid);
        if (lowValue.times(value).lte(0)) high = mid;
        else {
          low = mid;
          lowValue = value;
        }
      }
      irr = out(low.plus(high).div(2).plus(1).pow(12).minus(1).times(100));
      status = 'value';
    }
  }
  return {
    npv: out(sum(discounted)),
    irr,
    irrStatus: status,
    paybackMonths: payback(flows),
    discountedPaybackMonths: payback(discounted),
  };
}
function simulate(
  data: StudyData,
  id: ScenarioProjection['id'],
  salesChange: string,
  costChange: string,
): ScenarioProjection {
  const a = data.assumptions,
    totals = financials(data),
    count = Number(data.project.years) * 12;
  const assets = data.investment.none ? [] : data.investment.items;
  const setup = sum(
    assets.filter((x) => x.category === 'establishment').map((x) => n(x.cost).times(n(x.quantity))),
  );
  const fixedOpening = totals.assets.minus(setup),
    fees = totals.borrowing.gt(0) ? n(data.financing.fees) : d(0);
  let cash = n(data.investment.reserve).minus(fees),
    retained = setup.plus(fees).negated();
  let ar = d(0),
    inventory = n(data.investment.inventory),
    ap = d(0),
    debt = totals.borrowing,
    fixed = fixedOpening;
  const months: ProjectionPeriod[] = [],
    projectFlows = [totals.investment.negated()],
    equityFlows = [n(data.financing.contribution).negated()];
  const salesFactor = d(1).plus(pct(salesChange)),
    costFactor = d(1).plus(pct(costChange));
  const debtMonths = n(data.financing.years).times(12).toNumber();
  let minimum = cash;
  for (let m = 0; m < count; m++) {
    const year = Math.floor(m / 12),
      rampMonths = n(a.rampMonths).toNumber();
    const ramp =
      m < rampMonths
        ? pct(a.rampPercent).plus(
            d(1)
              .minus(pct(a.rampPercent))
              .times(rampMonths <= 1 ? 0 : d(m).div(rampMonths - 1)),
          )
        : d(1);
    let materialCost = d(0);
    const products = data.products.items.map((p) => {
      const capacity = n(p.capacity).times(
        growth(p.capacityGrowth.trim() ? p.capacityGrowth : a.capacityGrowth, year),
      );
      const demand = n(p.sales).times(growth(p.growth, year)).times(salesFactor).times(ramp);
      const units = Decimal.min(capacity, demand);
      const revenue = units
        .times(n(p.price))
        .times(growth(p.priceGrowth.trim() ? p.priceGrowth : a.priceGrowth, year))
        .div(d(1).plus(pct(p.tax)));
      const factor = growth(p.costGrowth.trim() ? p.costGrowth : a.unitCostGrowth, year).times(
        costFactor,
      );
      const variableCosts = units.times(unitCost(p)).times(factor);
      materialCost = materialCost.plus(units.times(n(p.materials)).times(factor));
      return {
        id: p.id,
        name: p.name,
        units: out(units),
        capacity: out(capacity),
        unmetDemand: out(Decimal.max(0, demand.minus(capacity))),
        revenue: out(revenue),
        variableCosts: out(variableCosts),
        utilization: capacity.gt(0) ? out(units.div(capacity).times(100)) : null,
      };
    });
    const revenue = sum(products.map((p) => n(p.revenue))),
      variableCosts = sum(products.map((p) => n(p.variableCosts)));
    const payroll = totals.payroll.times(growth(a.salaryGrowth, year)),
      expenses = totals.expenses.times(growth(a.expenseGrowth, year));
    const depreciation = sum(
      assets
        .filter((x) => x.category !== 'establishment' && x.depreciable)
        .map((x) => {
          const life = n(x.usefulLife).times(12);
          return life.gt(m)
            ? n(x.cost).minus(n(x.residualValue)).times(n(x.quantity)).div(life)
            : d(0);
        }),
    );
    fixed = fixed.minus(depreciation);
    const openingDebt = debt,
      interest = debt.times(pct(data.financing.interest)).div(12);
    const principal =
      debt.gt(0) && m < debtMonths
        ? Decimal.min(debt, Decimal.max(0, totals.installment.minus(interest)))
        : d(0);
    debt = Decimal.max(0, debt.minus(principal));
    const grossProfit = revenue.minus(variableCosts),
      operatingProfit = grossProfit.minus(payroll).minus(expenses).minus(depreciation);
    const tax = Decimal.max(0, operatingProfit.minus(interest)).times(pct(a.profitTax));
    const netProfit = operatingProfit.minus(interest).minus(tax);
    const nextAr = Decimal.min(ar.plus(revenue), revenue.times(n(a.receivableDays)).div(30));
    const purchases = Decimal.max(
      0,
      materialCost.times(n(a.inventoryDays)).div(30).plus(materialCost).minus(inventory),
    );
    const nextInventory = inventory.plus(purchases).minus(materialCost);
    const nextAp = Decimal.min(ap.plus(purchases), purchases.times(n(a.payableDays)).div(30));
    const deltaWc = nextAr.minus(ar).plus(nextInventory.minus(inventory)).minus(nextAp.minus(ap));
    const cashChange = netProfit.plus(depreciation).minus(principal).minus(deltaWc);
    cash = cash.plus(cashChange);
    retained = retained.plus(netProfit);
    minimum = Decimal.min(minimum, cash);
    const projectCashFlow = operatingProfit
      .minus(Decimal.max(0, operatingProfit).times(pct(a.profitTax)))
      .plus(depreciation)
      .minus(deltaWc);
    ar = nextAr;
    inventory = nextInventory;
    ap = nextAp;
    const equity = n(data.financing.contribution).plus(retained),
      deposits = n(data.investment.deposits);
    const balanceCheck = cash
      .plus(ar)
      .plus(inventory)
      .plus(fixed)
      .plus(deposits)
      .minus(ap)
      .minus(debt)
      .minus(equity);
    const date = new Date(a.startDate + 'T00:00:00Z');
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + m);
    months.push({
      period: date.toISOString().slice(0, 7),
      products,
      ...Object.fromEntries(
        Object.entries({
          revenue,
          variableCosts,
          materials: materialCost,
          payroll,
          expenses,
          depreciation,
          interest,
          principal,
          installment: principal.plus(interest),
          openingDebt,
          debt,
          grossProfit,
          operatingProfit,
          tax,
          netProfit,
          receivables: ar,
          inventory,
          purchases,
          payables: ap,
          cash,
          cashChange,
          fixedAssets: fixed,
          deposits,
          equity,
          balanceCheck,
          projectCashFlow,
          equityCashFlow: cashChange,
        }).map(([k, v]) => [k, out(v)]),
      ),
    } as ProjectionPeriod);
    projectFlows.push(projectCashFlow);
    equityFlows.push(cashChange);
  }
  // Terminal valuation only: liquidate working capital and recover the chosen fraction of asset book values.
  const terminal = fixed
    .plus(n(data.investment.deposits))
    .times(pct(a.terminalRecovery))
    .plus(ar)
    .plus(inventory)
    .minus(ap)
    .plus(n(data.investment.reserve));
  projectFlows[count] = projectFlows[count].plus(terminal);
  // Fees were paid from the initial funded reserve; only its remaining balance is recovered.
  equityFlows[count] = equityFlows[count].plus(terminal).minus(debt).minus(fees);
  const balanceKeys = [
    'debt',
    'receivables',
    'inventory',
    'payables',
    'cash',
    'fixedAssets',
    'deposits',
    'equity',
    'balanceCheck',
  ];
  const years: ProjectionPeriod[] = [];
  for (let y = 0; y < count / 12; y++) {
    const slice = months.slice(y * 12, (y + 1) * 12),
      last = slice.at(-1)!;
    const annual = { ...last, period: `السنة ${y + 1}`, openingDebt: slice[0].openingDebt };
    for (const key of Object.keys(last) as (keyof ProjectionPeriod)[])
      if (!['period', 'products', 'openingDebt', ...balanceKeys].includes(key))
        (annual as unknown as Record<string, string>)[key] = out(
          sum(slice.map((r) => n(r[key] as string))),
        );
    annual.products = data.products.items.map((p, i) => {
      const rows = slice.map((r) => r.products[i]),
        units = sum(rows.map((r) => n(r.units))),
        capacity = sum(rows.map((r) => n(r.capacity)));
      return {
        id: p.id,
        name: p.name,
        units: out(units),
        capacity: out(capacity),
        unmetDemand: out(sum(rows.map((r) => n(r.unmetDemand)))),
        revenue: out(sum(rows.map((r) => n(r.revenue)))),
        variableCosts: out(sum(rows.map((r) => n(r.variableCosts)))),
        utilization: capacity.gt(0) ? out(units.div(capacity).times(100)) : null,
      };
    });
    years.push(annual);
  }
  const revenue = sum(months.map((r) => n(r.revenue))),
    gross = sum(months.map((r) => n(r.grossProfit))),
    profit = sum(months.map((r) => n(r.netProfit)));
  const first = years[0],
    contribution = n(first.grossProfit),
    ratio = n(first.revenue).gt(0) ? contribution.div(n(first.revenue)) : d(0);
  const fixedCosts = n(first.payroll).plus(n(first.expenses)).plus(n(first.depreciation)),
    breakEven = ratio.gt(0) ? fixedCosts.div(ratio) : null;
  const units = sum(first.products.map((p) => n(p.units))),
    debtService = sum(months.map((r) => n(r.installment)));
  const warnings: string[] = [];
  if (minimum.lt(n(a.minimumCash)))
    warnings.push('الرصيد النقدي ينخفض عن الحد الأدنى المطلوب؛ يلزم تمويل أو تعديل خطة التشغيل.');
  if (months.some((r) => r.products.some((p) => n(p.unmetDemand).gt(0))))
    warnings.push('المبيعات مقيدة بالطاقة المتاحة؛ الطلب غير المخدوم مستبعد من الإيراد.');
  if (!ratio.gt(0))
    warnings.push('هامش المساهمة غير موجب؛ لا توجد نقطة تعادل قابلة للتحقق بالأسعار الحالية.');
  if (debt.gt(0))
    warnings.push(
      'يوجد رصيد قرض عند نهاية الدراسة، وقد خُصم من القيمة النهائية للتدفقات إلى الملاك.',
    );
  return {
    id,
    months,
    years,
    project: valuation(projectFlows, n(a.discountRate)),
    equity: valuation(equityFlows, n(a.discountRate)),
    projectFlows: projectFlows.map(out),
    equityFlows: equityFlows.map(out),
    operatingMargin: revenue.gt(0)
      ? out(
          sum(months.map((r) => n(r.operatingProfit)))
            .div(revenue)
            .times(100),
        )
      : null,
    grossMargin: revenue.gt(0) ? out(gross.div(revenue).times(100)) : null,
    netMargin: revenue.gt(0) ? out(profit.div(revenue).times(100)) : null,
    dscr: debtService.gt(0)
      ? out(sum(months.map((r) => n(r.cashChange).plus(n(r.installment)))).div(debtService))
      : null,
    breakEvenRevenue: breakEven ? out(breakEven) : null,
    breakEvenUnits:
      breakEven && n(first.revenue).gt(0)
        ? out(breakEven.times(units).div(n(first.revenue)))
        : null,
    minimumCash: out(minimum),
    fundingShortfall: out(Decimal.max(0, n(a.minimumCash).minus(minimum))),
    warnings,
  };
}
export function projectStudy(data: StudyData): FinancialProjection {
  const a = data.assumptions,
    t = financials(data);
  return {
    version: 1,
    investment: out(t.investment),
    borrowing: out(t.borrowing),
    upfrontFees: out(t.borrowing.gt(0) ? n(data.financing.fees) : d(0)),
    scenarios: [
      simulate(data, 'base', '0', '0'),
      simulate(data, 'optimistic', a.optimisticSales, a.optimisticCosts),
      simulate(data, 'pessimistic', a.pessimisticSales, a.pessimisticCosts),
    ],
    sensitivity: [-20, -10, 0, 10, 20].map((change) => ({
      label: `المبيعات ${change}%`,
      npv: simulate(data, 'base', String(change), '0').project.npv,
    })),
    methodology: [
      'كل سنة اثنا عشر شهراً من تاريخ بدء التشغيل. التغيرات السنوية تطبق عند بداية كل سنة تشغيلية؛ أشهر رأس المال العامل ثلاثون يوماً.',
      'الأرقام تقديرات تخطيطية بعملة واحدة دون تحويل عملات؛ ضريبة المبيعات تعامل كضريبة محايدة دون تأخير سداد أو استرداد.',
      'الإهلاك خط مستقيم. مصروفات التأسيس ورسوم القرض تُحمّل عند البداية؛ لا ترحيل لخسائر الضرائب ولا توزيعات أو اقتراض إضافي.',
      'التقييم شهري بمعدل خصم شهري مكافئ للمعدل السنوي؛ القيم النهائية تتضمن تحرير رأس المال العامل واحتياطي البداية واسترداد الأصول والودائع حسب النسبة المدخلة.',
      'التدفقات النهائية افتراض تقييم فقط؛ لا تضاف إلى أرصدة التشغيل. تسدد الديون المتبقية في تقييم حقوق الملاك.',
      'قيمة IRR المعروضة سنوية. عند تعدد تغيرات إشارة التدفق تعتبر النتيجة ملتبسة ولا يقدم معدل وحيد.',
      'الميزانية وقوائم الأرباح والتدفقات نموذج مبسط للتخطيط وليست قوائم نظامية أو اعتماداً محاسبياً.',
      'رسوم الاقتراض تسدد عند البداية من الاحتياطي الممول، وتخفض السيولة الافتتاحية والاحتياطي المسترد للملاك عند النهاية. لا تضاف إلى أصل القرض أو الأقساط.',
      'تغطية خدمة الدين تساوي التدفق النقدي بعد الضريبة وتغير رأس المال العامل وقبل خدمة الدين، مقسوماً على أصل الدين والفوائد المسددة خلال الدراسة.',
      'تعادل السنة الأولى يشمل الإهلاك ويستبعد الفائدة والضرائب. وحدات التعادل سلة مرجحة بمزيج المبيعات وليست وحدات متجانسة؛ يلزم التحقق من الطاقة المتاحة.',
    ],
  };
}
