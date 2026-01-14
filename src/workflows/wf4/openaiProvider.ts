import { WF4_PROMPT_IDS } from './prompts';
import type { LlmProvider, UsageSummary } from './types';

declare const require: (id: string) => any;

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
  'gpt-4o': { input_per_million: 2.5, output_per_million: 10 },
  'gpt-4o-mini': { input_per_million: 0.15, output_per_million: 0.6 },
};

const DEFAULT_EXTRACTION_MODEL = 'gpt-4o';
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

type OpenAiCtor = new (args: any) => {
  chat: { completions: { create: (...args: any[]) => any } };
};

function getOpenAiClientCtor(): OpenAiCtor {
  try {
    const mod = require('openai') as { default?: OpenAiCtor } | OpenAiCtor;
    const ctor = (mod as { default?: OpenAiCtor }).default ?? (mod as OpenAiCtor);
    if (typeof ctor !== 'function') {
      throw new Error('Invalid OpenAI export');
    }
    return ctor;
  } catch (error) {
    throw new Error('Missing openai dependency; install it in the app workspace.');
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

type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

const EVIDENCE_POINTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['source_type', 'source_id', 'path_or_span'],
  properties: {
    source_type: {
      type: 'string',
      enum: ['field', 'message', 'document', 'wf3'],
    },
    source_id: { type: 'string' },
    path_or_span: { type: 'string' },
    snippet: { type: 'string' },
  },
};

const CASE_NARRATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['parties_summary', 'conflict_summary', 'goals_summary'],
  properties: {
    parties_summary: { type: 'string' },
    conflict_summary: { type: 'string' },
    goals_summary: { type: 'string' },
    timeline_overview: { type: 'string' },
  },
};

const REVIEW_ATTENTION_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['item', 'references'],
  properties: {
    item: { type: 'string' },
    references: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

const JSON_SCHEMAS: Record<string, JsonSchema> = {
  [WF4_PROMPT_IDS.extract]: {
    name: 'wf4_extract_schema_fields',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['extractions'],
      properties: {
        extractions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'field_key',
              'value',
              'value_type',
              'confidence_score',
              'confidence_level',
              'confidence_rationale_code',
              'evidence',
            ],
            properties: {
              field_key: { type: 'string' },
              value: { type: ['string', 'number', 'boolean', 'object', 'array', 'null'] },
              value_type: { type: 'string' },
              confidence_score: { type: 'number' },
              confidence_level: { type: 'string' },
              confidence_rationale_code: { type: 'string' },
              evidence: {
                type: 'array',
                items: EVIDENCE_POINTER_SCHEMA,
              },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.summary]: {
    name: 'wf4_summarize_case_narrative',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['case_narrative'],
      properties: {
        case_narrative: CASE_NARRATIVE_SCHEMA,
      },
    },
  },
  [WF4_PROMPT_IDS.dv]: {
    name: 'wf4_flags_dv_indicators',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['flags'],
      properties: {
        flags: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'flag_key',
              'flag_present',
              'confidence_score',
              'confidence_level',
              'evidence',
              'why_it_matters_for_review',
            ],
            properties: {
              flag_key: { type: 'string' },
              flag_present: { type: 'boolean' },
              confidence_score: { type: 'number' },
              confidence_level: { type: 'string' },
              evidence: { type: 'array', items: EVIDENCE_POINTER_SCHEMA },
              why_it_matters_for_review: { type: 'string' },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.jurisdiction]: {
    name: 'wf4_flags_jurisdiction_complexity',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['flags'],
      properties: {
        flags: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'flag_key',
              'flag_present',
              'confidence_score',
              'confidence_level',
              'evidence',
              'why_it_matters_for_review',
            ],
            properties: {
              flag_key: { type: 'string' },
              flag_present: { type: 'boolean' },
              confidence_score: { type: 'number' },
              confidence_level: { type: 'string' },
              evidence: { type: 'array', items: EVIDENCE_POINTER_SCHEMA },
              why_it_matters_for_review: { type: 'string' },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.custody]: {
    name: 'wf4_flags_custody_conflict',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['flags'],
      properties: {
        flags: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'flag_key',
              'flag_present',
              'confidence_score',
              'confidence_level',
              'evidence',
              'why_it_matters_for_review',
            ],
            properties: {
              flag_key: { type: 'string' },
              flag_present: { type: 'boolean' },
              confidence_score: { type: 'number' },
              confidence_level: { type: 'string' },
              evidence: { type: 'array', items: EVIDENCE_POINTER_SCHEMA },
              why_it_matters_for_review: { type: 'string' },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.consistency]: {
    name: 'wf4_consistency_cross_field',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['inconsistencies'],
      properties: {
        inconsistencies: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'inconsistency_key',
              'fields_involved',
              'summary',
              'severity',
              'confidence_score',
              'evidence',
            ],
            properties: {
              inconsistency_key: { type: 'string' },
              fields_involved: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' },
              severity: { type: 'string' },
              confidence_score: { type: 'number' },
              evidence: { type: 'array', items: EVIDENCE_POINTER_SCHEMA },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.countyMentions]: {
    name: 'wf4_county_mentions',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['county_mentions', 'deference'],
      properties: {
        county_mentions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'raw_mention',
              'suggested_county',
              'match_type',
              'confidence_score',
              'evidence',
            ],
            properties: {
              raw_mention: { type: 'string' },
              suggested_county: { type: ['string', 'null'] },
              match_type: { type: 'string' },
              confidence_score: { type: 'number' },
              evidence: { type: 'array', items: EVIDENCE_POINTER_SCHEMA },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
        deference: {
          type: 'object',
          additionalProperties: false,
          required: ['wf3_canonical_county_present'],
          properties: {
            wf3_canonical_county_present: { type: 'boolean' },
            wf3_canonical_county_value: { type: 'string' },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.documentClassify]: {
    name: 'wf4_document_classifications',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['document_classifications'],
      properties: {
        document_classifications: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'document_id',
              'document_type',
              'confidence_score',
              'confidence_level',
              'evidence',
            ],
            properties: {
              document_id: { type: 'string' },
              document_type: { type: ['string', 'null'] },
              confidence_score: { type: 'number' },
              confidence_level: { type: 'string' },
              evidence: { type: 'array', items: EVIDENCE_POINTER_SCHEMA },
              notes_for_reviewer: { type: 'string' },
            },
          },
        },
      },
    },
  },
  [WF4_PROMPT_IDS.reviewAttention]: {
    name: 'wf4_review_attention_summary',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['review_attention'],
      properties: {
        review_attention: {
          type: 'object',
          additionalProperties: false,
          required: ['high_priority_items', 'medium_priority_items', 'low_priority_items'],
          properties: {
            high_priority_items: {
              type: 'array',
              items: REVIEW_ATTENTION_ITEM_SCHEMA,
            },
            medium_priority_items: {
              type: 'array',
              items: REVIEW_ATTENTION_ITEM_SCHEMA,
            },
            low_priority_items: {
              type: 'array',
              items: REVIEW_ATTENTION_ITEM_SCHEMA,
            },
          },
        },
      },
    },
  },
};

function getResponseFormat(promptId: string) {
  const schema = JSON_SCHEMAS[promptId];
  if (!schema) {
    return { type: 'json_object' } as const;
  }
  return {
    type: 'json_schema',
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      strict: true,
    },
  } as const;
}

export function createWf4OpenAiProvider(
  opts: ProviderOptions,
  dependencies: {
    getMonthlySpendUsd?: (firmId: string) => Promise<number>;
  } = {},
): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for WF4 provider');
  }

  const timeoutMs = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? '');
  const OpenAI = getOpenAiClientCtor();
  const client = new OpenAI({
    apiKey,
    ...(Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeout: timeoutMs } : {}),
  });
  const pricing = parsePricingEnv();
  const envRetries = Number(process.env.OPENAI_MAX_RETRIES ?? '');
  const retries =
    typeof opts.retries === 'number'
      ? opts.retries
      : Number.isFinite(envRetries)
        ? envRetries
        : 2;
  const envBudget = Number(process.env.OPENAI_MONTHLY_BUDGET_USD ?? '');
  const monthlyBudgetUsd =
    typeof opts.monthlyBudgetUsd === 'number'
      ? opts.monthlyBudgetUsd
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
      // Use injected dependency or default to 0 if not provided (avoids heavy import)
      const total = dependencies.getMonthlySpendUsd
        ? await dependencies.getMonthlySpendUsd(opts.firmId)
        : 0;
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
            response_format: getResponseFormat(promptId),
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
