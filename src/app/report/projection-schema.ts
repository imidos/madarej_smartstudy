import { z } from 'zod';
import { FinancialProjection } from '../study/projections';

// Validate saved output without changing the figures already discussed by the report.
const amount = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .refine((v) => Number.isFinite(Number(v)));
const optionalAmount = amount.nullable();
const product = z.object({
  id: z.string(),
  name: z.string(),
  units: amount,
  capacity: amount,
  unmetDemand: amount,
  revenue: amount,
  variableCosts: amount,
  utilization: optionalAmount,
});
const period = z.object({
  period: z.string(),
  revenue: amount,
  variableCosts: amount,
  materials: amount,
  payroll: amount,
  expenses: amount,
  depreciation: amount,
  interest: amount,
  principal: amount,
  installment: amount,
  openingDebt: amount,
  debt: amount,
  grossProfit: amount,
  operatingProfit: amount,
  tax: amount,
  netProfit: amount,
  receivables: amount,
  inventory: amount,
  purchases: amount,
  payables: amount,
  cash: amount,
  cashChange: amount,
  fixedAssets: amount,
  deposits: amount,
  equity: amount,
  balanceCheck: amount,
  projectCashFlow: amount,
  equityCashFlow: amount,
  products: z.array(product).min(1),
});
const valuation = z.object({
  npv: amount,
  irr: optionalAmount,
  irrStatus: z.enum(['value', 'unavailable', 'ambiguous']),
  paybackMonths: optionalAmount,
  discountedPaybackMonths: optionalAmount,
});
const scenario = z.object({
  id: z.enum(['base', 'optimistic', 'pessimistic']),
  months: z.array(period).min(36).max(60),
  years: z.array(period).min(3).max(5),
  project: valuation,
  equity: valuation,
  projectFlows: z.array(amount).min(37).max(61),
  equityFlows: z.array(amount).min(37).max(61),
  operatingMargin: optionalAmount,
  grossMargin: optionalAmount,
  netMargin: optionalAmount,
  dscr: optionalAmount,
  breakEvenRevenue: optionalAmount,
  breakEvenUnits: optionalAmount,
  minimumCash: amount,
  fundingShortfall: amount,
  warnings: z.array(z.string()),
});
export const projectionSchema: z.ZodType<FinancialProjection> = z
  .object({
    version: z.literal(1),
    investment: amount,
    borrowing: amount,
    upfrontFees: amount,
    scenarios: z.array(scenario).length(3),
    sensitivity: z.array(z.object({ label: z.string(), npv: amount })).length(5),
    methodology: z.array(z.string()).min(1),
  })
  .refine((p) =>
    p.scenarios.every(
      (s, i) =>
        s.id === ['base', 'optimistic', 'pessimistic'][i] &&
        s.months.length === s.years.length * 12 &&
        s.projectFlows.length === s.months.length + 1 &&
        s.equityFlows.length === s.months.length + 1,
    ),
  );
