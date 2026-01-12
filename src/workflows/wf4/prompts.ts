export const WF4_PROMPT_BUNDLE_VERSION = 'v0.1';

export const WF4_PROMPT_IDS = {
  system: 'wf4.system.v1',
  extract: 'wf4.task.extract.schema_fields.v1',
  dv: 'wf4.task.flags.dv_indicators.v1',
  jurisdiction: 'wf4.task.flags.jurisdiction_complexity.v1',
  custody: 'wf4.task.flags.custody_conflict.v1',
  consistency: 'wf4.task.consistency.cross_field.v1',
  countyMentions: 'wf4.task.normalize.county_mentions.v1',
  documentClassify: 'wf4.task.classify.documents.v1',
  reviewAttention: 'wf4.task.review_attention.summary.v1',
} as const;

export const WF4_TASK_PROMPT_MAP: Record<string, string> = {
  'wf4.extract.schema_fields.v1': WF4_PROMPT_IDS.extract,
  'wf4.flags.dv_indicators.v1': WF4_PROMPT_IDS.dv,
  'wf4.flags.jurisdiction_complexity.v1': WF4_PROMPT_IDS.jurisdiction,
  'wf4.flags.custody_conflict.v1': WF4_PROMPT_IDS.custody,
  'wf4.consistency.cross_field.v1': WF4_PROMPT_IDS.consistency,
  'wf4.normalize.county_mentions.v1': WF4_PROMPT_IDS.countyMentions,
  'wf4.classify.documents.v1': WF4_PROMPT_IDS.documentClassify,
  'wf4.review_attention.summary.v1': WF4_PROMPT_IDS.reviewAttention,
};

export type PromptTemplate = {
  id: string;
  system: string;
  user: string;
};

export const WF4_PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  [WF4_PROMPT_IDS.extract]: {
    id: WF4_PROMPT_IDS.extract,
    system: 'Use wf4.system.v1',
    user: 'Extract schema-bound fields from intake inputs using the schema allowlist. Return JSON only.',
  },
  [WF4_PROMPT_IDS.dv]: {
    id: WF4_PROMPT_IDS.dv,
    system: 'Use wf4.system.v1',
    user: 'Detect DV indicators with evidence. Return JSON only.',
  },
  [WF4_PROMPT_IDS.jurisdiction]: {
    id: WF4_PROMPT_IDS.jurisdiction,
    system: 'Use wf4.system.v1',
    user: 'Detect jurisdiction complexity signals with evidence. Return JSON only.',
  },
  [WF4_PROMPT_IDS.custody]: {
    id: WF4_PROMPT_IDS.custody,
    system: 'Use wf4.system.v1',
    user: 'Detect custody conflict signals with evidence. Return JSON only.',
  },
  [WF4_PROMPT_IDS.consistency]: {
    id: WF4_PROMPT_IDS.consistency,
    system: 'Use wf4.system.v1',
    user: 'Detect cross-field inconsistencies with evidence. Return JSON only.',
  },
  [WF4_PROMPT_IDS.countyMentions]: {
    id: WF4_PROMPT_IDS.countyMentions,
    system: 'Use wf4.system.v1',
    user: 'Extract county mentions and suggest normalization. Return JSON only.',
  },
  [WF4_PROMPT_IDS.documentClassify]: {
    id: WF4_PROMPT_IDS.documentClassify,
    system: 'Use wf4.system.v1',
    user: 'Classify intake documents with evidence. Return JSON only.',
  },
  [WF4_PROMPT_IDS.reviewAttention]: {
    id: WF4_PROMPT_IDS.reviewAttention,
    system: 'Use wf4.system.v1',
    user: 'Summarize review attention priorities based on WF4 outputs. Return JSON only.',
  },
};
