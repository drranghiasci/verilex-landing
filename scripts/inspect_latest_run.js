const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read env if --env-file doesn't work or for robustness
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
            }
        });
    }
} catch (e) {
    console.log('Error reading .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials. env loaded:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
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
        // console.log('\n--- Input Refs ---');
        // console.log(JSON.stringify(run.inputs.input_refs, null, 2));
        console.log('\n--- Per Task Status ---');
        console.log(JSON.stringify(run.inputs.per_task, null, 2));
    } else {
        console.log('\n--- NO INPUTS LOGGED ---');
    }

    // Inspect Outputs
    if (run.outputs) {
        console.log('\n--- Run Output Keys ---');
        const ro = run.outputs.run_output || {};
        console.log('Keys:', Object.keys(ro));

        // Check if task_outputs exists and has content
        if (ro.task_outputs) {
            console.log('\n--- Task Outputs (Raw) ---');
            console.log(JSON.stringify(ro.task_outputs, null, 2));
        }

        if (ro.review_attention) {
            console.log('\n--- Review Attention Output ---');
            console.log(JSON.stringify(ro.review_attention, null, 2));
        } else {
            console.log('\n--- Review Attention: MISSING ---');
        }

        if (ro.extractions) {
            console.log('\n--- Extractions (First 3) ---');
            const items = ro.extractions.extractions || [];
            console.log(JSON.stringify(items.slice(0, 3), null, 2));
            console.log(`Total Extractions: ${items.length}`);
        } else {
            console.log('\n--- Extractions: MISSING ---');
        }
    } else {
        console.log('\n--- NO OUTPUTS LOGGED ---');
    }
}

inspectLatestRun().catch(console.error);
