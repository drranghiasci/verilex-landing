
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { getOpenAIClient } from '../../../../../lib/server/openai';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';
import { transformSchemaToSystemPrompt } from '../../../../../lib/intake/ai/prompts/divorce_custody.system';
import { transformCustodySchemaToSystemPrompt } from '../../../../../lib/intake/ai/prompts/custody_unmarried.system';
import { transformDivorceNoChildrenSchemaToSystemPrompt } from '../../../../../lib/intake/ai/prompts/divorce_no_children.system';
import { transformDivorceWithChildrenSchemaToSystemPrompt } from '../../../../../lib/intake/ai/prompts/divorce_with_children.system';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../../lib/intake/schemas/ga/family_law/divorce_custody.v1';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { wrapAssertion, unwrapAssertion } from '../../../../../lib/intake/assertionTypes';
import { orchestrateIntake, type OrchestratorResult } from '../../../../../lib/intake/orchestrator';
import { orchestrateCustodyIntake, type CustodyOrchestratorResult } from '../../../../../lib/intake/orchestrator/core/custody_unmarried.orchestrator';
import { orchestrateDivorceNoChildrenIntake, type DivorceNoChildrenOrchestratorResult } from '../../../../../lib/intake/orchestrator/core/divorce_no_children.orchestrator';
import { orchestrateDivorceWithChildrenIntake, type DivorceWithChildrenOrchestratorResult } from '../../../../../lib/intake/orchestrator/core/divorce_with_children.orchestrator';

// Intake modes
type IntakeMode = 'divorce_custody' | 'custody_unmarried' | 'divorce_no_children' | 'divorce_with_children';

// Orchestrator result union type
type AnyOrchestratorResult =
    | OrchestratorResult
    | CustodyOrchestratorResult
    | DivorceNoChildrenOrchestratorResult
    | DivorceWithChildrenOrchestratorResult;

// Map schema step keys to schema section IDs for system prompt (legacy divorce)
const DIVORCE_SCHEMA_STEP_TO_SECTION: Record<string, string> = {
    matter_metadata: 'matter_metadata',
    client_identity: 'client_identity',
    opposing_party: 'opposing_party',
    marriage_details: 'marriage_details',
    separation_grounds: 'separation_grounds',
    child_object: 'child_object',
    children_custody: 'children_custody',
    asset_object: 'asset_object',
    income_support: 'income_support',
    debt_object: 'debt_object',
    domestic_violence_risk: 'domestic_violence_risk',
    jurisdiction_venue: 'jurisdiction_venue',
    prior_legal_actions: 'prior_legal_actions',
    desired_outcomes: 'desired_outcomes',
    evidence_documents: 'evidence_documents',
    final_review: 'final_review',
};

/**
 * Run the correct orchestrator based on intake mode.
 * This ensures mode-locked logic (like final_review gating) is applied consistently.
 */
function runOrchestrator(intakeMode: IntakeMode, payload: Record<string, unknown>): AnyOrchestratorResult {
    switch (intakeMode) {
        case 'custody_unmarried':
            return orchestrateCustodyIntake(payload);
        case 'divorce_no_children':
            return orchestrateDivorceNoChildrenIntake(payload);
        case 'divorce_with_children':
            return orchestrateDivorceWithChildrenIntake(payload);
        default:
            return orchestrateIntake(payload);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, message, history } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Missing token' });
    }

    // 1. Verify Token
    const tokenResult = verifyIntakeToken(token);
    if (!tokenResult.ok) {
        return res.status(401).json({ error: 'Invalid or expired token', details: tokenResult.error });
    }
    const { intake_id, firm_id } = tokenResult.payload;

    try {
        // 2. Load Intake
        const { data: intake, error: loadError } = await supabaseAdmin
            .from('intakes')
            .select('id, status, submitted_at, raw_payload, matter_type, intake_type')
            .eq('id', intake_id)
            .eq('firm_id', firm_id)
            .single();

        if (loadError || !intake) {
            return res.status(404).json({ error: 'Intake not found', details: loadError?.message });
        }

        const isLocked = intake.status === 'submitted' || !!intake.submitted_at;
        if (isLocked) {
            return res.status(403).json({ error: 'Intake is locked' });
        }

        // 3. Determine intake mode - prefer column, fall back to raw_payload
        const payload = (intake.raw_payload ?? {}) as Record<string, unknown>;
        const intakeTypeFromColumn = intake.intake_type as IntakeMode | null;
        const intakeTypeFromPayload = payload.intake_type as IntakeMode | undefined;
        const intakeMode: IntakeMode = intakeTypeFromColumn || intakeTypeFromPayload || 'divorce_custody';

        // 4. Run appropriate orchestrator (SINGLE SOURCE OF TRUTH)
        let currentSchemaStep: string;
        let currentSectionId: string;
        let missingFields: string[];
        let orchestratorState: AnyOrchestratorResult;
        let systemPrompt: string;
        let flowBlocked = false;
        let flowBlockedReason: string | undefined;

        if (intakeMode === 'custody_unmarried') {
            // Mode-locked: custody unmarried
            orchestratorState = orchestrateCustodyIntake(payload);
            currentSchemaStep = orchestratorState.currentSchemaStep;
            currentSectionId = orchestratorState.currentSchemaStep;
            missingFields = orchestratorState.currentStepMissingFields;
            systemPrompt = transformCustodySchemaToSystemPrompt(payload, currentSectionId, missingFields);
        } else if (intakeMode === 'divorce_no_children') {
            // Mode-locked: divorce no children
            const divorceOrchestrator = orchestrateDivorceNoChildrenIntake(payload);
            orchestratorState = divorceOrchestrator;
            currentSchemaStep = divorceOrchestrator.currentSchemaStep;
            currentSectionId = divorceOrchestrator.currentSchemaStep;
            missingFields = divorceOrchestrator.currentStepMissingFields;
            flowBlocked = divorceOrchestrator.flowBlocked;
            flowBlockedReason = divorceOrchestrator.flowBlockedReason;
            systemPrompt = transformDivorceNoChildrenSchemaToSystemPrompt(
                payload,
                currentSectionId,
                missingFields,
                flowBlocked,
                flowBlockedReason
            );
        } else if (intakeMode === 'divorce_with_children') {
            // Mode-locked: divorce with children (full-stack)
            const fullOrchestrator = orchestrateDivorceWithChildrenIntake(payload);
            orchestratorState = fullOrchestrator;
            currentSchemaStep = fullOrchestrator.currentSchemaStep;
            currentSectionId = fullOrchestrator.currentSchemaStep;
            missingFields = fullOrchestrator.currentStepMissingFields;
            flowBlocked = fullOrchestrator.flowBlocked;
            flowBlockedReason = fullOrchestrator.flowBlockedReason;
            systemPrompt = transformDivorceWithChildrenSchemaToSystemPrompt(
                payload,
                currentSectionId,
                missingFields,
                flowBlocked,
                flowBlockedReason
            );
        } else {
            // Default/legacy: divorce_custody
            orchestratorState = orchestrateIntake(payload);
            currentSchemaStep = orchestratorState.currentSchemaStep;
            currentSectionId = DIVORCE_SCHEMA_STEP_TO_SECTION[currentSchemaStep] || currentSchemaStep;
            missingFields = orchestratorState.currentStepMissingFields;
            systemPrompt = transformSchemaToSystemPrompt(GA_DIVORCE_CUSTODY_V1, payload, currentSectionId, missingFields);
        }

        // Log for debugging
        console.log('[ORCHESTRATOR]', {
            intake_id,
            intakeMode,
            currentSchemaStep,
            currentSectionId,
            missingFields: missingFields.slice(0, 5),
        });

        // Log which section has CURRENT FOCUS in the prompt
        const focusMatch = systemPrompt.match(/Section: ([^\n]+) \*CURRENT FOCUS\*/);
        console.log('[PROMPT FOCUS]', focusMatch ? focusMatch[1] : 'NO FOCUS FOUND');

        // 5. Define Tools
        const tools: ChatCompletionTool[] = [
            {
                type: 'function',
                function: {
                    name: 'update_intake_field',
                    description: 'Record a client assertion. This stores what the client stated, not a verified fact.',
                    parameters: {
                        type: 'object',
                        properties: {
                            field: { type: 'string', description: 'The field key (e.g., "date_of_marriage")' },
                            value: { type: 'string', description: 'The value to set (iso-8601 for dates, true/false for booleans)' },
                        },
                        required: ['field', 'value'],
                    },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'request_document_upload',
                    description: 'Suggest that the user upload a specific document related to the current topic.',
                    parameters: {
                        type: 'object',
                        properties: {
                            documentType: { type: 'string', description: 'The type of document (e.g., "pay_stub", "marriage_certificate")' },
                            reason: { type: 'string', description: 'Short reason for the request.' },
                        },
                        required: ['documentType', 'reason'],
                    },
                },
            },
        ];

        // 6. Construct Messages
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...history.map((msg: { source: string; content: string }) => ({
                role: msg.source === 'client' ? 'user' : 'assistant',
                content: msg.content,
            })) as ChatCompletionMessageParam[],
        ];

        // Only add the user message if it's NOT the special start signal
        if (message !== 'START_CONVERSATION') {
            messages.push({ role: 'user', content: message });
        } else {
            // Start conversation - instruct AI to begin with Phase 1 greeting
            messages.push({
                role: 'system',
                content: `The user has opened the chat. Provide your Phase 1 Greeting and ask the first required question.`
            });
        }

        // 7. Call OpenAI
        let completion;
        try {
            const client = getOpenAIClient();
            completion = await client.chat.completions.create({
                model: 'gpt-4o',
                messages,
                tools,
                tool_choice: 'auto',
                temperature: 0.2,
            });
        } catch (openaiErr: unknown) {
            const errMessage = openaiErr instanceof Error ? openaiErr.message : 'Unknown error';
            console.error('OpenAI Initialization or Call Failed:', openaiErr);
            return res.status(502).json({
                error: 'AI Service Unavailable',
                details: errMessage,
            });
        }

        const choice = completion.choices[0];
        const responseMessage = choice.message;

        // 8. Handle Tool Calls
        let finalResponse = responseMessage.content;
        const updates: Record<string, unknown> = {};
        let documentRequest: { type: string; reason: string } | null = null;

        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                // Type assertion for tool call structure
                const tc = toolCall as { id: string; type: string; function?: { name: string; arguments: string } };
                if (tc.function) {
                    try {
                        const args = JSON.parse(tc.function.arguments);
                        const name = tc.function.name;

                        if (name === 'update_intake_field') {
                            // Parse string values to proper types
                            // AI sends "true"/"false" as strings, but validators expect booleans
                            let parsedValue: unknown = args.value;
                            if (args.value === 'true') {
                                parsedValue = true;
                            } else if (args.value === 'false') {
                                parsedValue = false;
                            } else if (typeof args.value === 'string' && /^\d+$/.test(args.value)) {
                                // Parse numeric strings to numbers
                                parsedValue = parseInt(args.value, 10);
                            }

                            // STATE CODE NORMALIZATION for child_home_state
                            // Convert full state names to 2-letter codes (Georgia → GA)
                            if (args.field === 'child_home_state' && typeof parsedValue === 'string') {
                                const stateCodeMap: Record<string, string> = {
                                    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
                                    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
                                    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
                                    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
                                    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
                                    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
                                    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
                                    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
                                    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
                                    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
                                    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
                                    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
                                    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
                                };
                                const normalized = parsedValue.trim().toLowerCase();
                                if (stateCodeMap[normalized]) {
                                    parsedValue = stateCodeMap[normalized];
                                    console.log('[CHAT] State normalized:', { original: args.value, normalized: parsedValue });
                                } else if (/^[A-Za-z]{2}$/.test(parsedValue.trim())) {
                                    // Already a 2-letter code, uppercase it
                                    parsedValue = parsedValue.trim().toUpperCase();
                                }
                            }

                            // MONTHS EXTRACTION for time_in_home_state_months
                            // Extract first numeric value from text like "his whole life to about 30 months"
                            if (args.field === 'time_in_home_state_months' && typeof parsedValue === 'string') {
                                const monthMatch = parsedValue.match(/(\d+)/);
                                if (monthMatch) {
                                    const extractedMonths = parseInt(monthMatch[1], 10);
                                    console.log('[CHAT] Months extracted:', { original: args.value, extracted: extractedMonths });
                                    parsedValue = extractedMonths;
                                } else {
                                    // No number found - log warning but keep original for AI to re-prompt
                                    console.log('[CHAT] Months extraction failed (no number):', { original: args.value });
                                }
                            }

                            // ARRAY FIELD HANDLING for repeatable sections (children, assets, debts)
                            // These fields need to be stored as arrays, not single values
                            const arrayFields = [
                                // Children seed fields
                                'child_full_name',
                                'child_dob',
                                'child_current_residence',
                                // Children detail fields
                                'biological_relation',
                                'child_home_state',
                                'time_in_home_state_months',
                                // Asset fields
                                'asset_type',
                                'ownership',
                                'estimated_value',
                                'title_holder',
                                'acquired_pre_marriage',
                                // Debt fields
                                'debt_type',
                                'debt_amount',
                                'responsible_party',
                            ];

                            if (arrayFields.includes(args.field)) {
                                // Get existing array from payload or updates
                                const existingFromPayload = payload[args.field];
                                const existingFromUpdates = updates[args.field];

                                // Unwrap existing values to get raw array
                                let existingArray: unknown[] = [];
                                if (existingFromUpdates) {
                                    const unwrapped = unwrapAssertion(existingFromUpdates);
                                    existingArray = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
                                } else if (existingFromPayload) {
                                    const unwrapped = unwrapAssertion(existingFromPayload);
                                    existingArray = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
                                }

                                // Append new value to array
                                existingArray.push(parsedValue);

                                // Wrap the entire array as assertion
                                updates[args.field] = wrapAssertion(existingArray, {
                                    source_type: 'chat',
                                    transcript_reference: null,
                                    evidence_support_level: 'none',
                                    contradiction_flag: false,
                                });

                                console.log('[CHAT] Array field appended:', {
                                    field: args.field,
                                    newValue: parsedValue,
                                    arrayLength: existingArray.length,
                                });
                            } else {
                                // Regular single-value field - wrap with assertion metadata
                                updates[args.field] = wrapAssertion(parsedValue, {
                                    source_type: 'chat',
                                    transcript_reference: null,
                                    evidence_support_level: 'none',
                                    contradiction_flag: false,
                                });
                            }

                            // DEBUG: Log spouse address fields to diagnose completion issues
                            if (args.field.startsWith('opposing_')) {
                                console.log('[CHAT] Spouse field recorded:', {
                                    field: args.field,
                                    rawValue: args.value,
                                    parsedValue,
                                });
                            }

                            // SAME-ADDRESS AUTO-POPULATION (Critical for spouse step completion)
                            // When user confirms spouse lives at same address, auto-populate derived fields
                            if (args.field === 'opposing_address_same_as_client' && parsedValue === true) {
                                console.log('[CHAT] Same-address path detected, auto-populating derived fields');

                                // Set opposing_address_known = true (required for spouse step)
                                updates['opposing_address_known'] = wrapAssertion(true, {
                                    source_type: 'chat',
                                    transcript_reference: null,
                                    evidence_support_level: 'none',
                                    contradiction_flag: false,
                                });

                                // Copy client_address to opposing_last_known_address
                                const clientAddress = unwrapAssertion(payload.client_address);
                                if (clientAddress && typeof clientAddress === 'string') {
                                    updates['opposing_last_known_address'] = wrapAssertion(clientAddress, {
                                        source_type: 'chat',
                                        transcript_reference: null,
                                        evidence_support_level: 'none',
                                        contradiction_flag: false,
                                    });
                                    console.log('[CHAT] Auto-populated opposing_last_known_address from client_address:', clientAddress);
                                }
                            }
                        } else if (name === 'request_document_upload') {
                            documentRequest = {
                                type: args.documentType,
                                reason: args.reason,
                            };
                        }
                    } catch (e) {
                        console.error('Failed to parse tool args', e);
                    }
                }
            }

            // 9. If we have updates, save them AND re-run orchestrator
            if (Object.keys(updates).length > 0) {
                const newPayload = { ...payload, ...updates };

                // Re-run orchestrator with new payload to get new state (mode-specific!)
                const newOrchestratorResult = runOrchestrator(intakeMode, newPayload);

                // Update the orchestratorState to the new result so we return correct state to frontend
                orchestratorState = newOrchestratorResult;

                // Determine if we should transition to review
                // This triggers the review screen in the frontend
                const shouldTransitionToReview = newOrchestratorResult.readyForReview;
                const newStatus = shouldTransitionToReview ? 'ready_for_review' : undefined;

                // Update DB with new payload AND orchestrator state
                const updateData: Record<string, unknown> = {
                    raw_payload: newPayload,
                    updated_at: new Date().toISOString(),
                    current_step_key: newOrchestratorResult.currentSchemaStep,
                    completed_step_keys: newOrchestratorResult.completedSchemaSteps,
                    step_status: Object.fromEntries(
                        newOrchestratorResult.schemaSteps.map((s) => [s.key, {
                            status: s.status,
                            missing: s.missingFields,
                            errors: s.validationErrors,
                        }])
                    ),
                    last_orchestrated_at: new Date().toISOString(),
                };

                // Auto-transition to review when all steps complete
                if (newStatus) {
                    updateData.status = newStatus;
                    console.log('[ORCHESTRATOR] Auto-transitioning to ready_for_review');
                }

                await supabaseAdmin
                    .from('intakes')
                    .update(updateData)
                    .eq('id', intake_id)
                    .eq('firm_id', firm_id);

                console.log('[ORCHESTRATOR] After update:', {
                    intake_id,
                    previousStep: currentSchemaStep,
                    newStep: newOrchestratorResult.currentSchemaStep,
                    updatedFields: Object.keys(updates),
                    readyForReview: newOrchestratorResult.readyForReview,
                });

                // DEBUG: Log opposing_party step status for spouse completion diagnosis
                const opposingPartyStep = newOrchestratorResult.schemaSteps.find(s => s.key === 'opposing_party');
                if (opposingPartyStep) {
                    console.log('[ORCHESTRATOR] opposing_party status:', {
                        status: opposingPartyStep.status,
                        missing: opposingPartyStep.missingFields,
                    });
                }

                // DEBUG: Log children_gate step status for child persistence diagnosis
                const childrenGateStep = newOrchestratorResult.schemaSteps.find(s => s.key === 'children_gate');
                if (childrenGateStep) {
                    const childFullName = unwrapAssertion(newPayload.child_full_name);
                    const childDob = unwrapAssertion(newPayload.child_dob);
                    const childResidence = unwrapAssertion(newPayload.child_current_residence);
                    console.log('[ORCHESTRATOR] children_gate status:', {
                        status: childrenGateStep.status,
                        missing: childrenGateStep.missingFields,
                        children_count: unwrapAssertion(newPayload.children_count),
                        child_full_name_count: Array.isArray(childFullName) ? childFullName.length : (childFullName ? 1 : 0),
                        child_dob_count: Array.isArray(childDob) ? childDob.length : (childDob ? 1 : 0),
                        child_residence_count: Array.isArray(childResidence) ? childResidence.length : (childResidence ? 1 : 0),
                    });
                }

                // DEBUG: Log child_object step status for detail field persistence diagnosis
                const childObjectStep = newOrchestratorResult.schemaSteps.find(s => s.key === 'child_object');
                if (childObjectStep) {
                    const biologicalRelation = unwrapAssertion(newPayload.biological_relation);
                    const childHomeState = unwrapAssertion(newPayload.child_home_state);
                    const timeInState = unwrapAssertion(newPayload.time_in_home_state_months);
                    console.log('[ORCHESTRATOR] child_object status:', {
                        status: childObjectStep.status,
                        missing: childObjectStep.missingFields,
                        biological_relation_count: Array.isArray(biologicalRelation) ? biologicalRelation.length : (biologicalRelation ? 1 : 0),
                        child_home_state_count: Array.isArray(childHomeState) ? childHomeState.length : (childHomeState ? 1 : 0),
                        time_in_home_state_months_count: Array.isArray(timeInState) ? timeInState.length : (timeInState ? 1 : 0),
                        child_home_state_values: childHomeState,
                        time_in_home_state_months_values: timeInState,
                    });
                }
            }

            // 10. If no text response, do second turn for tool confirmation
            if (!finalResponse) {
                const toolMessages = responseMessage.tool_calls.map((tc) => ({
                    role: 'tool' as const,
                    tool_call_id: tc.id,
                    content: JSON.stringify({ success: true, updated: Object.keys(updates) }),
                }));

                const secondTurnMessages: ChatCompletionMessageParam[] = [
                    ...messages,
                    responseMessage,
                    ...toolMessages,
                ];

                const client = getOpenAIClient();
                const secondCompletion = await client.chat.completions.create({
                    model: 'gpt-4o',
                    messages: secondTurnMessages,
                    temperature: 0.4,
                });
                finalResponse = secondCompletion.choices[0].message.content;
            }
        }

        // MOVE-ON GUARD: Prevent AI from claiming completion when orchestrator hasn't advanced
        // Check if AI response falsely claims to move on while current step still has missing fields
        const currentStepStatus = orchestratorState.schemaSteps.find(
            (s) => s.key === orchestratorState.currentSchemaStep
        );
        if (finalResponse && currentStepStatus && currentStepStatus.missingFields.length > 0) {
            // Check for false completion/moving-on claims
            const moveOnPatterns = [
                /let'?s move on/i,
                /moving on/i,
                /now let'?s/i,
                /completed?.*(?:step|section)/i,
                /finished.*(?:step|section)/i,
                /move to.*(?:custody|assets|finances|safety)/i,
                /proceed to/i,
                /we'?ve got.*(?:everything|all.*need)/i,
            ];

            const hasFalseCompletion = moveOnPatterns.some(pattern => pattern.test(finalResponse!));

            if (hasFalseCompletion) {
                console.log('[CHAT] MOVE-ON GUARD triggered:', {
                    currentStep: orchestratorState.currentSchemaStep,
                    missing: currentStepStatus.missingFields,
                    originalResponse: finalResponse?.substring(0, 100) + '...',
                });

                // Replace with correct prompt for remaining fields
                const stepLabels: Record<string, string> = {
                    'child_object': "child's details",
                    'children_gate': "children's information",
                    'opposing_party': "spouse information",
                    'custody_preferences': "custody preferences",
                };
                const stepLabel = stepLabels[orchestratorState.currentSchemaStep] || orchestratorState.currentSchemaStep;

                finalResponse = `I still need a few more pieces of information for ${stepLabel}. ` +
                    `Could you please provide: ${currentStepStatus.missingFields.slice(0, 2).join(' and ')}?`;
            }
        }

        const safetyTrigger = finalResponse?.includes('WARNING: 911') || false;

        return res.status(200).json({
            ok: true,
            response: finalResponse,
            updates,
            documentRequest,
            safetyTrigger,
            // Return orchestrator state for frontend sidebar sync
            orchestrator: {
                intakeType: intakeMode,
                currentStep: orchestratorState.currentSchemaStep,
                currentUiStep: orchestratorState.currentUiStep,
                completedSteps: orchestratorState.completedSchemaSteps,
                completionPercent: orchestratorState.totalCompletionPercent,
                readyForReview: orchestratorState.readyForReview,
                stepStatus: Object.fromEntries(
                    orchestratorState.schemaSteps.map((s) => [s.key, {
                        status: s.status,
                        missing: s.missingFields,
                    }])
                ),
            },
        });
    } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('AI Chat Error:', error);
        return res.status(500).json({ error: errMessage });
    }
}
