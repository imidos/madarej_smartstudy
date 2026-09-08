import { Service } from '@angular/core';
import { z } from 'zod';
import { configSchema, ReportGenerationConfig, RequestUsage } from './report-model';

const API = 'https://openrouter.ai/api/v1';
const providerErrorSchema = z.object({
  code: z.union([z.number(), z.string()]).optional(),
  message: z.string().optional(),
  metadata: z.object({ error_type: z.string().optional() }).nullish(),
});
const errorEnvelopeSchema = z.object({
  error: providerErrorSchema.nullish(),
  choices: z.array(z.object({ error: providerErrorSchema.nullish() })).optional(),
});
const errorStatuses: Record<string, number> = {
  rate_limit_exceeded: 429,
  provider_overloaded: 503,
  provider_unavailable: 502,
  server: 500,
  timeout: 408,
  context_length_exceeded: 400,
  max_tokens_exceeded: 400,
  token_limit_exceeded: 400,
  invalid_request: 400,
  content_policy_violation: 403,
  refusal: 403,
  not_found: 404,
};
export class GenerationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export const responseSchema = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({
          content: z.string().nullable(),
          annotations: z.array(z.unknown()).optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      total_tokens: z.number().optional(),
      cost: z.number().optional(),
      server_tool_use: z.object({ web_search_requests: z.number().optional() }).optional(),
    })
    .optional(),
});
const modelSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      pricing: z.record(z.string(), z.string().or(z.unknown())).optional(),
      supported_parameters: z.array(z.string()).optional(),
      reasoning: z
        .object({ supported_efforts: z.array(z.string()).nullable().optional() })
        .optional(),
    }),
  ),
});
@Service()
export class OpenRouterClient {
  async configuration(
    signal: AbortSignal = new AbortController().signal,
  ): Promise<ReportGenerationConfig> {
    let response: Response;
    try {
      response = await fetch('/generation-config.json', {
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
      });
    } catch {
      throw new GenerationError(
        'configuration',
        'خدمة إعداد الدراسة غير مهيأة حالياً. يرجى التواصل مع فريق مدارج.',
      );
    }
    if (!response.ok)
      throw new GenerationError(
        'configuration',
        'خدمة إعداد الدراسة غير مهيأة حالياً. يرجى التواصل مع فريق مدارج.',
      );
    try {
      return configSchema.parse(await response.json());
    } catch {
      throw new GenerationError(
        'configuration',
        'إعدادات خدمة الدراسة غير صالحة. يرجى التواصل مع فريق مدارج.',
      );
    }
  }
  async preflight(config: ReportGenerationConfig, signal: AbortSignal): Promise<void> {
    const response = await fetch(API + '/models', {
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    });
    if (!response.ok)
      throw new GenerationError('catalog', 'تعذر التحقق من توفر نموذج الدراسة. أعد المحاولة.');
    const catalog = modelSchema.parse(await response.json());
    const model = catalog.data.find((m) => m.id === config.model);
    if (!model)
      throw new GenerationError('model', 'نموذج الدراسة غير متاح حالياً. يرجى المحاولة لاحقاً.');
    if (
      config.zeroCost &&
      (!model.pricing ||
        Object.entries(model.pricing).some(
          ([key, value]) =>
            ['prompt', 'completion', 'request', 'image', 'web_search'].includes(key) &&
            Number(value) !== 0,
        ) ||
        model.pricing['prompt'] !== '0' ||
        model.pricing['completion'] !== '0')
    )
      throw new GenerationError(
        'paid-model',
        'تم إيقاف الطلب لأن النموذج لا يطابق وضع الاختبار المجاني.',
      );
    if (
      !['reasoning', 'structured_outputs', 'response_format'].every((p) =>
        model.supported_parameters?.includes(p),
      )
    )
      throw new GenerationError(
        'capability',
        'النموذج الحالي لا يدعم متطلبات الدراسة المنظمة والتفكير.',
      );
    if (
      model.reasoning?.supported_efforts &&
      !model.reasoning.supported_efforts.includes(config.reasoningEffort)
    )
      throw new GenerationError('reasoning', 'إعداد التفكير غير متوافق مع النموذج الحالي.');
  }
  async complete(
    config: ReportGenerationConfig,
    messages: { role: 'system' | 'user'; content: string }[],
    schema: Record<string, unknown>,
    signal: AbortSignal,
    research = false,
  ): Promise<{ content: string; usage: RequestUsage; annotations: unknown[] }> {
    if (
      research &&
      (config.zeroCost || !config.researchEnabled || config.researchBudgetUsd < 0.056)
    )
      throw new GenerationError('research-budget', 'البحث الخارجي غير مفعل ضمن ميزانية الدراسة.');
    const body = {
      model: config.model,
      messages,
      stream: false,
      max_tokens: config.maxTokens,
      reasoning: { effort: config.reasoningEffort, exclude: true },
      provider: {
        require_parameters: true,
        data_collection: 'allow',
        ...(config.zeroCost ? { max_price: { prompt: 0, completion: 0 } } : {}),
      },
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'study_section', strict: true, schema },
      },
      ...(research
        ? {
            tools: [
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
            ],
            max_tool_calls: 8,
          }
        : {}),
    };
    for (let attempt = 0; attempt < (research ? 1 : 3); attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await fetch(API + '/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.any([signal, AbortSignal.timeout(config.timeoutSeconds * 1000)]),
        });
      } catch {
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        throw new GenerationError(
          'network',
          'انقطع الاتصال أو انتهت مهلة الطلب. احتُفظ بالأقسام المكتملة؛ يمكنك إعادة المحاولة.',
        );
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (response.ok)
          throw new GenerationError('response', 'تعذر قراءة استجابة الخدمة. يمكنك إعادة المحاولة.');
      }
      const envelope = errorEnvelopeSchema.safeParse(payload);
      const providerError = envelope.success
        ? (envelope.data.error ?? envelope.data.choices?.find((choice) => choice.error)?.error)
        : undefined;
      const errorType = providerError?.metadata?.error_type ?? '';
      const providerCode = Number(providerError?.code);
      const status = !response.ok
        ? response.status
        : providerError
          ? (errorStatuses[errorType] ??
            (Number.isInteger(providerCode) && providerCode >= 400 && providerCode <= 599
              ? providerCode
              : 400))
          : response.status;
      if (status === 429 || status >= 500) {
        const retry = response.headers.get('Retry-After');
        const retrySeconds =
          retry === null
            ? NaN
            : /^\d+$/.test(retry)
              ? Number(retry)
              : (Date.parse(retry) - Date.now()) / 1000;
        const seconds = Number.isFinite(retrySeconds)
          ? Math.max(0, retrySeconds)
          : 2 ** (attempt + 1);
        if (!research && attempt < 2 && seconds <= 30) {
          await this.delay(seconds * 1000, signal);
          continue;
        }
        throw new GenerationError(
          'rate-limit',
          'الخدمة مشغولة أو بلغ الاستخدام الحد المتاح. احتُفظ بتقدمك؛ أعد المحاولة لاحقاً.',
        );
      }
      if (status === 404) {
        const providerMessage = providerError?.message ?? '';
        if (/data policy|privacy|guardrail/i.test(providerMessage))
          throw new GenerationError(
            'data-policy',
            /free model training/i.test(providerMessage)
              ? 'إعدادات خصوصية حساب OpenRouter تمنع استخدام النموذج المجاني لأنه يتطلب السماح بالتدريب على البيانات. راجع إعدادات الخصوصية أو اختر نموذجاً متوافقاً؛ لم يكتمل الطلب واحتُفظ بتقدمك.'
              : /free model publication/i.test(providerMessage)
                ? 'إعدادات خصوصية حساب OpenRouter تمنع استخدام النموذج المجاني لأنه يتطلب السماح بنشر البيانات. راجع إعدادات الخصوصية أو اختر نموذجاً متوافقاً؛ لم يكتمل الطلب واحتُفظ بتقدمك.'
                : 'لا يوجد مزود للنموذج يطابق إعدادات الخصوصية وقيود الحساب أو الطلب في OpenRouter. راجع الإعدادات أو اختر نموذجاً متوافقاً؛ احتُفظ بتقدمك.',
          );
        throw new GenerationError(
          '404',
          'لا يوجد مسار متاح للنموذج يطابق متطلبات الطلب في OpenRouter. راجع توفر النموذج وإعداداته؛ احتُفظ بتقدمك.',
        );
      }
      if (errorType === 'context_length_exceeded')
        throw new GenerationError(
          'context-length',
          'تجاوز حجم بيانات الدراسة سعة النموذج. قلّل التفاصيل أو استخدم نموذجاً بسعة أكبر.',
        );
      if (errorType === 'max_tokens_exceeded')
        throw new GenerationError(
          'truncated',
          'وصل القسم إلى حد طول الاستجابة قبل اكتماله. راجع حد الرموز في إعدادات الدراسة.',
        );
      if (!response.ok || providerError)
        throw new GenerationError(
          errorType || String(status),
          status === 401
            ? 'تعذر اعتماد اتصال خدمة الدراسة. يرجى التواصل مع فريق مدارج.'
            : status === 402
              ? 'الرصيد أو حد استخدام الخدمة غير متاح. لم تُفقد بياناتك.'
              : status === 408
                ? 'انتهت مهلة الاستجابة لدى مزود النموذج. احتُفظ بتقدمك؛ أعد المحاولة.'
                : status === 403
                  ? 'رفض مزود الخدمة الطلب وفق قيود الحساب أو سياسة المحتوى. احتُفظ بتقدمك.'
                  : status === 400 || status === 422
                    ? 'رفض مزود النموذج إعدادات الطلب أو مخطط الدراسة. راجع توافق النموذج مع الإعدادات.'
                    : 'تعذر تنفيذ طلب الدراسة لدى مزود الخدمة. يرجى المحاولة لاحقاً.',
        );
      let result: z.infer<typeof responseSchema>;
      try {
        result = responseSchema.parse(payload);
      } catch {
        throw new GenerationError(
          'response',
          'استجابت الخدمة بصيغة غير صالحة. يمكنك إعادة المحاولة.',
        );
      }
      if (result.choices[0].finish_reason !== 'stop' || !result.choices[0].message.content)
        throw new GenerationError(
          'truncated',
          'لم يكتمل هذا القسم من الدراسة. أعد المحاولة لإكماله.',
        );
      return {
        content: result.choices[0].message.content,
        annotations: result.choices[0].message.annotations ?? [],
        usage: {
          model: result.model,
          tokens: result.usage?.total_tokens ?? 0,
          cost: result.usage?.cost ?? null,
          searches: result.usage?.server_tool_use?.web_search_requests ?? 0,
        },
      };
    }
    throw new GenerationError('request', 'تعذر إكمال الطلب.');
  }
  private delay(ms: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Cancelled', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, ms);
      signal.addEventListener('abort', abort, { once: true });
    });
  }
}
