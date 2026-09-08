// Local QA only; this file is outside the Angular source tree and static assets.
import { validDraft, validStudy } from '../src/app/study/testing/study-fixture';
import { projectStudy } from '../src/app/study/projections';
import { inputHash, SECTION_TITLES, SectionId, StudyReport } from '../src/app/report/report-model';
async function seed(manufacturing: boolean): Promise<void> {
  const draft = validDraft();
  draft.data = validStudy(manufacturing);
  draft.data.project.name = manufacturing
    ? 'مصنع مدارج للأثاث — عينة اختبار'
    : 'استوديو مدارج للتصميم — عينة اختبار';
  draft.data.products.items.push({
    ...draft.data.products.items[0],
    id: 'product-2',
    name: 'خدمة تصميم Web 2026',
    price: '230',
    sales: '25',
  });
  draft.data.staff.items.push({
    id: 'staff-2',
    role: 'مدير تشغيل',
    salary: '4000',
    count: '1',
    additional: '0',
  });
  draft.data.expenses.items.push({
    id: 'expense-2',
    category: 'marketing',
    name: 'تسويق',
    amount: '500',
    period: 'monthly',
  });
  draft.data.investment.items.push({
    ...draft.data.investment.items[0],
    id: 'asset-2',
    name: 'أثاث',
    cost: '1000',
    quantity: '3',
  });
  if (manufacturing) {
    draft.data.assumptions.receivableDays = '30';
    draft.data.assumptions.inventoryDays = '45';
    draft.data.assumptions.payableDays = '30';
    draft.data.investment.items[0].depreciable = true;
    draft.data.investment.items[0].usefulLife = '5';
  }
  draft.completed = true;
  const report: StudyReport = {
    version: 1,
    id: crypto.randomUUID(),
    studyId: draft.id,
    revision: 1,
    createdAt: new Date().toISOString(),
    inputHash: await inputHash(draft),
    snapshot: draft,
    projection: projectStudy(draft.data),
    researchPerformed: false,
    origin: 'fixture',
    evidence: [],
    usage: [{ model: 'local-layout-fixture', tokens: 0, cost: 0, searches: 0 }],
    sections: (Object.keys(SECTION_TITLES) as SectionId[]).map((id) => ({
      id,
      paragraphs: [
        `هذه عينة اختبار لتنسيق ${SECTION_TITLES[id]} وليست دراسة مولدة بالذكاء الاصطناعي. يستهدف المشروع تقديم خدمات متخصصة للعملاء، مع مراقبة التدفقات النقدية والقدرة التشغيلية. ينبغي مقارنة التقديرات بالطلب الفعلي قبل الاستثمار. `.repeat(
          3,
        ),
        'يشمل الاختبار نصاً مختلطاً: Angular 22 وOpenRouter، ونسبة 12.5% وقيمة SAR 1,250. يجب عرض الكلمات والأرقام بصورة صحيحة دون قص أو تداخل. لم يُجر بحث خارجي ولا تمثل هذه العينة توصية استثمارية.',
      ],
      bullets: [
        'راجع افتراضات حجم الطلب وتكلفة الوحدة شهرياً.',
        'اربط التوظيف بالطاقة التشغيلية ومواعيد التحصيل.',
        'تحقق من الاشتراطات المحلية لدى الجهات المختصة.',
      ],
      sourceIds: [],
      metricIds: [],
    })),
  };
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('madarej-feasibility', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('drafts', 'readwrite'),
        s = tx.objectStore('drafts');
      s.clear();
      s.put(draft, 'active');
      s.put([report], 'reports:' + draft.id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
  location.href = '/report';
}
const panel = document.createElement('aside');
panel.setAttribute('aria-label', 'Local QA controls');
panel.style.cssText = 'padding:16px;background:#fff;color:#111;direction:ltr';
for (const [label, manufacturing] of [
  ['Load service fixture', false],
  ['Load manufacturing fixture', true],
] as const) {
  const button = document.createElement('button');
  button.textContent = label;
  button.addEventListener('click', () => {
    if (confirm('Replace local QA data with the selected test fixture?')) void seed(manufacturing);
  });
  panel.append(button);
}
document.body.append(panel);
// Capture generated PDFs from the real download path for local visual inspection.
const original = URL.createObjectURL.bind(URL);
URL.createObjectURL = (blob: Blob | MediaSource) => {
  if (blob instanceof Blob && blob.type === 'application/pdf')
    void fetch('/__qa/pdf', { method: 'POST', body: blob });
  return original(blob);
};
