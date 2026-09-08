import { OpenRouterClient } from './openrouter-client';
import { configSchema, ReportGenerationConfig } from './report-model';
const config: ReportGenerationConfig = {
  apiKey: 'test-placeholder',
  model: 'example:free',
  zeroCost: true,
  reasoningEffort: 'medium',
  researchEnabled: false,
  researchBudgetUsd: 0,
  maxTokens: 6000,
  timeoutSeconds: 30,
};
describe('OpenRouter request boundary', () => {
  const client = new OpenRouterClient();
  afterEach(() => vi.unstubAllGlobals());
  it('rejects paid tools in zero-cost configuration', async () => {
    expect(configSchema.safeParse({ ...config, researchEnabled: true }).success).toBe(false);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      client.complete(config, [], {}, new AbortController().signal, true),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires zero catalog pricing and structured output capabilities', async () => {
    const model = {
      id: config.model,
      pricing: { prompt: '0', completion: '0' },
      supported_parameters: ['reasoning', 'structured_outputs', 'response_format'],
    };
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json({ data: [model] })));
    vi.stubGlobal('fetch', fetcher);
    await expect(client.preflight(config, new AbortController().signal)).resolves.toBeUndefined();
    model.pricing.prompt = '0.001';
    await expect(client.preflight(config, new AbortController().signal)).rejects.toThrow();
    model.pricing.prompt = '0';
    model.supported_parameters = [];
    await expect(client.preflight(config, new AbortController().signal)).rejects.toThrow();
  });
  it('uses only the fixed destination, zero-price routing and no tools in free mode', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        model: config.model,
        choices: [
          { finish_reason: 'stop', message: { content: '{}', reasoning: 'private trace' } },
        ],
        usage: { total_tokens: 150, cost: 0 },
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const result = await client.complete(
      config,
      [{ role: 'user', content: 'test' }],
      {},
      new AbortController().signal,
    );
    const [url, options] = fetcher.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(body.tools).toBeUndefined();
    expect(body.models).toBeUndefined();
    expect(body.provider.max_price).toEqual({ prompt: 0, completion: 0 });
    expect(body.provider.require_parameters).toBe(true);
    expect(body.provider.data_collection).toBe('allow');
    expect(body.reasoning.exclude).toBe(true);
    expect(result.usage.model).toBe(config.model);
    expect(JSON.stringify(result)).not.toContain('private trace');
  });
  it.each([
    [
      'No endpoints found matching your data policy (Free model training).',
      'data-policy',
      'بالتدريب',
    ],
    [
      'No endpoints found matching your data policy (Free model publication).',
      'data-policy',
      'بنشر',
    ],
    ['No endpoints available matching your guardrail restrictions.', 'data-policy', 'الخصوصية'],
    ['No endpoints found that support the requested parameters.', '404', 'متطلبات الطلب'],
  ])(
    'explains routing failures without exposing provider details: %s',
    async (message, code, hint) => {
      const fetcher = vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              message: message + ' private-provider-detail',
              metadata: { raw: 'private' },
            },
          },
          { status: 404 },
        ),
      );
      vi.stubGlobal('fetch', fetcher);
      const error = await client
        .complete(config, [], {}, new AbortController().signal)
        .catch((error: unknown) => error);
      expect(error).toMatchObject({ code, message: expect.stringContaining(hint) });
      expect(String(error)).not.toContain('private-provider-detail');
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each([401, 402, 404, 429, 503])('preserves sanitized errors for HTTP %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('private-provider-message', { status, headers: { 'Retry-After': '300' } }),
        ),
    );
    await expect(client.complete(config, [], {}, new AbortController().signal)).rejects.not.toThrow(
      'private-provider-message',
    );
  });
  it('rejects truncated and malformed responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        model: 'example',
        choices: [{ finish_reason: 'length', message: { content: '{}' } }],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(client.complete(config, [], {}, new AbortController().signal)).rejects.toThrow();
    fetcher.mockResolvedValue(Response.json({ broken: true }));
    await expect(client.complete(config, [], {}, new AbortController().signal)).rejects.toThrow();
  });
  it.each([
    [402, undefined, '402', 'الرصيد'],
    [400, 'context_length_exceeded', 'context-length', 'سعة النموذج'],
    [400, 'max_tokens_exceeded', 'truncated', 'حد طول'],
    [403, 'content_policy_violation', 'content_policy_violation', 'رفض'],
    [404, undefined, 'data-policy', 'بالتدريب'],
  ])(
    'classifies an HTTP 200 error envelope with code %s and type %s',
    async (code, type, expected, hint) => {
      const fetcher = vi.fn().mockResolvedValue(
        Response.json({
          error: {
            code,
            message:
              code === 404
                ? 'No endpoints found matching your data policy (Free model training). private-detail'
                : 'private-detail',
            metadata: { error_type: type },
          },
        }),
      );
      vi.stubGlobal('fetch', fetcher);
      const error = await client
        .complete(config, [], {}, new AbortController().signal)
        .catch((error: unknown) => error);
      expect(error).toMatchObject({ code: expected, message: expect.stringContaining(hint) });
      expect(String(error)).not.toContain('private-detail');
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it.each(['top-level', 'choice'])(
    'retries a transient HTTP 200 %s error and returns the successful completion',
    async (location) => {
      const error = {
        code: '502',
        message: 'private-detail',
        metadata: { error_type: 'provider_unavailable' },
      };
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json(
            location === 'top-level'
              ? { error }
              : {
                  model: config.model,
                  choices: [{ finish_reason: 'error', message: { content: 'partial' }, error }],
                },
            { headers: { 'Retry-After': '0' } },
          ),
        )
        .mockResolvedValueOnce(
          Response.json({
            model: config.model,
            choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
          }),
        );
      vi.stubGlobal('fetch', fetcher);
      await expect(
        client.complete(config, [], {}, new AbortController().signal),
      ).resolves.toMatchObject({ content: '{}' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it('limits retries for typed errors without a numeric status code', async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json(
          {
            error: { message: 'private-detail', metadata: { error_type: 'rate_limit_exceeded' } },
          },
          { headers: { 'Retry-After': '0' } },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(
      client.complete(config, [], {}, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'rate-limit' });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('does not automatically repeat a research request after an HTTP 200 provider error', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        {
          error: { code: 503, message: 'private-detail' },
        },
        { headers: { 'Retry-After': '0' } },
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(
      client.complete(
        { ...config, zeroCost: false, researchEnabled: true, researchBudgetUsd: 0.1 },
        [],
        {},
        new AbortController().signal,
        true,
      ),
    ).rejects.toMatchObject({ code: 'rate-limit' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('allows cancellation while runtime configuration is loading', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          });
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    const request = client.configuration(controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow();
    expect(fetcher.mock.calls[0][1].signal?.aborted).toBe(true);
  });
  it('honors Retry-After zero without dropping the retry', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '0' } }))
      .mockResolvedValueOnce(
        Response.json({
          model: config.model,
          choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
        }),
      );
    vi.stubGlobal('fetch', fetcher);
    await expect(
      client.complete(config, [], {}, new AbortController().signal),
    ).resolves.toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('sends bounded research tools only with an explicit nonzero budget', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        model: config.model,
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    await client.complete(
      { ...config, zeroCost: false, researchEnabled: true, researchBudgetUsd: 0.1 },
      [],
      {},
      new AbortController().signal,
      true,
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body).tools).toEqual([
      {
        type: 'openrouter:web_search',
        parameters: {
          engine: 'exa',
          mode: 'fast',
          max_results: 5,
          max_total_results: 20,
          max_uses: 8,
        },
      },
    ]);
  });
});
