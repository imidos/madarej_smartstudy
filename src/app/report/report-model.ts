import { z } from 'zod';
import { FeasibilityStudyDraft } from '../study/study-model';
import { FinancialProjection } from '../study/projections';

export const SECTION_TITLES = {
  executive: 'الملخص التنفيذي',
  business: 'فكرة المشروع ونموذج العمل',
  market: 'السوق والعملاء والطلب',
  competitors: 'المنافسون والتموضع',
  marketing: 'خطة التسويق والمبيعات',
  technical: 'الجدوى الفنية والتشغيلية',
  operations: 'المرافق والطاقة والمواد والموردون',
  staff: 'فريق العمل والتنظيم',
  regulatory: 'المتطلبات النظامية والسلامة والبيئة',
  investment: 'الاستثمار والتمويل',
  financial: 'قراءة النتائج المالية',
  scenarios: 'السيناريوهات والحساسية',
  swot: 'تحليل نقاط القوة والضعف والفرص والتهديدات',
  risks: 'المخاطر وإجراءات الحد منها',
  roadmap: 'خارطة التنفيذ ومؤشرات المتابعة',
  conclusion: 'الخلاصة وشروط المضي في المشروع',
} as const;
export type SectionId = keyof typeof SECTION_TITLES;
export const STAGES: { id: string; label: string; sections: SectionId[] }[] = [
  {
    id: 'business',
    label: 'تحليل المشروع والسوق',
    sections: ['business', 'market', 'competitors', 'marketing'],
  },
  {
    id: 'operations',
    label: 'التحليل الفني والتشغيلي',
    sections: ['technical', 'operations', 'staff', 'regulatory'],
  },
  {
    id: 'financial',
    label: 'تفسير التمويل والنتائج',
    sections: ['investment', 'financial', 'scenarios'],
  },
  {
    id: 'recommendations',
    label: 'المخاطر وخطة التنفيذ',
    sections: ['swot', 'risks', 'roadmap', 'conclusion'],
  },
  { id: 'summary', label: 'صياغة الملخص التنفيذي', sections: ['executive'] },
];
export const evidenceSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(300),
    url: z.url().refine((v) => v.startsWith('https://') || v.startsWith('http://')),
    publisher: z.string().max(200),
    date: z.string().max(40),
    retrievedAt: z.string().max(40),
    excerpt: z.string().min(1).max(3000),
  })
  .strict();
export type ResearchEvidence = z.infer<typeof evidenceSchema>;
export const sectionSchema = z
  .object({
    id: z.enum(Object.keys(SECTION_TITLES) as [SectionId, ...SectionId[]]),
    paragraphs: z.array(z.string().min(1).max(2400)).min(2).max(8),
    bullets: z.array(z.string().min(1).max(800)).max(12),
    sourceIds: z.array(z.string().max(80)).max(20),
    metricIds: z.array(z.string().max(80)).max(12),
  })
  .strict();
export type ReportSection = z.infer<typeof sectionSchema>;
export interface RequestUsage {
  model: string;
  tokens: number;
  cost: number | null;
  searches: number;
}
export interface ReportMetric {
  label: string;
  value: string | null;
  unit: string;
  period: string;
}
export interface StudyReport {
  version: 1;
  id: string;
  studyId: string;
  revision: 1 | 2;
  createdAt: string;
  inputHash: string;
  snapshot: FeasibilityStudyDraft;
  projection: FinancialProjection;
  sections: ReportSection[];
  evidence: ResearchEvidence[];
  usage: RequestUsage[];
  researchPerformed: boolean;
  /** Absent on reports saved before this field was introduced. */
  origin?: 'generated' | 'fixture';
}
export interface GenerationRun {
  version: 1;
  studyId: string;
  inputHash: string;
  snapshot: FeasibilityStudyDraft;
  projection: FinancialProjection;
  sections: ReportSection[];
  evidence: ResearchEvidence[];
  usage: RequestUsage[];
  researchDone: boolean;
  stage: number;
  status: 'running' | 'interrupted' | 'failed' | 'complete';
  message: string;
  updatedAt: string;
}
export const configSchema = z
  .object({
    apiKey: z.string().min(1),
    model: z.string().min(1).max(150),
    zeroCost: z.boolean(),
    reasoningEffort: z.enum(['low', 'medium', 'high']),
    researchEnabled: z.boolean(),
    researchBudgetUsd: z.number().min(0).max(10),
    maxTokens: z.number().int().min(2000).max(32000),
    timeoutSeconds: z.number().int().min(30).max(300),
  })
  .strict()
  .refine(
    (v) => !v.zeroCost || (!v.researchEnabled && v.researchBudgetUsd === 0),
    'zero-cost-conflict',
  );
export type ReportGenerationConfig = z.infer<typeof configSchema>;
export async function inputHash(draft: FeasibilityStudyDraft): Promise<string> {
  const logo = draft.logo
    ? {
        name: draft.logo.name,
        type: draft.logo.type,
        bytes: Array.from(new Uint8Array(await draft.logo.blob.arrayBuffer())),
      }
    : null;
  const bytes = new TextEncoder().encode(JSON.stringify({ data: draft.data, logo }));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export function metricValues(p: FinancialProjection): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metricDetails(p)).map(([id, metric]) => [id, metric.value ?? 'غير متاح']),
  );
}
export function metricDetails(p: FinancialProjection): Record<string, ReportMetric> {
  const s = p.scenarios[0];
  return {
    investment: { label: 'إجمالي الاستثمار المبدئي', value: p.investment, unit: 'عملة الدراسة', period: 'البداية' },
    borrowing: { label: 'الاقتراض', value: p.borrowing, unit: 'عملة الدراسة', period: 'البداية' },
    fees: { label: 'رسوم القرض المقدمة', value: p.upfrontFees, unit: 'عملة الدراسة', period: 'البداية' },
    npv: { label: 'صافي القيمة الحالية للمشروع', value: s.project.npv, unit: 'عملة الدراسة', period: 'كامل مدة الدراسة' },
    irr: { label: 'العائد الداخلي للمشروع', value: s.project.irr, unit: '% سنوي', period: 'كامل مدة الدراسة' },
    payback: { label: 'فترة استرداد المشروع', value: s.project.paybackMonths, unit: 'شهر', period: 'كامل مدة الدراسة' },
    fundingShortfall: { label: 'التمويل الإضافي اللازم', value: s.fundingShortfall, unit: 'عملة الدراسة', period: 'أدنى رصيد نقدي' },
    revenueYear1: { label: 'المبيعات', value: s.years[0].revenue, unit: 'عملة الدراسة دون ضريبة المبيعات', period: 'السنة الأولى' },
    profitYear1: { label: 'صافي الربح', value: s.years[0].netProfit, unit: 'عملة الدراسة', period: 'السنة الأولى' },
    breakEvenRevenue: { label: 'مبيعات التعادل', value: s.breakEvenRevenue, unit: 'عملة الدراسة', period: 'السنة الأولى' },
    dscr: { label: 'تغطية خدمة الدين', value: s.dscr, unit: 'مرة', period: 'كامل مدة الدراسة' },
  };
}
