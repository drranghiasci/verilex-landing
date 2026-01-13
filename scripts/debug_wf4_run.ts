
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env loading
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
            }
        });
    }
} catch (e) { console.error('Failed to load .env.local', e); }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Env loaded:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO');
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('URL Starts with:', process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 10) + '...');
} else {
    console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing.');
}
console.log('Key loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspectRuns(intakeId: string) {
    console.log(`Inspecting WF4 runs for intake: ${intakeId}`);

    const { data: runs, error } = await supabaseAdmin
        .from('ai_runs')
        .select('*')
        .eq('run_kind', 'wf4')
        .eq('intake_id', intakeId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching runs:', error);
        return;
    }

    if (!runs || runs.length === 0) {
        console.log('No WF4 runs found for this intake.');
        return;
    }

    console.log(`Found ${runs.length} runs.`);

    const latest = runs[0];
    console.log('--- Latest Run ---');
    console.log('ID:', latest.id);
    console.log('Status:', latest.status);
    console.log('Created:', latest.created_at);

    const inputs = latest.inputs || {};
    const perTask = inputs.per_task || {};

    console.log('\n--- Task Statuses ---');
    let failedCount = 0;
    for (const [taskId, result] of Object.entries(perTask)) {
        const res = result as any;
        console.log(`${taskId}: ${res.status}`);
        if (res.status === 'FAILED') {
            console.log(`  ERROR: ${res.error}`);
            failedCount++;
        }
    }

    if (failedCount === 0) {
        console.log('\nAll tasks reported SUCCESS in the log.');
    } else {
        console.log(`\n${failedCount} tasks FAILED.`);
    }

    // Check if output is actually present
    const outputs = latest.outputs || {};
    const runOutput = outputs.run_output || {};

    console.log('\n--- Outputs Check ---');
    console.log('Extractions:', runOutput.extractions ? 'Present' : 'MISSING');
    if (runOutput.extractions?.extractions) {
        console.log('  Count:', runOutput.extractions.extractions.length);
    }

    console.log('Flags:', runOutput.flags ? 'Present' : 'MISSING');
    if (runOutput.flags) {
        console.log('  DV:', runOutput.flags.dv_indicators?.flags?.length ?? 0);
        console.log('  Jurisdiction:', runOutput.flags.jurisdiction_complexity?.flags?.length ?? 0);
        console.log('  Custody:', runOutput.flags.custody_conflict?.flags?.length ?? 0);
    }
}

const intakeId = '5177e9b3-cb5d-46b3-a5e8-ceaf69071f9c';
inspectRuns(intakeId).catch(console.error);
