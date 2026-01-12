import fs from 'fs';
import path from 'path';
import { runWf4 } from '../src/workflows/wf4/runWf4';
import { loadWf4TaskCatalog } from '../src/workflows/wf4/taskCatalog';
import { WF4_TASK_PROMPT_MAP } from '../src/workflows/wf4/prompts';
import {
  documentPointer,
  fieldPointer,
  messagePointer,
  validateEvidencePointers,
  wf3Pointer,
} from '../src/workflows/wf4/evidence';
import type {
  EvidencePointer,
  IntakeSnapshot,
  LlmProvider,
  RunLog,
  RunOutput,
  Wf3Snapshot,
} from '../src/workflows/wf4/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadFixture<T>(relativePath: string): T {
  const fixturePath = path.join(process.cwd(), relativePath);
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw) as T;
}

function evidenceId(pointer: EvidencePointer) {
  return `${pointer.source_type}:${pointer.source_id}:${pointer.path_or_span}`;
}

const intakeSnapshot = loadFixture<IntakeSnapshot>('src/workflows/wf4/__fixtures__/intake_snapshot.json');
const wf3Snapshot = loadFixture<Wf3Snapshot>('src/workflows/wf4/__fixtures__/wf3_snapshot.json');

const evidenceField = fieldPointer('structured_fields', '$.client_first_name', 'Taylor');
const evidenceMessage = messagePointer('msg-1', '0:13', 'We have two kids');
const evidenceDocument = documentPointer('doc-1', 'page:1', 'Summary');
const evidenceWf3 = wf3Pointer('wf3-fixture-1', 'rule:R1', 'passed');

const evidenceIds = new Set<string>([
  evidenceId(evidenceField),
  evidenceId(evidenceMessage),
  evidenceId(evidenceDocument),
  evidenceId(evidenceWf3),
]);

const mockProvider: LlmProvider = {
  provider: 'mock',
  model: 'mock-model',
  generateJson: async ({ promptId }) => {
    if (promptId === 'wf4.task.extract.schema_fields.v1') {
      return {
        extractions: [
          {
            field_key: 'client_first_name',
            value: 'Taylor',
            value_type: 'string',
            confidence_score: 0.9,
            confidence_level: 'HIGH',
            confidence_rationale_code: 'DIRECT_STATEMENT',
            evidence: [evidenceField],
            notes_for_reviewer: 'Matches structured response.',
          },
        ],
      };
    }
    if (promptId === 'wf4.task.flags.dv_indicators.v1') {
      return {
        flags: [
          {
            flag_key: 'DV_INDICATOR',
            flag_present: true,
            confidence_score: 0.6,
            confidence_level: 'MED',
            evidence: [evidenceMessage],
            why_it_matters_for_review: 'Mentions safety concerns.',
          },
        ],
      };
    }
    if (promptId === 'wf4.task.flags.jurisdiction_complexity.v1') {
      return {
        flags: [
          {
            flag_key: 'JURISDICTION_COMPLEXITY_SIGNAL',
            flag_present: true,
            confidence_score: 0.5,
            confidence_level: 'MED',
            evidence: [evidenceWf3],
            why_it_matters_for_review: 'References multiple locations.',
          },
        ],
      };
    }
    if (promptId === 'wf4.task.flags.custody_conflict.v1') {
      return {
        flags: [
          {
            flag_key: 'CUSTODY_CONFLICT_SIGNAL',
            flag_present: true,
            confidence_score: 0.55,
            confidence_level: 'MED',
            evidence: [evidenceMessage],
            why_it_matters_for_review: 'Mentions disagreements about parenting time.',
          },
        ],
      };
    }
    if (promptId === 'wf4.task.consistency.cross_field.v1') {
      return {
        inconsistencies: [
          {
            inconsistency_key: 'CHILDREN_COUNT_MISMATCH',
            fields_involved: ['children', 'messages'],
            summary: 'Narrative references children; structured fields are empty.',
            severity: 'MED',
            confidence_score: 0.5,
            evidence: [evidenceField, evidenceMessage],
          },
        ],
      };
    }
    if (promptId === 'wf4.task.normalize.county_mentions.v1') {
      return {
        county_mentions: [
          {
            raw_mention: 'Fulton County',
            suggested_county: 'fulton',
            match_type: 'EXACT',
            confidence_score: 1,
            evidence: [evidenceDocument],
          },
        ],
        deference: { wf3_canonical_county_present: true, wf3_canonical_county_value: 'fulton' },
      };
    }
    if (promptId === 'wf4.task.classify.documents.v1') {
      return {
        document_classifications: [
          {
            document_id: 'doc-1',
            document_type: 'pay_stub',
            confidence_score: 0.8,
            confidence_level: 'MED',
            evidence: [evidenceDocument],
          },
        ],
      };
    }
    if (promptId === 'wf4.task.review_attention.summary.v1') {
      return {
        review_attention: {
          high_priority_items: [
            {
              item: 'Review DV indicator evidence.',
              references: [evidenceId(evidenceMessage)],
            },
          ],
          medium_priority_items: [
            {
              item: 'Confirm jurisdiction references.',
              references: [evidenceId(evidenceWf3)],
            },
          ],
          low_priority_items: [
            {
              item: 'Check county mention.',
              references: [evidenceId(evidenceDocument)],
            },
          ],
        },
      };
    }
    return {};
  },
};

async function run() {
  const storedRuns: Array<{ runLog: RunLog; runOutput: RunOutput }> = [];
  const runByHash = new Map<string, { runLog: RunLog; runOutput: RunOutput }>();
  const taskCatalog = loadWf4TaskCatalog();

  for (let index = 0; index < 2; index += 1) {
    await runWf4(
      { intakeId: intakeSnapshot.intake_id, wf3RunId: wf3Snapshot.wf3_run_id },
      {
        llmProvider: mockProvider,
        loadIntakeSnapshot: async () => intakeSnapshot,
        loadWf3Snapshot: async () => wf3Snapshot,
        findExistingRun: async ({ inputHash }) => runByHash.get(inputHash) ?? null,
        storeRun: async ({ runLog, runOutput }) => {
          storedRuns.push({ runLog, runOutput });
          const hashKey = runLog.input_hash ?? runLog.wf4_run_id;
          runByHash.set(hashKey, { runLog, runOutput });
          return { wf4_run_id: runLog.wf4_run_id };
        },
        storeFlags: async () => {},
        updateDocumentClassifications: async () => {},
        now: () => '2026-01-11T00:00:00.000Z',
      },
    );
  }

  assert(storedRuns.length === 1, 'Expected idempotent run storage');

  const { runLog, runOutput } = storedRuns[0];

  taskCatalog.tasks.forEach((task) => {
    const expectedPrompt = WF4_TASK_PROMPT_MAP[task.task_id] ?? task.task_id;
    const actualPrompt = runLog.per_task[task.task_id]?.prompt_id;
    assert(actualPrompt === expectedPrompt, `Prompt ID missing for ${task.task_id}`);
  });

  const evidenceLists: EvidencePointer[][] = [];
  runOutput.extractions?.extractions.forEach((item) => evidenceLists.push(item.evidence));
  runOutput.flags?.dv_indicators?.flags.forEach((item) => evidenceLists.push(item.evidence));
  runOutput.flags?.jurisdiction_complexity?.flags.forEach((item) => evidenceLists.push(item.evidence));
  runOutput.flags?.custody_conflict?.flags.forEach((item) => evidenceLists.push(item.evidence));
  runOutput.inconsistencies?.inconsistencies.forEach((item) => evidenceLists.push(item.evidence));
  runOutput.county_mentions?.county_mentions.forEach((item) => evidenceLists.push(item.evidence));
  runOutput.document_classifications?.document_classifications.forEach((item) => evidenceLists.push(item.evidence));

  evidenceLists.forEach((evidence) => {
    assert(evidence.length > 0, 'Expected evidence pointers for all outputs');
    const check = validateEvidencePointers(evidence);
    assert(check.ok, 'Evidence pointers failed validation');
  });

  const outputEvidenceIds = new Set<string>();
  evidenceLists.forEach((list) => {
    list.forEach((pointer) => outputEvidenceIds.add(evidenceId(pointer)));
  });

  const reviewAttention = runOutput.review_attention?.review_attention;
  assert(reviewAttention !== undefined, 'Expected review attention output');

  const references = [
    ...reviewAttention.high_priority_items.flatMap((item) => item.references),
    ...reviewAttention.medium_priority_items.flatMap((item) => item.references),
    ...reviewAttention.low_priority_items.flatMap((item) => item.references),
  ];

  references.forEach((reference) => {
    assert(outputEvidenceIds.has(reference), 'Review attention reference not found in evidence set');
  });

  console.log('WF4 end-to-end smoke test passed.');
}

run();
