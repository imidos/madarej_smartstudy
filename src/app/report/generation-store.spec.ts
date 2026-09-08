import { TestBed } from '@angular/core/testing';
import { GenerationStore, validateSections } from './generation-store';
import { DraftRepository } from '../study/draft-repository';
import { ReportRepository } from './report-repository';
import { OpenRouterClient } from './openrouter-client';
import { StudyStore } from '../study/study-store';
import { validDraft } from '../study/testing/study-fixture';
import { GenerationRun, ReportSection, StudyReport } from './report-model';

const sectionMetrics = (id: string) =>
  id === 'executive' || id === 'financial'
    ? ['revenueYear1', 'profitYear1', 'npv']
    : id === 'scenarios'
      ? ['npv']
      : [];

describe('Generation checkpoints and revision accounting', () => {
  let saved: StudyReport[], checkpoint: GenerationRun | undefined;
  const client = { configuration: vi.fn(), preflight: vi.fn(), complete: vi.fn() };
  beforeEach(() => {
    saved = [];
    checkpoint = undefined;
    vi.resetAllMocks();
    vi.stubGlobal('navigator', {
      locks: {
        request: (_name: string, _options: unknown, callback: (lock: object) => Promise<void>) =>
          callback({}),
      },
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DraftRepository,
          useValue: { load: () => Promise.resolve(validDraft()), save: () => Promise.resolve() },
        },
        {
          provide: ReportRepository,
          useValue: {
            reports: () => Promise.resolve(saved),
            run: () => Promise.resolve(checkpoint),
            saveRun: (r: GenerationRun) => {
              checkpoint = structuredClone(r);
              return Promise.resolve();
            },
            complete: (r: StudyReport) => {
              saved.push(r);
              return Promise.resolve();
            },
          },
        },
        { provide: OpenRouterClient, useValue: client },
      ],
    });
    client.configuration.mockResolvedValue({ researchEnabled: false });
    client.preflight.mockResolvedValue(undefined);
    client.complete.mockImplementation((_config: unknown, messages: { content: string }[]) => {
      const [contextText] = messages[1].content.split('\nعقد النتيجة الملزم:\n');
      const context = JSON.parse(contextText);
      return Promise.resolve({
        content: JSON.stringify({
          sections: context.requestedSections.map((s: { id: string }) => ({
            id: s.id,
            paragraphs: ['تحليل يستند إلى البيانات.', 'يلزم التحقق من تقديرات السوق.'],
            bullets: [],
            sourceIds: [],
            metricIds: sectionMetrics(s.id),
          })),
        }),
        usage: { model: 'fixture', tokens: 10, cost: 0, searches: 0 },
        annotations: [],
      });
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('rejects invented sources, wrong sections, and malformed JSON', () => {
    const section = {
      id: 'executive',
      paragraphs: ['one', 'two'],
      bullets: [],
      sourceIds: ['invented'],
      metricIds: [],
    };
    expect(() =>
      validateSections(JSON.stringify({ sections: [section] }), ['executive'], [], []),
    ).toThrow();
    expect(() => validateSections('bad', ['executive'], [], [])).toThrow();
    section.sourceIds = [];
    expect(() =>
      validateSections(JSON.stringify({ sections: [section] }), ['market'], [], []),
    ).toThrow();
  });
  it('rejects missing authoritative metrics and repeated report paragraphs', () => {
    const executive: ReportSection = {
      id: 'executive',
      paragraphs: [
        'هذا نص تحليلي طويل يكفي لاختبار منع تكرار المحتوى بين أقسام التقرير بصورة موثوقة ودون اعتماد على الصياغة فقط.',
        'وهذه فقرة ثانية مستقلة تحقق الحد الأدنى المطلوب في عقد أقسام التقرير قبل فحص المراجع والأرقام المعتمدة.',
      ],
      bullets: [],
      sourceIds: [],
      metricIds: [],
    };
    expect(() =>
      validateSections(JSON.stringify({ sections: [executive] }), ['executive'], [], ['npv']),
    ).toThrow('missing-authoritative-metric');
    executive.metricIds = ['revenueYear1', 'profitYear1', 'npv'];
    expect(() =>
      validateSections(JSON.stringify({ sections: [executive] }), ['executive'], [], executive.metricIds, [
        { ...executive, metricIds: [] },
      ]),
    ).toThrow('repeated-report-text');
  });
  it('resumes only failed stages and consumes revisions only after complete success', async () => {
    const store = TestBed.inject(GenerationStore);
    await store.load();
    const valid = client.complete.getMockImplementation()!;
    client.complete.mockImplementationOnce(valid).mockRejectedValueOnce(new Error('offline'));
    await store.generate();
    expect(saved).toHaveLength(0);
    expect(checkpoint?.stage).toBe(1);
    expect(checkpoint?.status).toBe('failed');
    await store.generate();
    expect(saved).toHaveLength(1);
    expect(saved[0].sections).toHaveLength(16);
    expect(saved[0].revision).toBe(1);
    const count = client.complete.mock.calls.length;
    await store.generate();
    expect(client.complete).toHaveBeenCalledTimes(count);
    TestBed.inject(StudyStore).data.update((d) => ({
      ...d,
      project: { ...d.project, name: 'مشروع معدل' },
    }));
    await store.generate();
    expect(saved).toHaveLength(2);
    expect(saved[1].revision).toBe(2);
    await store.generate();
    expect(saved).toHaveLength(2);
  });
  it('does not overwrite checkpoints when another tab owns the lock', async () => {
    const store = TestBed.inject(GenerationStore);
    await store.load();
    vi.stubGlobal('navigator', {
      locks: {
        request: (_n: string, _o: unknown, callback: (lock: null) => Promise<void>) =>
          callback(null),
      },
    });
    await store.generate();
    expect(client.complete).not.toHaveBeenCalled();
    expect(checkpoint).toBeUndefined();
    expect(store.message()).toContain('نافذة أخرى');
  });
  it('saves active inputs before any provider request and stops on storage failure', async () => {
    const store = TestBed.inject(GenerationStore);
    await store.load();
    const save = vi.spyOn(store.study, 'saveNow').mockResolvedValue(false);
    await store.generate();
    expect(save).toHaveBeenCalledOnce();
    expect(client.configuration).not.toHaveBeenCalled();
    expect(client.complete).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
    expect(store.message()).toContain('حفظ');
  });
  it('retains usage for schema failures without consuming a revision', async () => {
    const store = TestBed.inject(GenerationStore);
    await store.load();
    client.complete.mockResolvedValue({
      content: '{}',
      usage: { model: 'fixture', tokens: 10, cost: 0, searches: 0 },
    });
    await store.generate();
    expect(checkpoint?.usage).toHaveLength(4);
    expect(checkpoint?.stage).toBe(0);
    expect(saved).toHaveLength(0);
  });
  it('uses an explicit identifier contract and recovers a rejected group one section at a time', async () => {
    const store = TestBed.inject(GenerationStore);
    await store.load();
    const contracts: {
      requiredSectionIds: string[];
      allowedSourceIds: string[];
      allowedMetricIds: string[];
    }[] = [];
    client.complete.mockImplementation((_config: unknown, messages: { content: string }[]) => {
      const [, contractText] = messages[1].content.split('\nعقد النتيجة الملزم:\n');
      const contract = JSON.parse(contractText.split('\nأعد النتيجة كاملة')[0]);
      contracts.push(contract);
      if (contract.requiredSectionIds.length > 1)
        return Promise.resolve({
          content: '{}',
          usage: { model: 'fixture', tokens: 10, cost: 0, searches: 0 },
          annotations: [],
        });
      return Promise.resolve({
        content: JSON.stringify({
          sections: [
            {
              id: contract.requiredSectionIds[0],
              paragraphs: ['تحليل يستند إلى البيانات.', 'يلزم التحقق من تقديرات السوق.'],
              bullets: [],
              sourceIds: [],
              metricIds: sectionMetrics(contract.requiredSectionIds[0]),
            },
          ],
        }),
        usage: { model: 'fixture', tokens: 10, cost: 0, searches: 0 },
        annotations: [],
      });
    });
    await store.generate();
    expect(saved).toHaveLength(1);
    expect(saved[0].sections).toHaveLength(16);
    expect(contracts.some((contract) => contract.requiredSectionIds.length > 1)).toBe(true);
    expect(contracts.filter((contract) => contract.requiredSectionIds.length === 1)).toHaveLength(
      16,
    );
    expect(contracts.every((contract) => contract.allowedSourceIds.length === 0)).toBe(true);
    expect(contracts.every((contract) => contract.allowedMetricIds.includes('npv'))).toBe(true);
  });
  it('does not display a previous study after loading another empty study', async () => {
    const store = TestBed.inject(GenerationStore);
    await store.load();
    await store.generate();
    expect(store.report()).toBeDefined();
    saved = [];
    checkpoint = undefined;
    await store.load();
    expect(store.report()).toBeUndefined();
    expect(store.run()).toBeUndefined();
    expect(store.message()).toBe('');
  });
});
