import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ReportRepository } from './report-repository';
import { DraftRepository } from '../study/draft-repository';
import { validDraft } from '../study/testing/study-fixture';
import { GenerationRun, inputHash, SECTION_TITLES, SectionId, StudyReport } from './report-model';
import { projectStudy } from '../study/projections';
describe('Report persistence and validated backups', () => {
  let db: DraftRepository, repo: ReportRepository;
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    db = TestBed.inject(DraftRepository);
    repo = TestBed.inject(ReportRepository);
    await db.delete();
  });
  afterEach(() => TestBed.resetTestingModule());
  const file = (value: unknown) =>
    ({ size: 100, text: () => Promise.resolve(JSON.stringify(value)) }) as File;
  it('imports existing data without coercing blanks and zeros and rejects invalid files', async () => {
    const draft = validDraft();
    draft.data.assumptions.profitTax = '';
    draft.data.assumptions.discountRate = '0';
    expect(await repo.parseBackup(file({ format: 'madarej-study', version: 1, draft }))).toEqual(
      draft,
    );
    await expect(repo.parseBackup(file({ format: 'wrong', version: 1, draft }))).rejects.toThrow();
    await expect(
      repo.parseBackup(
        file({ format: 'madarej-study', version: 1, draft: { ...draft, data: {} } }),
      ),
    ).rejects.toThrow();
    await expect(repo.parseBackup({ size: 9000000 } as File)).rejects.toThrow();
  });
  it('atomically allows one initial report and one revision and rejects corrupted checkpoints', async () => {
    const snapshot = validDraft(),
      projection = projectStudy(snapshot.data),
      hash = await inputHash(snapshot);
    const sections = (Object.keys(SECTION_TITLES) as SectionId[]).map((id) => ({
      id,
      paragraphs: ['تحليل', 'تفصيل'],
      bullets: [],
      sourceIds: [],
      metricIds: [],
    }));
    const run: GenerationRun = {
      version: 1,
      studyId: snapshot.id,
      inputHash: hash,
      snapshot,
      projection,
      sections,
      evidence: [],
      usage: [],
      stage: 5,
      status: 'running',
      message: '',
      researchDone: true,
      updatedAt: new Date().toISOString(),
    };
    const report: StudyReport = {
      version: 1,
      id: 'report-1',
      studyId: snapshot.id,
      inputHash: hash,
      snapshot,
      projection,
      sections,
      evidence: [],
      usage: [],
      revision: 1,
      createdAt: new Date().toISOString(),
      researchPerformed: false,
    };
    await repo.complete(report, run);
    expect((await repo.run(snapshot.id))?.status).toBe('complete');
    await repo.complete({ ...report, id: 'report-2', revision: 2 }, run);
    expect(await repo.reports(snapshot.id)).toHaveLength(2);
    await expect(repo.complete({ ...report, id: 'report-3', revision: 2 }, run)).rejects.toThrow();
    await repo.saveRun({ ...run, stage: 3, sections: [] });
    await expect(repo.run(snapshot.id)).rejects.toThrow();
    await db.delete();
    expect(await repo.reports(snapshot.id)).toEqual([]);
  });
  it('preserves validated saved figures and rejects malformed projections', async () => {
    const snapshot = validDraft(),
      projection = projectStudy(snapshot.data),
      hash = await inputHash(snapshot);
    const sections = (Object.keys(SECTION_TITLES) as SectionId[]).map((id) => ({
      id,
      paragraphs: ['تحليل', 'تفصيل'],
      bullets: [],
      sourceIds: [],
      metricIds: [],
    }));
    const run: GenerationRun = {
      version: 1,
      studyId: snapshot.id,
      inputHash: hash,
      snapshot,
      projection,
      sections,
      evidence: [],
      usage: [],
      stage: 5,
      status: 'running',
      message: '',
      researchDone: true,
      updatedAt: new Date().toISOString(),
    };
    const report: StudyReport = {
      version: 1,
      id: 'report-recomputed',
      studyId: snapshot.id,
      inputHash: hash,
      snapshot,
      projection: { ...projection, investment: '999' },
      sections,
      evidence: [],
      usage: [],
      revision: 1,
      createdAt: new Date().toISOString(),
      researchPerformed: false,
    };
    await repo.complete(report, run);
    expect((await repo.reports(snapshot.id))[0].projection.investment).toBe('999');
    await db.transaction('readwrite', (s) =>
      s.put(
        [{ ...report, projection: { ...projection, investment: 'NaN' } }],
        'reports:' + snapshot.id,
      ),
    );
    await expect(repo.reports(snapshot.id)).rejects.toThrow();
  });
});
