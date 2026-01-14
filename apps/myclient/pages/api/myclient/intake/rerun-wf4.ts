
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { runWf4 } from '../../../../../../src/workflows/wf4/runWf4';
import { createWf4OpenAiProvider } from '../../../../../../src/workflows/wf4/openaiProvider';

type RerunBody = {
    intakeId?: string;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = {
    ok: true;
    runId: string;
    status: string;
    debug?: any;
};

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ErrorResponse | SuccessResponse>,
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, error: 'Missing authorization token' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
        return res.status(401).json({ ok: false, error: 'Missing authorization token' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return res.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
    }

    const body = (req.body ?? {}) as RerunBody;
    const intakeId = typeof body.intakeId === 'string' ? body.intakeId.trim() : '';

    if (!UUID_RE.test(intakeId)) {
        return res.status(400).json({ ok: false, error: 'Invalid intake id' });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authData.user) {
        return res.status(401).json({ ok: false, error: 'Invalid session' });
    }

    const { data: membershipRows, error: membershipError } = await adminClient
        .from('firm_members')
        .select('firm_id, role')
        .eq('user_id', authData.user.id)
        .limit(1);

    if (membershipError) {
        return res.status(500).json({ ok: false, error: membershipError.message });
    }

    const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
    if (!membership?.firm_id) {
        return res.status(403).json({ ok: false, error: 'No firm membership found' });
    }
    if (!['admin', 'attorney'].includes(membership.role)) {
        return res.status(403).json({ ok: false, error: 'You do not have permission to run AI tasks.' });
    }

    try {
        // 1. Fetch Intake to verify ownership
        const { data: intakeRow, error: intakeError } = await adminClient
            .from('intakes')
            .select('id, firm_id')
            .eq('id', intakeId)
            .eq('firm_id', membership.firm_id)
            .maybeSingle();

        if (intakeError || !intakeRow) {
            return res.status(404).json({ ok: false, error: 'Intake not found or access denied' });
        }

        // 2. Fetch latest WF3 extraction (needed for WF4 input)
        const { data: extractionRows, error: extractionError } = await adminClient
            .from('intake_extractions')
            .select('id')
            .eq('intake_id', intakeRow.id)
            .order('version', { ascending: false })
            .limit(1);

        if (extractionError || !extractionRows || extractionRows.length === 0) {
            return res.status(400).json({ ok: false, error: 'No WF3 extractions found. Resolve rules first.' });
        }
        const wf3RunId = extractionRows[0].id;

        // 3. Initialize Provider and Run WF4
        const provider = createWf4OpenAiProvider({
            firmId: membership.firm_id,
            retries: 2
        });

        const result = await runWf4(
            { intakeId: intakeRow.id, wf3RunId },
            { llmProvider: provider }
        );

        return res.status(200).json({
            ok: true,
            runId: result.runLog.wf4_run_id,
            status: result.runLog.status,
            debug: result.runLog,
        });

    } catch (error) {
        console.error('WF4 Rerun Error:', error);
        const message = error instanceof Error ? error.message : 'Unable to run AI pipeline';
        return res.status(500).json({ ok: false, error: message });
    }
}
