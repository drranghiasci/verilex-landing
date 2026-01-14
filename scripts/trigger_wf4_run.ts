
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { runWf4 } from '../src/workflows/wf4/runWf4';
import { createWf4OpenAiProvider } from '../src/workflows/wf4/openaiProvider';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const INTAKE_ID = 'a0595d87-56cc-4af2-a2d8-68b19178a829';
const WF3_RUN_ID = '7bc3298a-cc09-4d00-b63e-bbe1eec08336';

async function triggerRun() {
    console.log(`Triggering WF4 run for intake: ${INTAKE_ID}`);

    const llmProvider = createWf4OpenAiProvider({
        firmId: 'test-firm-id',
    });

    const input = {
        intakeId: INTAKE_ID,
        wf3RunId: WF3_RUN_ID
    };

    // Dependencies
    const dependencies = {
        llmProvider,
        supabase: supabaseAdmin,
        skipCache: true
    };

    console.log('Running runWf4...');
    try {
        const result = await runWf4(input, dependencies);
        console.log('Run Complete!');
        console.log('Run Log Status:', result.runLog.status);
        console.log('Run Log Errors:', JSON.stringify(result.runLog.per_task, null, 2));
    } catch (err) {
        console.error('Run Failed:', err);
    }
}

triggerRun().catch(console.error);
