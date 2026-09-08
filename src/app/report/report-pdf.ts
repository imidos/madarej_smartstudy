import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { metricDetails, StudyReport, SECTION_TITLES } from './report-model';
import { FINANCIAL_ROWS } from './financial-tables';
import { ASSUMPTION_FIELDS } from '../study/ui/forecast-fields';
import { reportCharts } from './chart-data';
import { createChart } from './report-chart';
import { blobBase64 } from './report-repository';
import { metricRows } from './metric-rows';
import { inputTables } from './input-tables';
import { inputCaveats } from './input-caveats';

export async function buildReportPdf(report: StudyReport): Promise<Blob> {
  const font = await fetch('/fonts/Amiri-Regular.ttf');
  if (!font.ok) throw new Error('pdf-font');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.addFileToVFS('Amiri-Regular.ttf', await blobBase64(await font.blob()));
  pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  pdf.setFont('Amiri');
  // Logical Arabic input becomes visual PDF glyph order exactly once, including AutoTable cells.
  const write = pdf.text.bind(pdf);
  pdf.text = (value, x, y, options, transform) =>
    write(
      value,
      x,
      y,
      {
        isInputVisual: false,
        isOutputVisual: true,
        isInputRtl: true,
        isOutputRtl: false,
        ...options,
      },
      transform,
    );
  const toc: { title: string; page: number }[] = [];
  let y = 30;
  const page = () => {
    pdf.addPage();
    y = 27;
  };
  const text = (value: string, size = 11, gap = 6) => {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(value, 174) as string[];
    for (const line of lines) {
      if (y > 273) page();
      pdf.text(line, 192, y, { align: 'right' });
      y += gap;
    }
    y += 3;
  };
  const heading = (value: string) => {
    if (y > 230) page();
    toc.push({ title: value, page: pdf.getNumberOfPages() });
    pdf.setTextColor('#272454');
    text(value, 18, 9);
    pdf.setTextColor('#33354b');
  };
  const table = (
    headers: string[],
    rows: string[][],
    options: { caption?: string; keepTogether?: boolean; compact?: boolean } = {},
  ) => {
    const estimatedHeight = 12 + rows.length * (options.compact ? 6.5 : 8);
    if ((options.keepTogether || estimatedHeight <= 90) && y + estimatedHeight > 266) page();
    autoTable(pdf, {
      startY: y,
      head: [headers.slice().reverse()],
      body: rows.map((r) => r.slice().reverse()),
      styles: {
        font: 'Amiri',
        fontStyle: 'normal',
        halign: 'right',
        fontSize: options.compact ? 8 : 10,
        cellPadding: options.compact ? 1.6 : 2.4,
        overflow: 'linebreak',
      },
      headStyles: { fillColor: [39, 36, 84], fontStyle: 'normal' },
      margin: { top: 25, bottom: 22, left: 18, right: 18 },
      rowPageBreak: 'avoid',
      willDrawPage: ({ pageNumber }: { pageNumber: number }) => {
        if (pageNumber <= 1 || !options.caption) return;
        pdf.setFont('Amiri');
        pdf.setFontSize(10);
        pdf.setTextColor('#687081');
        pdf.text(`${options.caption} — متابعة`, 192, 18, { align: 'right' });
        pdf.setTextColor('#33354b');
      },
    });
    y = (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  };
  pdf.setProperties({
    title: `${isFixture(report) ? 'عينة تحقق محلية' : 'دراسة جدوى'} — ${report.snapshot.data.project.name}`,
    author: 'مدارج',
    subject: 'دراسة جدوى فنية ومالية',
  });
  pdf.setFillColor('#272454');
  pdf.rect(0, 0, 210, 90, 'F');
  pdf.setTextColor('#ffffff');
  y = 35;
  text('مدارج', 30, 13);
  text('دراسة الجدوى الفنية والمالية', 21, 11);
  y = 115;
  pdf.setTextColor('#272454');
  text(report.snapshot.data.project.name, 24, 12);
  const data = report.snapshot.data;
  text(`${data.project.country} — ${data.project.city} | ${data.project.currency}`, 13, 8);
  text(`مدة الدراسة: ${data.project.years} سنوات | النسخة: ${report.revision}`, 12, 8);
  text(`تاريخ الإصدار: ${report.createdAt.slice(0, 10)}`, 12, 8);
  text(`معرّف المدخلات: ${report.inputHash.slice(0, 12)}`, 10, 7);
  const models = [...new Set(report.usage.map((usage) => usage.model))].join('، ');
  if (models) text(`النموذج المسجل: ${models}`, 10, 7);
  if (report.snapshot.logo) {
    const bitmap = await createImageBitmap(report.snapshot.logo.blob);
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const context = canvas.getContext('2d')!;
    const scale = Math.min(200 / bitmap.width, 200 / bitmap.height);
    context.drawImage(
      bitmap,
      (200 - bitmap.width * scale) / 2,
      (200 - bitmap.height * scale) / 2,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 170, 175, 24, 24);
    bitmap.close();
  }
  y = 220;
  if (isFixture(report)) {
    pdf.setFillColor('#a01632');
    pdf.rect(18, y - 9, 174, 14, 'F');
    pdf.setTextColor('#ffffff');
    pdf.setFontSize(12);
    pdf.text('عينة تحقق محلية — ليست دراسة مولدة ولا تستخدم لقرار استثماري', 192, y, {
      align: 'right',
    });
    pdf.setTextColor('#272454');
    y += 17;
  }
  text(
    'تقديرات تخطيطية مبنية على مدخلات العميل وافتراضاته. النتائج لا تضمن الربحية ولا تمثل اعتماداً محاسبياً أو نظامياً.',
    11,
    7,
  );
  if (!report.researchPerformed)
    text('نسخة دون بحث خارجي: الاستنتاجات السوقية افتراضات غير متحققة بمصادر حديثة.', 11, 7);
  page();
  const contentsPage = pdf.getNumberOfPages();
  text('فهرس الدراسة', 22, 10);
  page();
  for (const id of Object.keys(SECTION_TITLES) as (keyof typeof SECTION_TITLES)[]) {
    const section = report.sections.find((s) => s.id === id);
    if (!section) continue;
    heading(SECTION_TITLES[id]);
    for (const paragraph of section.paragraphs) text(paragraph);
    for (const bullet of section.bullets) text('• ' + bullet);
    if (section.metricIds.length) {
      text('الأرقام المعتمدة للحساب', 12, 7);
      const metrics = metricDetails(report.projection);
      table(
        ['المؤشر', 'الفترة', 'القيمة'],
        section.metricIds.flatMap((id) => {
          const metric = metrics[id];
          return metric
            ? [[metric.label, metric.period, `${format(metric.value)} ${metric.unit}`]]
            : [];
        }),
        { caption: 'الأرقام المعتمدة للحساب', keepTogether: true },
      );
    }
    for (const sourceId of section.sourceIds) {
      const source = report.evidence.find((s) => s.id === sourceId);
      if (source) {
        if (y > 265) page();
        pdf.setTextColor('#3c5487');
        pdf.textWithLink(source.title.slice(0, 90), 192, y, { align: 'right', url: source.url });
        pdf.setTextColor('#33354b');
        y += 8;
      }
    }
  }
  page();
  heading('الافتراضات المعتمدة');
  table(
    ['الافتراض', 'القيمة'],
    ASSUMPTION_FIELDS.map((f) => [f.label, data.assumptions[f.key] || 'لم يحدد']),
    { caption: 'الافتراضات المعتمدة' },
  );
  const caveats = inputCaveats(data);
  if (caveats.length) {
    heading('حدود المدخلات التي يلزم التحقق منها');
    for (const caveat of caveats) text('• ' + caveat);
  }
  heading('منهجية الحساب');
  for (const note of report.projection.methodology) text(note);
  for (const scenario of report.projection.scenarios) {
    page();
    heading(
      `القوائم المالية — ${scenario.id === 'base' ? 'الأساسي' : scenario.id === 'optimistic' ? 'المتفائل' : 'المتحفظ'}`,
    );
    table(
      ['البند', ...scenario.years.map((y) => y.period)],
      FINANCIAL_ROWS.map((r) => [r.label, ...scenario.years.map((y) => format(y[r.key]))]),
      { caption: 'القوائم المالية' },
    );
    table(
      ['المؤشر', 'القيمة'],
      metricRows(scenario).map((row) => [row.label, format(row.value)]),
      { caption: 'المؤشرات المالية' },
    );
    if (scenario.project.irrStatus === 'ambiguous' || scenario.equity.irrStatus === 'ambiguous')
      text('العائد الداخلي ملتبس عند تعدد تغيرات إشارة التدفق؛ لا يعتمد معدل وحيد.');
    for (const warning of scenario.warnings) text(warning);
  }
  for (const chartData of reportCharts(report.projection, data)) {
    page();
    heading(chartData.title);
    text(chartData.description);
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 520;
    const chart = createChart(canvas, chartData, true);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 18, y, 174, 90);
    chart.destroy();
    y += 98;
    table(
      ['البند', ...chartData.series.map((s) => s.label)],
      chartData.labels.map((label, i) => [
        label,
        ...chartData.series.map((s) => format(String(s.values[i]))),
      ]),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const operatingRows = FINANCIAL_ROWS.filter((row) =>
    [
      'revenue',
      'variableCosts',
      'grossProfit',
      'payroll',
      'expenses',
      'depreciation',
      'operatingProfit',
      'interest',
      'tax',
      'netProfit',
      'cashChange',
      'cash',
    ].includes(row.key),
  );
  const financialPositionRows = FINANCIAL_ROWS.filter((row) => !operatingRows.includes(row));
  for (let year = 0; year < Number(data.project.years); year++) {
    for (const [label, rows] of [
      ['التشغيل والسيولة', operatingRows],
      ['التمويل والمركز المالي', financialPositionRows],
    ] as const) {
      page();
      const title = `الملحق الشهري — السنة ${year + 1}: ${label}`;
      heading(title);
      for (let half = 0; half < 2; half++) {
      const months = report.projection.scenarios[0].months.slice(
        year * 12 + half * 6,
        year * 12 + half * 6 + 6,
      );
      table(
        ['البند', ...months.map((m) => m.period)],
        rows.map((row) => [row.label, ...months.map((m) => format(m[row.key]))]),
        { caption: title, compact: true, keepTogether: true },
      );
      }
    }
  }
  page();
  heading('مدخلات الدراسة التفصيلية');
  for (const input of inputTables(data)) {
    if (y + 24 + input.rows.length * 8 > 266) page();
    text(input.title, 14, 8);
    table(input.headers, input.rows, { caption: input.title, keepTogether: true });
  }
  page();
  heading('طاقة المنتجات والطلب غير المخدوم');
  const base = report.projection.scenarios[0];
  table(
    ['الفترة', 'المنتج', 'الوحدات', 'الطاقة', 'الاستغلال %', 'طلب غير مخدوم'],
    base.years.flatMap((year) =>
      year.products.map((p) => [
        year.period,
        p.name,
        format(p.units),
        format(p.capacity),
        format(p.utilization),
        format(p.unmetDemand),
      ]),
    ),
  );
  page();
  heading('تدفقات التقييم');
  text(
    'الشهر صفر هو الاستثمار الأولي. الشهر الأخير يشمل الاسترداد الافتراضي؛ تختلف هذه التدفقات عن أرصدة التشغيل المحتفظ بها.',
  );
  table(
    ['الفترة', 'المشروع — الأساسي', 'الملاك — الأساسي'],
    base.projectFlows.map((flow, i) => [
      i === 0 ? 'البداية' : base.months[i - 1].period,
      format(flow),
      format(base.equityFlows[i]),
    ]),
  );
  page();
  heading('المصادر والمراجع');
  if (!report.researchPerformed)
    text(
      'لم يُنفذ بحث خارجي لهذا التقرير. الروابط التي قدمها العميل، إن وجدت، لم تُتحقق تلقائياً.',
    );
  for (const source of report.evidence) {
    text(`${source.title} — ${source.publisher}`);
    text(
      `تاريخ المصدر: ${source.date || 'غير محدد'} | الاسترجاع: ${source.retrievedAt.slice(0, 10)}`,
    );
    text(source.excerpt);
    if (y > 260) page();
    pdf.setFontSize(8);
    pdf.textWithLink(source.url.slice(0, 100), 18, y, { url: source.url });
    y += 12;
  }
  // Fill reserved contents page; linked entries point to final page numbers.
  pdf.setPage(contentsPage);
  y = 44;
  pdf.setFontSize(9);
  for (const entry of toc) {
    if (y > 270) throw new Error('pdf-contents-overflow');
    pdf.text(`${entry.title}  ·  ${entry.page}`, 192, y, { align: 'right' });
    pdf.link(18, y - 4, 174, 5, { pageNumber: entry.page });
    y += 5;
  }
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor('#687081');
    pdf.text(`مدارج | ${i} / ${pages}`, 192, 289, { align: 'right' });
  }
  return pdf.output('blob');
}
const isFixture = (report: StudyReport) =>
  report.origin === 'fixture' || report.usage.some((usage) => usage.model === 'local-layout-fixture');
const format = (value: string | null) =>
  value === null
    ? 'غير متاح / لم يتحقق'
    : new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(Number(value));
