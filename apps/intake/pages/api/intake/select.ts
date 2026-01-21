import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';
import {
    getRequestId,
    logRequestStart,
    parseJsonBody,
    requireMethod,
    sendError,
} from '@/lib/apiUtils';

// Valid intake types
const VALID_INTAKE_TYPES = ['custody_unmarried', 'divorce_no_children', 'divorce_with_children'] as const;
type IntakeType = typeof VALID_INTAKE_TYPES[number];

// First step for each intake type
const FIRST_STEP_BY_TYPE: Record<IntakeType, string> = {
    custody_unmarried: 'matter_metadata',
    divorce_no_children: 'matter_metadata',
    divorce_with_children: 'matter_metadata',
};

function extractToken(req: NextApiRequest, body?: { token?: string } | null): string {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }

    const headerToken = req.headers['x-intake-token'];
    if (typeof headerToken === 'string' && headerToken.trim()) {
        return headerToken.trim();
    }

    const bodyToken = body?.token;
    if (typeof bodyToken === 'string' && bodyToken.trim()) {
        return bodyToken.trim();
    }

    return '';
}

type SelectBody = {
    token?: string;
    intake_type?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const requestId = getRequestId(req);
    logRequestStart(req, requestId);

    if (!requireMethod(req, res, ['POST'], requestId)) {
        return;
    }

    const bodyResult = parseJsonBody<SelectBody>(req, requestId);
    if (!bodyResult.ok) {
        sendError(res, bodyResult.status, bodyResult.error, requestId);
        return;
    }

    const body = bodyResult.data ?? {};

    // 1. Validate token
    const token = extractToken(req, body);
    if (!token) {
        sendError(res, 401, 'Missing intake token', requestId);
        return;
    }

    const tokenResult = verifyIntakeToken(token);
    if (!tokenResult.ok) {
        sendError(res, tokenResult.status, tokenResult.error, requestId);
        return;
    }

    const { intake_id, firm_id } = tokenResult.payload;

    // 2. Validate intake_type
    const intakeType = body.intake_type;
    if (!intakeType || !VALID_INTAKE_TYPES.includes(intakeType as IntakeType)) {
        sendError(res, 400, `Invalid intake_type. Must be one of: ${VALID_INTAKE_TYPES.join(', ')}`, requestId);
        return;
    }

    // 3. Load existing intake
    const { data: intake, error: loadError } = await supabaseAdmin
        .from('intakes')
        .select('id, status, submitted_at, raw_payload, current_step_key, completed_step_keys')
        .eq('id', intake_id)
        .eq('firm_id', firm_id)
        .maybeSingle();

    if (loadError) {
        sendError(res, 500, 'Unable to load intake', requestId);
        return;
    }

    if (!intake) {
        sendError(res, 404, 'Intake not found', requestId);
        return;
    }

    // 4. Check intake is not locked
    if (intake.status === 'submitted' || intake.submitted_at) {
        sendError(res, 403, 'Intake is locked and cannot be modified', requestId);
        return;
    }

    // 5. Check immutability - if intake_type already set AND has progressed
    const existingPayload = (intake.raw_payload ?? {}) as Record<string, unknown>;
    const existingType = existingPayload.intake_type as string | undefined;
    const completedSteps = (intake.completed_step_keys ?? []) as string[];

    if (existingType && completedSteps.length > 0) {
        sendError(res, 400, 'Intake type cannot be changed after chat has started. Please start a new intake.', requestId);
        return;
    }

    // 6. Set intake_type and initialize orchestrator state
    const firstStep = FIRST_STEP_BY_TYPE[intakeType as IntakeType];
    const newPayload = {
        ...existingPayload,
        intake_type: intakeType,
        schema_version: 'v1.0',
    };

    const { error: updateError } = await supabaseAdmin
        .from('intakes')
        .update({
            raw_payload: newPayload,
            current_step_key: firstStep,
            completed_step_keys: [],
            step_status: {},
            updated_at: new Date().toISOString(),
        })
        .eq('id', intake_id)
        .eq('firm_id', firm_id);

    if (updateError) {
        sendError(res, 500, 'Unable to update intake', requestId);
        return;
    }

    // 7. Write audit event
    const { error: auditError } = await supabaseAdmin
        .from('audit_events')
        .insert({
            event_type: 'CLIENT_SELECTED_INTAKE_TYPE',
            entity_type: 'intake',
            entity_id: intake_id,
            firm_id,
            actor_id: intake_id, // Client intake uses intake_id as session identifier
            source: 'intake_app',
            created_at: new Date().toISOString(),
            metadata: {
                intake_id,
                intake_type: intakeType,
                schema_version: 'v1.0',
            },
        });

    if (auditError) {
        // Log but don't fail the request
        console.error('[SELECT] Audit event failed:', auditError.message);
    }

    // 8. Return success
    return res.status(200).json({
        ok: true,
        intake_id,
        intake_type: intakeType,
        current_step_key: firstStep,
    });
}
