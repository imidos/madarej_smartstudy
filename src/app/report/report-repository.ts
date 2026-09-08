import { inject, Service } from '@angular/core';
import { z } from 'zod';
import { DraftRepository, isDraft, migrateDraft } from '../study/draft-repository';
import { FeasibilityStudyDraft, Logo } from '../study/study-model';
import {
  GenerationRun,
  StudyReport,
  sectionSchema,
  evidenceSchema,
  inputHash,
  STAGES,
  SECTION_TITLES,
  metricValues,
} from './report-model';
import { projectionSchema } from './projection-schema';
import { studyIssues } from '../study/study-validation';

const envelope = z.object({
  version: z.literal(1),
  studyId: z.string(),
  inputHash: z.string().length(64),
  sections: z.array(sectionSchema),
  evidence: z.array(evidenceSchema),
  usage: z.array(
    z.object({
      model: z.string(),
      tokens: z.number(),
      cost: z.number().nullable(),
      searches: z.number(),
    }),
  ),
  snapshot: z.custom<FeasibilityStudyDraft>(isDraft),
  projection: projectionSchema,
});
@Service()
export class ReportRepository {
  private readonly db = inject(DraftRepository);
  async reports(studyId: string): Promise<StudyReport[]> {
    const stored: unknown = await this.db.transaction('readonly', (s) =>
      s.get('reports:' + studyId),
    );
    if (stored === undefined) return [];
    if (!Array.isArray(stored) || stored.length > 2) throw new Error('invalid-report');
    for (const [index, value] of stored.entries()) {
      envelope
        .extend({
          id: z.string(),
          revision: z.union([z.literal(1), z.literal(2)]),
          createdAt: z.iso.datetime(),
          researchPerformed: z.boolean(),
          origin: z.enum(['generated', 'fixture']).optional(),
        })
        .parse(value);
      if (
        value.studyId !== studyId ||
        value.snapshot.id !== studyId ||
        value.revision !== index + 1 ||
        value.inputHash !== (await inputHash(value.snapshot))
      )
        throw new Error('invalid-report');
    }
    return (stored as StudyReport[]).map((report) => {
      if (
        studyIssues(report.snapshot.data).length ||
        report.sections.length !== Object.keys(SECTION_TITLES).length ||
        report.projection.scenarios.some(
          (s) => s.years.length !== Number(report.snapshot.data.project.years),
        ) ||
        new Set(report.sections.map((s) => s.id)).size !== Object.keys(SECTION_TITLES).length ||
        report.sections.some(
          (s) =>
            s.sourceIds.some((id) => !report.evidence.some((e) => e.id === id)) ||
            s.metricIds.some((id) => !(id in metricValues(report.projection))),
        )
      )
        throw new Error('invalid-report');
      return report;
    });
  }
  async run(studyId: string): Promise<GenerationRun | undefined> {
    const value: unknown = await this.db.transaction('readonly', (s) => s.get('run:' + studyId));
    if (value === undefined) return undefined;
    const parsed = envelope
      .extend({
        stage: z.number().int().min(0).max(5),
        status: z.enum(['running', 'interrupted', 'failed', 'complete']),
        message: z.string(),
        updatedAt: z.iso.datetime(),
        researchDone: z.boolean(),
      })
      .parse(value);
    if (
      parsed.studyId !== studyId ||
      parsed.snapshot.id !== studyId ||
      parsed.inputHash !== (await inputHash(parsed.snapshot))
    )
      throw new Error('invalid-run');
    const expected = STAGES.slice(0, parsed.stage).flatMap((s) => s.sections);
    if (
      studyIssues(parsed.snapshot.data).length ||
      parsed.sections.length !== expected.length ||
      new Set(parsed.sections.map((s) => s.id)).size !== expected.length ||
      parsed.projection.scenarios.some(
        (s) => s.years.length !== Number(parsed.snapshot.data.project.years),
      ) ||
      parsed.sections.some(
        (s) =>
          !expected.includes(s.id) ||
          s.sourceIds.some((id) => !parsed.evidence.some((e) => e.id === id)) ||
          s.metricIds.some((id) => !(id in metricValues(parsed.projection))),
      )
    )
      throw new Error('invalid-run');
    return value as GenerationRun;
  }
  async saveRun(run: GenerationRun): Promise<void> {
    await this.db.transaction('readwrite', (s) => s.put(run, 'run:' + run.studyId));
  }
  async complete(report: StudyReport, run: GenerationRun): Promise<void> {
    await this.db.transaction('readwrite', (store) => {
      const request = store.get('reports:' + report.studyId);
      request.onsuccess = () => {
        const previous: StudyReport[] = request.result ?? [];
        if (previous.length >= 2 || report.revision !== previous.length + 1) {
          store.transaction.abort();
          return;
        }
        store.put([...previous, report], 'reports:' + report.studyId);
        store.put({ ...run, status: 'complete' }, 'run:' + report.studyId);
      };
      return request;
    });
  }
  async exportDraft(draft: FeasibilityStudyDraft): Promise<Blob> {
    const logo = draft.logo
      ? {
          name: draft.logo.name,
          type: draft.logo.type,
          size: draft.logo.size,
          base64: await blobBase64(draft.logo.blob),
        }
      : undefined;
    return new Blob(
      [JSON.stringify({ format: 'madarej-study', version: 1, draft: { ...draft, logo } })],
      { type: 'application/json' },
    );
  }
  async parseBackup(file: File): Promise<FeasibilityStudyDraft> {
    if (file.size > 8 * 1024 * 1024) throw new Error('invalid-backup');
    const parsed = z
      .object({
        format: z.literal('madarej-study'),
        version: z.literal(1),
        draft: z.record(z.string(), z.unknown()),
      })
      .parse(JSON.parse(await file.text()));
    const savedLogo = parsed.draft['logo'];
    let logo: Logo | undefined;
    if (savedLogo) {
      const l = z
        .object({
          name: z.string(),
          type: z.string(),
          size: z.number(),
          base64: z.string().max(2800000),
        })
        .parse(savedLogo);
      const bytes = Uint8Array.from(atob(l.base64), (c) => c.charCodeAt(0));
      logo = {
        name: l.name,
        type: l.type,
        size: l.size,
        blob: new Blob([bytes], { type: l.type }),
      };
    }
    const draft = migrateDraft({ ...parsed.draft, ...(logo ? { logo } : {}) });
    if (logo) {
      const bitmap = await createImageBitmap(logo.blob);
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 25000000) {
        bitmap.close();
        throw new Error('invalid-logo');
      }
      bitmap.close();
    }
    return draft;
  }
}
export function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('file-read'));
    reader.readAsDataURL(blob);
  });
}
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
