import Decimal from 'decimal.js';
import { Product, StudyData } from './study-model';

/** Decimal text preserves an unanswered field separately from an explicit zero. */
export function normalizeNumber(value: string): string {
  return value
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/٫/g, '.');
}
export function parseAmount(value: string): Decimal | undefined {
  const normalized = normalizeNumber(value);
  if (!/^-?\d+(\.\d{1,6})?$/.test(normalized)) return undefined;
  const result = new Decimal(normalized);
  return result.abs().lte('1000000000000') ? result : undefined;
}
// Invalid intermediate input must not produce negative costs or non-finite previews.
const amount = (value: string) => Decimal.max(0, parseAmount(value) ?? 0);
const sum = (values: Decimal[]) =>
  values.reduce((total, value) => total.plus(value), new Decimal(0));
export function unitCost(product: Product): Decimal {
  return sum(
    [product.materials, product.labor, product.commissions, product.packaging, product.other].map(
      amount,
    ),
  );
}
export function financials(data: StudyData) {
  const payroll = data.staff.none
    ? new Decimal(0)
    : sum(
        data.staff.items.map((row) =>
          amount(row.count).times(amount(row.salary).plus(amount(row.additional))),
        ),
      );
  const expenses = data.expenses.none
    ? new Decimal(0)
    : sum(
        data.expenses.items.map((row) => amount(row.amount).div(row.period === 'yearly' ? 12 : 1)),
      );
  const assets = data.investment.none
    ? new Decimal(0)
    : sum(data.investment.items.map((row) => amount(row.quantity).times(amount(row.cost))));
  const investment = assets
    .plus(amount(data.investment.deposits))
    .plus(amount(data.investment.inventory))
    .plus(amount(data.investment.reserve));
  const borrowing = Decimal.max(0, investment.minus(amount(data.financing.contribution)));
  const rate = amount(data.financing.interest).div(1200);
  const months = amount(data.financing.years).times(12);
  const installment =
    borrowing.isZero() || months.lte(0)
      ? new Decimal(0)
      : rate.isZero()
        ? borrowing.div(months)
        : borrowing
            .times(rate)
            .div(new Decimal(1).minus(new Decimal(1).plus(rate).pow(months.negated())));
  const revenue = sum(
    data.products.items.map((row) =>
      amount(row.price)
        .div(new Decimal(1).plus(amount(row.tax).div(100)))
        .times(amount(row.sales)),
    ),
  );
  const variableCosts = sum(
    data.products.items.map((row) => unitCost(row).times(amount(row.sales))),
  );
  return {
    payroll,
    expenses,
    operating: payroll.plus(expenses),
    assets,
    investment,
    borrowing,
    installment,
    revenue,
    variableCosts,
  };
}
export function money(value: Decimal, currency = ''): string {
  return `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value.toNumber())} ${currency}`.trim();
}
