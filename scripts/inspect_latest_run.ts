import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectLatestRun() {
    console.log('Fetching latest WF4 run...');

    const { data: runs, error } = await supabase
        .from('ai_runs')
        .select('*')
        .eq('run_kind', 'wf4')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching runs:', error);
        return;
    }

    if (!runs || runs.length === 0) {
        console.log('No WF4 runs found.');
        return;
    }

    const run = runs[0];
    console.log('--- Latest Run Info ---');
    console.log('ID:', run.id);
    console.log('Status:', run.status);
    console.log('Created At:', run.created_at);
    console.log('Model:', run.model_name);

    // Inspect Inputs
    if (run.inputs) {
        console.log('\n--- Input Refs ---');
        console.log(JSON.stringify(run.inputs.input_refs, null, 2));
        console.log('\n--- Per Task Status ---');
        console.log(JSON.stringify(run.inputs.per_task, null, 2));
    }

    // Inspect Outputs
    if (run.outputs) {
        console.log('\n--- Run Output Keys ---');
        // @ts-ignore
        const ro = run.outputs.run_output || {};
        console.log(Object.keys(ro));

        if (ro.review_attention) {
            console.log('\n--- Review Attention Output ---');
            console.log(JSON.stringify(ro.review_attention, null, 2));
        }

        if (ro.extractions) {
            console.log('\n--- Extractions (First 3) ---');
            // @ts-ignore
            console.log(JSON.stringify(ro.extractions.extractions?.slice(0, 3) || [], null, 2));
        }
    }
}

inspectLatestRun().catch(console.error);
