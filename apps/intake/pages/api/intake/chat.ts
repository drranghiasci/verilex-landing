
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
import { wrapAssertion } from '../../../../../lib/intake/assertionTypes';
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
                            // Wrap with assertion metadata for provenance
                            updates[args.field] = wrapAssertion(args.value, {
                                source_type: 'chat',
                                transcript_reference: null,
                                evidence_support_level: 'none',
                                contradiction_flag: false,
                            });
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

                // Update DB with new payload AND orchestrator state
                await supabaseAdmin
                    .from('intakes')
                    .update({
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
                    })
                    .eq('id', intake_id)
                    .eq('firm_id', firm_id);

                console.log('[ORCHESTRATOR] After update:', {
                    intake_id,
                    previousStep: currentSchemaStep,
                    newStep: newOrchestratorResult.currentSchemaStep,
                    updatedFields: Object.keys(updates),
                });
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
