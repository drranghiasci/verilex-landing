
import { runWf4 } from '../src/workflows/wf4/runWf4';
import { createWf4OpenAiProvider } from '../src/workflows/wf4/openaiProvider';
import type { LlmProvider, RunWf4Dependencies, TaskResult } from '../src/workflows/wf4/types';

// Mock Provider
const mockProvider: LlmProvider = {
    provider: 'mock',
    model: 'mock-model',
    generateJson: async ({ promptId }) => {
        // RETURN INVALID EXTRACTION (Missing evidence)
        if (promptId === 'wf4.task.extract.schema_fields.v1') {
            return {
                extractions: [
                    {
                        field_key: 'client_first_name',
                        value: 'John',
                        value_type: 'string',
                        confidence_score: 0.9,
                        confidence_level: 'HIGH',
                        confidence_rationale_code: 'DIRECT_STATEMENT',
                        evidence: [] // EMPTY EVIDENCE -> SHOULD FAIL VALIDATION
                    }
                ]
            };
        }
        // RETURN VALID FLAG
        if (promptId === 'wf4.task.flags.dv_indicators.v1') {
            return {
                flags: []
            };
        }
        // Default valid empty for others
        if (promptId.includes('flags')) return { flags: [] };
        if (promptId.includes('consistency')) return { inconsistencies: [] };
        if (promptId.includes('county')) return { county_mentions: [], deference: { wf3_canonical_county_present: false } };
        if (promptId.includes('classify')) return { document_classifications: [] };
        if (promptId.includes('review')) return { review_attention: { high_priority_items: [], medium_priority_items: [], low_priority_items: [] } };

        return {};
    }
};

const mockLoadIntake = async (id: string) => ({
    intake_id: id,
    submission_id: id,
    firm_id: 'firm-1',
    structured_fields: { matter_type: 'divorce' },
    free_text_fields: {},
    messages: [],
    documents: [],
    created_at: new Date().toISOString(),
});

const mockLoadWf3 = async (id: string) => ({
    wf3_run_id: id,
    validation_summary: { rule_results: [], required_fields_missing: [] },
    canonical_fields: {},
    created_at: new Date().toISOString(),
});

const mockStoreRun = async (args: any) => {
    console.log('Storing Run with Status:', args.runLog.status);
    console.log('Task Statuses:', JSON.stringify(args.runLog.per_task, null, 2));
    if (args.runLog.output) {
        // Output might be in runOutput
    }
    return { wf4_run_id: 'run-1' };
}

const mockFindExisting = async () => null;

async function main() {
    console.log('Running WF4 Smoke Test (Expect PARTIAL/FAIL due to strict validation)...');

    const result = await runWf4(
        { intakeId: 'intake-1', wf3RunId: 'wf3-1' },
        {
            loadIntakeSnapshot: mockLoadIntake,
            loadWf3Snapshot: mockLoadWf3,
            storeRun: mockStoreRun,
            findExistingRun: mockFindExisting,
            llmProvider: mockProvider,
        }
    );

    const extractionTask = result.runLog.per_task['wf4.extract.schema_fields.v1'];
    if (extractionTask.status === 'SUCCESS') {
        console.log('CONFIRMED: Extraction task SUCCEEDED despite invalid item (resilient validation).');
    } else {
        console.log('UNEXPECTED: Extraction task FAILED: ' + extractionTask.error);
    }

    // Check if outputs are present
    if (result.runOutput.extractions) {
        console.log('CONFIRMED: runOutput.extractions is present.');
        if (result.runOutput.extractions.extractions.length === 0) {
            console.log('CONFIRMED: invalid extraction item was dropped.');
        } else {
            console.log('UNEXPECTED: invalid item was kept?');
        }
    } else {
        console.log('UNEXPECTED: runOutput.extractions is missing.');
    }

    if (result.runLog.status === 'SUCCESS') {
        console.log('Test Passed: Run status is SUCCESS.');
    } else {
        console.log('Test Failed: Run status was ' + result.runLog.status);
        process.exit(1);
    }
}

main().catch(console.error);
