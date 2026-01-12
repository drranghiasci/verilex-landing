import { runWf4 } from '../src/workflows/wf4/runWf4';
import { WF4_PROMPT_IDS } from '../src/workflows/wf4/prompts';
import type { IntakeSnapshot, LlmProvider, RunLog, RunOutput, Wf3Snapshot } from '../src/workflows/wf4/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const intakeSnapshot: IntakeSnapshot = {
  intake_id: 'intake-123',
  submission_id: 'intake-123',
  structured_fields: { matter_type: 'divorce' },
  free_text_fields: { narrative: 'We separated last year.' },
  messages: [],
  documents: [],
  created_at: '2026-01-11T00:00:00.000Z',
  firm_id: 'firm-123',
};

const wf3Snapshot: Wf3Snapshot = {
  wf3_run_id: 'wf3-123',
  validation_summary: {
    rule_results: [],
    required_fields_missing: [],
  },
  canonical_fields: {},
  created_at: '2026-01-11T00:00:00.000Z',
};

const mockProvider: LlmProvider = {
  provider: 'mock',
  model: 'mock-model',
  generateJson: async ({ promptId }) => {
    if (promptId === WF4_PROMPT_IDS.extract) {
      return { extractions: [] };
    }
    if (promptId === WF4_PROMPT_IDS.dv) {
      return { flags: [] };
    }
    if (promptId === WF4_PROMPT_IDS.jurisdiction) {
      return { flags: [] };
    }
    if (promptId === WF4_PROMPT_IDS.custody) {
      return { flags: [] };
    }
    if (promptId === WF4_PROMPT_IDS.consistency) {
      return { inconsistencies: [] };
    }
    if (promptId === WF4_PROMPT_IDS.countyMentions) {
      return {
        county_mentions: [],
        deference: { wf3_canonical_county_present: false },
      };
    }
    if (promptId === WF4_PROMPT_IDS.documentClassify) {
      return { document_classifications: [] };
    }
    if (promptId === WF4_PROMPT_IDS.reviewAttention) {
      return {
        review_attention: {
          high_priority_items: [],
          medium_priority_items: [],
          low_priority_items: [],
        },
      };
    }
    return {};
  },
};

async function run() {
  let storedLog: RunLog | null = null;
  let storedOutput: RunOutput | null = null;

  const result = await runWf4(
    { intakeId: 'intake-123', wf3RunId: 'wf3-123' },
    {
      llmProvider: {
        ...mockProvider,
        generateJson: async ({ promptId }) => {
          if (promptId === WF4_PROMPT_IDS.custody) {
            return { flags: 'invalid' };
          }
          return mockProvider.generateJson({ promptId, systemPrompt: '', userPrompt: '', input: {} });
        },
      },
      loadIntakeSnapshot: async () => intakeSnapshot,
      loadWf3Snapshot: async () => wf3Snapshot,
      findExistingRun: async () => null,
      storeRun: async ({ runLog, runOutput }) => {
        storedLog = runLog;
        storedOutput = runOutput;
        return { wf4_run_id: runLog.wf4_run_id };
      },
      storeFlags: async () => {},
      updateDocumentClassifications: async () => {},
      now: () => '2026-01-11T00:00:00.000Z',
    },
  );

  assert(storedLog !== null, 'RunLog not stored');
  assert(storedOutput !== null, 'RunOutput not stored');
  assert(result.runLog.status === 'PARTIAL', 'Expected PARTIAL status');
  assert(
    result.runOutput.task_outputs['wf4.flags.custody_conflict.v1']?.status === 'FAILED',
    'Expected custody task failure',
  );

  console.log('WF4 smoke test passed.');
}

run();
