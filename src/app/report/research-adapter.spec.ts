import { TestBed } from '@angular/core/testing';
import { ResearchAdapter } from './research-adapter';
import { OpenRouterClient } from './openrouter-client';
import { ReportGenerationConfig } from './report-model';
import { validStudy } from '../study/testing/study-fixture';
describe('Research evidence contract', () => {
  const complete = vi.fn();
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: OpenRouterClient, useValue: { complete } }],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.resetAllMocks();
  });
  it('uses provider citation excerpts and rejects sources without actual citation records', async () => {
    const source = {
      id: 's1',
      url: 'https://example.gov/statistics',
      title: 'AI title',
      publisher: 'Statistics',
      date: '',
      retrievedAt: '',
      excerpt: 'invented excerpt',
    };
    const result = {
      content: JSON.stringify({ evidence: [source] }),
      annotations: [
        {
          type: 'url_citation',
          url_citation: {
            url: source.url,
            title: 'Official statistics',
            content: 'Original extract from returned search result.',
          },
        },
      ],
      usage: { model: 'fixture', tokens: 1, cost: 0.007, searches: 1 },
    };
    complete.mockResolvedValue(result);
    const adapter = TestBed.inject(ResearchAdapter),
      config = {} as ReportGenerationConfig;
    const evidence = await adapter.research(config, validStudy(), new AbortController().signal);
    expect(evidence.evidence[0].excerpt).toBe('Original extract from returned search result.');
    expect(complete.mock.calls[0][1][1].content).not.toContain('salary');
    complete.mockResolvedValue({ ...result, annotations: [] });
    await expect(
      adapter.research(config, validStudy(), new AbortController().signal),
    ).rejects.toThrow();
  });
});
