import { financials, normalizeNumber, parseAmount, unitCost } from './financials';
import { studyIssues } from './study-validation';
import { newStudy } from './study-model';
import { validStudy } from './testing/study-fixture';

describe('Study finances and validation', () => {
  it('accepts Arabic and Persian decimals, preserving blank vs zero', () => {
    expect(normalizeNumber(' ١٢٣٫٤٥ ')).toBe('123.45');
    expect(parseAmount('۱۲۳.۴۵')?.toString()).toBe('123.45');
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('٠')?.toString()).toBe('0');
    for (const raw of ['1,000', '1e5', 'Infinity', 'NaN', '0x10', '1.2345678', '1000000000001'])
      expect(parseAmount(raw)).toBeUndefined();
  });
  it('calculates payroll, annual expenses, startup and zero-interest loans without double counting', () => {
    const total = financials(validStudy());
    expect(total.payroll.toString()).toBe('7000');
    expect(total.expenses.toString()).toBe('1000');
    expect(total.operating.toString()).toBe('8000');
    expect(total.investment.toString()).toBe('30000');
    expect(total.borrowing.toString()).toBe('24000');
    expect(total.installment.toString()).toBe('1000');
    expect(total.revenue.toString()).toBe('10000');
    expect(total.variableCosts.toString()).toBe('2000');
  });
  it('uses decimal arithmetic for fractional costs', () => {
    const d = validStudy();
    Object.assign(d.products.items[0], {
      materials: '0.1',
      labor: '0.2',
      commissions: '0',
      packaging: '0',
      other: '0',
    });
    expect(unitCost(d.products.items[0]).toString()).toBe('0.3');
  });
  it('calculates interest separately from upfront fees', () => {
    const d = validStudy();
    d.financing.interest = '12';
    expect(financials(d).installment.toFixed(2)).toBe('1129.76');
    d.financing.fees = '10000';
    expect(financials(d).installment.toFixed(2)).toBe('1129.76');
  });
  it('updates totals after removal and excludes inactive categories', () => {
    const d = validStudy();
    d.staff.none = true;
    d.expenses.none = true;
    d.investment.items = [];
    expect(financials(d).operating.toString()).toBe('0');
    expect(financials(d).investment.toString()).toBe('10000');
  });
  it('accepts a complete service and manufacturing study', () => {
    expect(studyIssues(validStudy())).toEqual([]);
    expect(studyIssues(validStudy(true))).toEqual([]);
  });
  it('requires manufacturing details only for manufacturing', () => {
    const d = validStudy();
    expect(studyIssues(d)).toEqual([]);
    d.project.sector = 'manufacturing';
    expect(studyIssues(d).map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining([
        'operations.capacity',
        'operations.materials',
        'operations.suppliers',
      ]),
    );
  });
  it('rejects incomplete, over-capacity, negative and fractional-headcount data', () => {
    expect(studyIssues(newStudy()).length).toBeGreaterThan(20);
    const d = validStudy();
    d.products.items[0].sales = '201';
    d.staff.items[0].count = '1.5';
    d.investment.deposits = '-1';
    expect(studyIssues(d).map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining([
        'products.items.0.sales',
        'staff.items.0.count',
        'investment.deposits',
      ]),
    );
  });
  it('requires explicit zero for core costs and explicit none for empty categories', () => {
    const d = validStudy();
    d.products.items[0].materials = '';
    d.staff.items = [];
    expect(studyIssues(d).map((i) => i.path.join('.'))).toContain('products.items.0.materials');
    expect(studyIssues(d).map((i) => i.path.join('.'))).toContain('staff.items');
    d.products.items[0].materials = '0';
    d.staff.none = true;
    expect(studyIssues(d)).toEqual([]);
  });
  it('validates financing and rejects unknown country and currency codes', () => {
    const d = validStudy();
    d.financing.contribution = '30001';
    d.project.country = 'ZZ';
    d.project.currency = 'ZZZ';
    expect(studyIssues(d).map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining(['financing.contribution', 'project.country', 'project.currency']),
    );
  });
  it('requires loan inputs only when borrowing', () => {
    const d = validStudy();
    d.financing.contribution = '30000';
    d.financing.interest = '';
    d.financing.fees = '';
    expect(studyIssues(d)).toEqual([]);
    expect(financials(d).installment.toString()).toBe('0');
    d.financing.contribution = '0';
    expect(studyIssues(d).filter((i) => i.step === 7).length).toBe(2);
  });
  it('does not produce non-finite previews for temporarily invalid negative rates', () => {
    const d = validStudy();
    d.products.items[0].tax = '-100';
    d.financing.interest = '-1200';
    const totals = financials(d);
    expect(totals.revenue.isFinite()).toBe(true);
    expect(totals.installment.isFinite()).toBe(true);
  });
});
