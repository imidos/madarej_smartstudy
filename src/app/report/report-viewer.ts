import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GenerationStore } from './generation-store';
import { metricDetails, SECTION_TITLES, SectionId, STAGES } from './report-model';
import { reportCharts } from './chart-data';
import { ReportChart } from './report-chart';
import { FinancialTables } from './financial-tables';
import { downloadBlob } from './report-repository';
import { ASSUMPTION_FIELDS } from '../study/ui/forecast-fields';
import { ProjectionDetails } from './projection-details';
import { inputCaveats } from './input-caveats';

@Component({
  selector: 'app-report-viewer',
  imports: [RouterLink, ReportChart, FinancialTables, ProjectionDetails],
  templateUrl: './report-viewer.html',
})
export class ReportViewer implements OnInit {
  readonly store = inject(GenerationStore);
  readonly titles = SECTION_TITLES;
  readonly ids = Object.keys(SECTION_TITLES) as SectionId[];
  readonly stages = STAGES;
  readonly assumptions = ASSUMPTION_FIELDS;
  readonly selected = signal('');
  readonly exporting = signal(false);
  readonly notice = signal('');
  readonly report = computed(
    () => this.store.reports().find((r) => r.id === this.selected()) ?? this.store.report(),
  );
  readonly charts = computed(() => {
    const r = this.report();
    return r ? reportCharts(r.projection, r.snapshot.data) : [];
  });
  readonly reportStale = computed(
    () => this.store.stale() || this.report()?.inputHash !== this.store.report()?.inputHash,
  );
  readonly sections = computed(() =>
    this.ids
      .map((id) => this.report()?.sections.find((s) => s.id === id))
      .filter((s) => s !== undefined),
  );
  readonly modelNames = computed(() =>
    [...new Set(this.report()?.usage.map((u) => u.model))].join('، '),
  );
  readonly fixture = computed(
    () =>
      this.report()?.origin === 'fixture' ||
      this.report()?.usage.some((usage) => usage.model === 'local-layout-fixture') === true,
  );
  readonly metrics = computed(() => {
    const report = this.report();
    return report ? metricDetails(report.projection) : {};
  });
  readonly caveats = computed(() => {
    const report = this.report();
    return report ? inputCaveats(report.snapshot.data) : [];
  });
  async ngOnInit(): Promise<void> {
    await this.store.load();
  }
  async generate(): Promise<void> {
    this.notice.set('');
    await this.store.generate();
  }
  canLeave(): boolean {
    if (!this.store.busy()) return true;
    this.notice.set('أوقف إعداد الدراسة أولاً قبل الانتقال لتعديل المدخلات.');
    return false;
  }
  format(value: string | null): string {
    return value === null
      ? 'غير متاح'
      : new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(Number(value));
  }
  edit(step: number): void {
    this.store.study.step.set(step);
  }
  selectVersion(event: Event): void {
    this.selected.set((event.target as HTMLSelectElement).value);
  }
  async pdf(): Promise<void> {
    const report = this.report();
    if (!report || this.exporting()) return;
    this.exporting.set(true);
    this.notice.set('جارٍ تجهيز ملف PDF…');
    try {
      await document.fonts.ready;
      const { buildReportPdf } = await import('./report-pdf');
      const name = this.fixture() ? 'madarej-local-layout-fixture' : 'madarej-study';
      downloadBlob(await buildReportPdf(report), `${name}-v${report.revision}.pdf`);
      this.notice.set('تم تجهيز ملف PDF للتنزيل.');
    } catch {
      this.notice.set('تعذر تجهيز PDF. تحقق من توفر مساحة كافية ثم أعد المحاولة.');
    } finally {
      this.exporting.set(false);
    }
  }
  async backup(): Promise<void> {
    try {
      downloadBlob(
        await this.store.repository.exportDraft(this.store.study.snapshot()),
        'madarej-study-backup.json',
      );
      this.notice.set('تم تجهيز النسخة الاحتياطية للمدخلات والشعار. احتفظ بها في مكان خاص.');
    } catch {
      this.notice.set('تعذر إنشاء النسخة الاحتياطية.');
    }
  }
  async restore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const draft = await this.store.repository.parseBackup(file);
      if (
        !confirm(
          `استبدال المدخلات الحالية ببيانات «${draft.data.project.name}»؟ صدّر نسخة احتياطية أولاً إذا أردت الاحتفاظ بها.`,
        )
      )
        return;
      await this.store.study.importDraft(draft);
      await this.store.load();
      this.notice.set('تم استيراد المدخلات. راجع البيانات قبل إعداد الدراسة.');
    } catch {
      this.notice.set('تعذر استيراد الملف. تأكد من أنه نسخة احتياطية سليمة من مدارج.');
    } finally {
      input.value = '';
    }
  }
}
