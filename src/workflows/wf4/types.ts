export type EvidencePointer = {
  source_type: 'field' | 'message' | 'document' | 'wf3';
  source_id: string;
  path_or_span: string;
  snippet?: string;
};

export type ExtractionItem = {
  field_key: string;
  value: unknown;
  value_type: string;
  confidence_score: number;
  confidence_level: 'LOW' | 'MED' | 'HIGH';
  confidence_rationale_code: string;
  evidence: EvidencePointer[];
  notes_for_reviewer?: string;
};

export type FlagItem = {
  flag_key: string;
  flag_present: boolean;
  confidence_score: number;
  confidence_level: 'LOW' | 'MED' | 'HIGH';
  evidence: EvidencePointer[];
  why_it_matters_for_review: string;
  notes_for_reviewer?: string;
};

export type InconsistencyItem = {
  inconsistency_key: string;
  fields_involved: string[];
  summary: string;
  severity: 'LOW' | 'MED' | 'HIGH';
  confidence_score: number;
  evidence: EvidencePointer[];
  notes_for_reviewer?: string;
};

export type CountyMention = {
  raw_mention: string;
  suggested_county: string | null;
  match_type: 'EXACT' | 'FUZZY' | 'NONE';
  confidence_score: number;
  evidence: EvidencePointer[];
  notes_for_reviewer?: string;
};

export type ReviewAttention = {
  high_priority_items: Array<{ item: string; references: string[] }>;
  medium_priority_items: Array<{ item: string; references: string[] }>;
  low_priority_items: Array<{ item: string; references: string[] }>;
};

export type DocumentClassification = {
  document_id: string;
  document_type: string | null;
  confidence_score: number;
  confidence_level: 'LOW' | 'MED' | 'HIGH';
  evidence: EvidencePointer[];
  notes_for_reviewer?: string;
};

export type UsageSummary = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  per_model: Record<
    string,
    {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      cost_usd: number;
    }
  >;
};

export type Wf4TaskCatalog = {
  version: string;
  workflow: string;
  name: string;
  principles: Record<string, boolean>;
  tasks: Array<{
    task_id: string;
    description: string;
    input_fields: string[];
    output_schema: Record<string, unknown>;
    confidence_model: string;
    evidence_strategy: string;
    failure_mode: string;
  }>;
};

export type IntakeMessageSnapshot = {
  message_id: string;
  role: string;
  content: string;
  created_at: string;
};

export type IntakeDocumentSnapshot = {
  document_id: string;
  filename: string | null;
  mimetype: string | null;
  text_extract?: string | null;
  created_at: string;
};

export type IntakeSnapshot = {
  intake_id: string;
  submission_id: string | null;
  structured_fields: Record<string, unknown>;
  free_text_fields: Record<string, unknown>;
  messages: IntakeMessageSnapshot[];
  documents?: IntakeDocumentSnapshot[];
  created_at: string;
  firm_id?: string;
};

export type Wf3Snapshot = {
  wf3_run_id: string;
  validation_summary: {
    rule_results: Array<{
      rule_id: string;
      passed: boolean;
      field_paths: string[];
      message?: string;
    }>;
    required_fields_missing: string[];
  };
  canonical_fields: Record<string, unknown>;
  created_at: string;
};

export type TaskStatus = 'SUCCESS' | 'FAILED';

export type TaskResult<T> = {
  task_id: string;
  prompt_id: string;
  status: TaskStatus;
  output: T | null;
  error?: string;
};

export type RunLog = {
  wf4_run_id: string;
  intake_id: string;
  wf3_run_id?: string;
  started_at: string;
  completed_at: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAIL';
  model_provider?: string;
  model_name?: string;
  model_version?: string;
  prompt_hash?: string;
  input_hash?: string;
  prompt_bundle_version: string;
  per_task: Record<string, { prompt_id: string; status: TaskStatus; error?: string }>;
  input_refs: Record<string, string | null>;
  usage?: UsageSummary;
  cost_usd?: number;
};

export type RunOutput = {
  extractions?: { extractions: ExtractionItem[] };
  flags?: {
    dv_indicators?: { flags: FlagItem[] };
    jurisdiction_complexity?: { flags: FlagItem[] };
    custody_conflict?: { flags: FlagItem[] };
  };
  inconsistencies?: { inconsistencies: InconsistencyItem[] };
  document_classifications?: { document_classifications: DocumentClassification[] };
  county_mentions?: {
    county_mentions: CountyMention[];
    deference: { wf3_canonical_county_present: boolean; wf3_canonical_county_value?: string };
  };
  case_narrative?: {
    parties_summary: string;
    conflict_summary: string;
    goals_summary: string;
    timeline_overview?: string;
  };
  review_attention?: { review_attention: ReviewAttention };
  task_outputs: Record<string, TaskResult<unknown>>;
};

export type LlmProvider = {
  provider: string;
  model: string;
  generateJson: (params: {
    promptId: string;
    systemPrompt: string;
    userPrompt: string;
    input: Record<string, unknown>;
  }) => Promise<unknown>;
  getUsageSummary?: () => UsageSummary;
};

export type RunWf4Dependencies = {
  llmProvider?: LlmProvider;
  loadIntakeSnapshot?: (intakeId: string) => Promise<IntakeSnapshot>;
  loadWf3Snapshot?: (wf3RunId: string) => Promise<Wf3Snapshot>;
  findExistingRun?: (args: { intakeId: string; inputHash: string }) => Promise<{ runLog: RunLog; runOutput: RunOutput } | null>;
  storeRun?: (args: { runLog: RunLog; runOutput: RunOutput }) => Promise<{ wf4_run_id: string }>;
  storeFlags?: (args: { runLog: RunLog; runOutput: RunOutput }) => Promise<void>;
  updateDocumentClassifications?: (args: { runLog: RunLog; runOutput: RunOutput }) => Promise<void>;
  now?: () => string;
};

export type RunWf4Input = {
  intakeId: string;
  wf3RunId: string;
};
