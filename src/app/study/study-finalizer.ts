import { inject, Service } from '@angular/core';
import { DraftRepository } from './draft-repository';
import { FeasibilityStudyDraft } from './study-model';
import { studyIssues } from './study-validation';

@Service()
export class StudyFinalizer {
  private readonly repository = inject(DraftRepository);
  async finalize(draft: FeasibilityStudyDraft): Promise<FeasibilityStudyDraft> {
    if (studyIssues(draft.data).length) throw new Error('incomplete-study');
    const snapshot = structuredClone({
      ...draft,
      completed: true,
      step: 8,
      updatedAt: new Date().toISOString(),
    });
    // This is the integration boundary for a future reporting backend.
    await this.repository.save(snapshot);
    return snapshot;
  }
}
