import Decimal from 'decimal.js';
import { projectStudy, valuation } from './projections';
import { validStudy } from './testing/study-fixture';

describe('Monthly financial projection', () => {
  it('preserves calculated fractional amounts beyond six decimals and Arabic input', () => {
    const data = validStudy();
    data.products.items[0].price = '١١١';
    data.products.items[0].tax = '١٧';
    data.financing.interest = '٧';
    data.assumptions.receivableDays = '٤٥';
    const p = projectStudy(data).scenarios[0];
    expect(Number(p.months[0].revenue)).toBeCloseTo(11100 / 1.17, 6);
    expect(Number(p.years[0].revenue)).toBeCloseTo((12 * 11100) / 1.17, 5);
    for (const row of p.months) expect(Math.abs(Number(row.balanceCheck))).toBeLessThan(0.0001);
  });
  it('reconciles all balance sheets and annual flows for a working-capital manufacturing example', () => {
    const data = validStudy(true);
    data.assumptions.receivableDays = '45';
    data.assumptions.inventoryDays = '60';
    data.assumptions.payableDays = '30';
    data.investment.items[0].depreciable = true;
    data.investment.items[0].usefulLife = '5';
    data.investment.items[0].residualValue = '1000';
    const p = projectStudy(data);
    for (const s of p.scenarios) {
      expect(s.months).toHaveLength(60);
      for (const row of s.months)
        expect(new Decimal(row.balanceCheck).abs().toNumber()).toBeLessThan(0.0001);
      expect(new Decimal(s.years[0].revenue).toNumber()).toBeCloseTo(
        s.months.slice(0, 12).reduce((a, r) => a + Number(r.revenue), 0),
      );
      expect(s.months[23].debt).toBe('0');
      expect(s.months[24].principal).toBe('0');
    }
    expect(p.scenarios[0].months[0].depreciation).toBe('300');
  });
  it('matches independently calculated first-month service values', () => {
    const p = projectStudy(validStudy()).scenarios[0];
    expect(p.months[0].revenue).toBe('10000');
    expect(p.months[0].variableCosts).toBe('2000');
    expect(p.months[0].netProfit).toBe('0');
    expect(p.months[0].purchases).toBe('0');
    expect(p.months[0].inventory).toBe('1000');
    expect(p.months[0].cash).toBe('6900');
    expect(p.months[0].balanceCheck).toBe('0');
  });
  it('limits sales to capacity and shows funding deficits without inventing debt', () => {
    const data = validStudy();
    data.products.items[0].growth = '100';
    data.products.items[0].capacity = '100';
    data.products.items[0].price = '1';
    const s = projectStudy(data).scenarios[0];
    expect(s.months[12].products[0].units).toBe('100');
    expect(Number(s.fundingShortfall)).toBeGreaterThan(0);
    expect(s.warnings.length).toBeGreaterThan(1);
    expect(s.breakEvenRevenue).toBeNull();
  });
  it('handles valuation ambiguity, zero discount and no payback', () => {
    const v = valuation(
      ['-100', '110'].map((x) => new Decimal(x)),
      new Decimal(0),
    );
    expect(v.npv).toBe('10');
    expect(Number(v.irr)).toBeCloseTo((1.1 ** 12 - 1) * 100, 4);
    expect(
      valuation(
        ['-100', '50', '-20'].map((x) => new Decimal(x)),
        new Decimal(0),
      ).irrStatus,
    ).toBe('ambiguous');
    expect(
      valuation(
        ['-100', '0'].map((x) => new Decimal(x)),
        new Decimal(0),
      ).paybackMonths,
    ).toBeNull();
  });
});
