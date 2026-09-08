import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

await mkdir('tmp', { recursive: true });
await build({
  stdin: {
    contents: `export { projectStudy } from './src/app/study/projections';
    export { studyIssues } from './src/app/study/study-validation';
    export { validDraft } from './src/app/study/testing/study-fixture';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'tmp/example-engine.mjs',
});
const { projectStudy, studyIssues, validDraft } = await import(
  pathToFileURL(resolve('tmp/example-engine.mjs'))
);
const service = validDraft();
service.id = 'example-service-2026';
service.step = 0;
service.data.project.name = 'استوديو مدارج للتصميم — اختبار الإنتاج';
service.data.products.items[0] = {
  ...service.data.products.items[0],
  price: '1150',
  sales: '20',
  capacity: '40',
  growth: '0',
  materials: '0',
  labor: '150',
  commissions: '50',
  packaging: '0',
  other: '20',
};
service.data.investment.inventory = '0';
service.data.investment.reserve = '9000';
service.data.financing = { contribution: '30000', interest: '0', fees: '0', years: '2' };
service.data.expenses.items.push({
  id: 'marketing',
  category: 'marketing',
  name: 'تسويق',
  amount: '500',
  period: 'monthly',
});
await writeFile(
  'examples/madarej-service-test-backup.json',
  JSON.stringify({ format: 'madarej-study', version: 1, draft: service }, null, 2) + '\n',
);
const expectations = {};
for (const name of ['service', 'manufacturing']) {
  const backup = JSON.parse(await readFile(`examples/madarej-${name}-test-backup.json`, 'utf8'));
  assert.deepEqual(studyIssues(backup.draft.data), [], `${name} example must pass all validation`);
  const projection = projectStudy(backup.draft.data);
  const base = projection.scenarios[0];
  assert.equal(base.months.length, 60);
  for (const scenario of projection.scenarios) {
    for (const month of scenario.months) assert.ok(Math.abs(Number(month.balanceCheck)) < 0.0001);
  }
  if (name === 'service') {
    assert.equal(base.months[0].revenue, '20000');
    assert.equal(base.months[0].variableCosts, '4400');
    assert.equal(base.months[0].netProfit, '7100');
    assert.equal(base.months[0].cash, '16100');
    assert.equal(base.years[0].netProfit, '85200');
  } else {
    assert.equal(projection.investment, '33000');
    assert.equal(base.months[0].revenue, '15000');
    assert.equal(base.months[0].variableCosts, '2500');
    assert.ok(Math.abs(Number(base.months[0].netProfit) + 1000 / 3) < 0.00001);
    assert.equal(base.months[0].cash, '-7975');
  }
  expectations[name] = {
    investment: projection.investment,
    borrowing: projection.borrowing,
    upfrontFees: projection.upfrontFees,
    firstMonth: base.months[0],
    yearOne: base.years[0],
    valuation: base.project,
    fundingShortfall: base.fundingShortfall,
  };
}
await writeFile('examples/expected-results.json', JSON.stringify(expectations, null, 2) + '\n');
console.log(
  'Both examples validated; 360 monthly balance checks and independent service/manufacturing expectations passed.',
);
