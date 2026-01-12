import OpenAI from 'openai';
import { WF4_PROMPT_IDS } from './prompts';
import type { LlmProvider, UsageSummary } from './types';

type ModelPricing = {
  input_per_million: number;
  output_per_million: number;
};

type ProviderOptions = {
  firmId: string;
  monthlyBudgetUsd?: number;
  retries?: number;
};

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'gpt-4.1': { input_per_million: 10, output_per_million: 30 },
  'gpt-4o-mini': { input_per_million: 0.15, output_per_million: 0.6 },
};

const DEFAULT_EXTRACTION_MODEL = 'gpt-4.1';
const DEFAULT_CLASSIFICATION_MODEL = 'gpt-4o-mini';

function parsePricingEnv(): Record<string, ModelPricing> {
  const raw = process.env.WF4_MODEL_PRICING_JSON;
  if (!raw) return DEFAULT_PRICING;
  try {
    const parsed = JSON.parse(raw) as Record<string, ModelPricing>;
    const merged: Record<string, ModelPricing> = { ...DEFAULT_PRICING };
    for (const [model, pricing] of Object.entries(parsed)) {
      if (
        pricing &&
        typeof pricing.input_per_million === 'number' &&
        typeof pricing.output_per_million === 'number'
      ) {
        merged[model] = pricing;
      }
    }
    return merged;
  } catch {
    return DEFAULT_PRICING;
  }
}

function startOfMonthIso(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function modelForPrompt(promptId: string) {
  const extractionModel = process.env.OPENAI_MODEL || DEFAULT_EXTRACTION_MODEL;
  const classifierModel = process.env.OPENAI_CLASSIFIER_MODEL || DEFAULT_CLASSIFICATION_MODEL;
  if (promptId === WF4_PROMPT_IDS.extract || promptId === WF4_PROMPT_IDS.consistency) {
    return extractionModel;
  }
  return classifierModel;
}

async function getMonthlySpendUsd(firmId: string) {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const monthStart = startOfMonthIso();
  const { data, error } = await supabaseAdmin
    .from('ai_runs')
    .select('inputs')
    .eq('firm_id', firmId)
    .eq('run_kind', 'wf4')
    .gte('created_at', monthStart);

  if (error || !data) {
    return 0;
  }

  return data.reduce((total: number, row: { inputs?: any }) => {
    const inputs = row.inputs as { cost_usd?: unknown } | null;
    const cost = typeof inputs?.cost_usd === 'number' ? inputs.cost_usd : 0;
    return total + cost;
  }, 0);
}

function buildUserContent(userPrompt: string, input: Record<string, unknown>) {
  const payload = JSON.stringify(input);
  return `${userPrompt}\n\nInput JSON:\n${payload}`;
}

function updateUsageTotals(
  usageTotals: UsageSummary,
  model: string,
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
  pricing?: ModelPricing,
) {
  if (!usage) return 0;
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  const inputCost = pricing ? (promptTokens / 1_000_000) * pricing.input_per_million : 0;
  const outputCost = pricing ? (completionTokens / 1_000_000) * pricing.output_per_million : 0;
  const cost = inputCost + outputCost;

  usageTotals.prompt_tokens += promptTokens;
  usageTotals.completion_tokens += completionTokens;
  usageTotals.total_tokens += totalTokens;
  usageTotals.cost_usd += cost;

  if (!usageTotals.per_model[model]) {
    usageTotals.per_model[model] = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
    };
  }

  const modelUsage = usageTotals.per_model[model];
  modelUsage.prompt_tokens += promptTokens;
  modelUsage.completion_tokens += completionTokens;
  modelUsage.total_tokens += totalTokens;
  modelUsage.cost_usd += cost;

  return cost;
}

function parseJsonStrict(raw: string) {
  return JSON.parse(raw) as Record<string, unknown>;
}

export function createWf4OpenAiProvider(options: ProviderOptions): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for WF4 provider');
  }

  const timeoutMs = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? '');
  const client = new OpenAI({
    apiKey,
    ...(Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeout: timeoutMs } : {}),
  });
  const pricing = parsePricingEnv();
  const envRetries = Number(process.env.OPENAI_MAX_RETRIES ?? '');
  const retries =
    typeof options.retries === 'number'
      ? options.retries
      : Number.isFinite(envRetries)
        ? envRetries
        : 2;
  const envBudget = Number(process.env.OPENAI_MONTHLY_BUDGET_USD ?? '');
  const monthlyBudgetUsd =
    typeof options.monthlyBudgetUsd === 'number'
      ? options.monthlyBudgetUsd
      : Number.isFinite(envBudget)
        ? envBudget
        : 100;
  const maxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? '');

  let budgetExceeded = false;
  let monthlySpendCache: { monthStart: string; total: number } | null = null;

  const usageTotals: UsageSummary = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    per_model: {},
  };

  const ensureBudgetAvailable = async () => {
    if (budgetExceeded) {
      throw new Error('WF4 monthly budget exceeded');
    }
    const currentMonth = startOfMonthIso();
    if (!monthlySpendCache || monthlySpendCache.monthStart !== currentMonth) {
      const total = await getMonthlySpendUsd(options.firmId);
      monthlySpendCache = { monthStart: currentMonth, total };
    }
    const projected = monthlySpendCache.total + usageTotals.cost_usd;
    if (projected >= monthlyBudgetUsd) {
      budgetExceeded = true;
      throw new Error('WF4 monthly budget exceeded');
    }
  };

  const provider: LlmProvider = {
    provider: 'openai',
    model: 'per-task',
    getUsageSummary: () => usageTotals,
    generateJson: async ({ promptId, systemPrompt, userPrompt, input }) => {
      const model = modelForPrompt(promptId);
      const maxAttempts = Math.max(1, retries + 1);
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await ensureBudgetAvailable();
        try {
          const response = await client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: buildUserContent(userPrompt, input) },
            ],
            response_format: { type: 'json_object' },
            ...(Number.isFinite(maxOutputTokens) && maxOutputTokens > 0
              ? { max_tokens: maxOutputTokens }
              : {}),
            temperature: 0,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('Empty response');
          }

          updateUsageTotals(usageTotals, model, response.usage ?? undefined, pricing[model]);
          const parsed = parseJsonStrict(content);
          if (monthlySpendCache) {
            const projected = monthlySpendCache.total + usageTotals.cost_usd;
            if (projected >= monthlyBudgetUsd) {
              budgetExceeded = true;
            }
          }
          return parsed;
        } catch (error) {
          if (error instanceof Error && error.message === 'WF4 monthly budget exceeded') {
            throw error;
          }
          lastError = error instanceof Error ? error : new Error('LLM call failed');
        }
      }

      throw lastError ?? new Error('LLM call failed');
    },
  };

  return provider;
}
