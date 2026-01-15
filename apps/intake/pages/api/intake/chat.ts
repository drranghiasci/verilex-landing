
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { getOpenAIClient } from '../../../../../lib/server/openai';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';
import { transformSchemaToSystemPrompt } from '../../../../../lib/intake/ai/systemPrompt';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../../lib/intake/schema/gaDivorceCustodyV1';
import { validateIntakePayload } from '../../../../../lib/intake/validation';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { getEnabledSectionIds } from '../../../../../lib/intake/gating';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, message, history, sectionId } = req.body;

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
            .select('id, status, submitted_at, raw_payload, matter_type') // Select locked if it exists, or derive it
            .eq('id', intake_id)
            .eq('firm_id', firm_id)
            .single();

        if (loadError || !intake) {
            return res.status(404).json({ error: 'Intake not found', details: loadError?.message });
        }

        const isLocked = intake.status === 'submitted' || !!intake.submitted_at; // derives locked state if no column

        if (isLocked) {
            return res.status(403).json({ error: 'Intake is locked' });
        }

        // 3. Prepare Context
        const payload = intake.raw_payload ?? {};
        const enabledSectionIds = getEnabledSectionIds(payload);



        // Calculate missing fields for System Prompt
        const validationResult = validateIntakePayload(payload, enabledSectionIds);
        const missingFields = validationResult.missingKeys;

        const systemPrompt = transformSchemaToSystemPrompt(
            GA_DIVORCE_CUSTODY_V1,
            payload,
            sectionId,
            missingFields
        );


        // 3. Define Tools
        const tools: ChatCompletionTool[] = [
            {
                type: 'function',
                function: {
                    name: 'update_intake_field',
                    description: 'Update a specific field in the intake form with new information provided by the user.',
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
            {
                type: 'function',
                function: {
                    name: 'mark_section_complete',
                    description: 'Call this when the user indicates they have no more information for the current section.',
                    parameters: {
                        type: 'object',
                        properties: {
                            sectionId: { type: 'string' },
                        },
                        required: ['sectionId'],
                    },
                },
            },
        ];

        // 4. Construct Messages
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...history.map((msg: any) => ({
                role: msg.source === 'client' ? 'user' : 'assistant',
                content: msg.content,
            })),
        ];

        // Only add the user message if it's NOT the special start signal
        if (message !== 'START_CONVERSATION') {
            messages.push({ role: 'user', content: message });
        } else {
            // Optional: Add a nudge system message to ensure greeting
            messages.push({ role: 'system', content: ' The user has opened the chat. Please provide your Phase 1 Greeting.' });
        }

        // 5. Call OpenAI
        let completion;
        try {
            const client = getOpenAIClient();
            completion = await client.chat.completions.create({
                model: 'gpt-4o',
                messages,
                tools,
                tool_choice: 'auto',
                temperature: 0.2, // Low temp for accurate extraction
            });
        } catch (openaiErr: any) {
            console.error('OpenAI Initialization or Call Failed:', openaiErr);
            return res.status(502).json({
                error: 'AI Service Unavailable',
                details: openaiErr.message
            });
        }

        const choice = completion.choices[0];
        const responseMessage = choice.message;

        // 6. Handle Tool Calls
        let finalResponse = responseMessage.content;
        const updates: Record<string, any> = {};
        let documentRequest: { type: string; reason: string } | null = null;

        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                // @ts-ignore
                if (toolCall.function) {
                    try {
                        // @ts-ignore
                        const args = JSON.parse(toolCall.function.arguments);
                        // @ts-ignore
                        const name = toolCall.function.name;

                        if (name === 'update_intake_field') {
                            updates[args.field] = args.value;
                        } else if (name === 'request_document_upload') {
                            documentRequest = {
                                type: args.documentType,
                                reason: args.reason
                            };
                        }

                    } catch (e) {
                        console.error('Failed to parse tool args', e);
                    }
                }
            }

            // If we have updates, save them
            if (Object.keys(updates).length > 0) {
                const newPayload = { ...payload, ...updates };
                await supabaseAdmin
                    .from('intakes')
                    .update({ raw_payload: newPayload, updated_at: new Date().toISOString() })
                    .eq('id', intake_id)
                    .eq('firm_id', firm_id);
            }

            // For document requests, we usually want the AI to also say something like "I can help with that..."
            // If finalResponse is null, generate a confirmation message. 
            // If finalResponse is null, generate a confirmation message. 
            if (!finalResponse) {
                // Second turn: We must provide a tool output for EVERY tool call
                const toolMessages = responseMessage.tool_calls.map((tc: any) => {
                    const callName = tc.function.name;
                    // For update_intake_field, we can return success
                    if (callName === 'update_intake_field') {
                        // We could try to return specific field success, but generic is fine for now
                        return {
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: JSON.stringify({ success: true, updated: Object.keys(updates) }),
                        };
                    }
                    // For request_document_upload
                    if (callName === 'request_document_upload') {
                        return {
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: JSON.stringify({ success: true, docRequestTriggered: true }),
                        };
                    }

                    // Fallback
                    return {
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: JSON.stringify({ success: true }),
                    };
                });

                const secondTurnMessages: ChatCompletionMessageParam[] = [
                    ...messages,
                    responseMessage,
                    ...toolMessages as any[] // Cast primarily for strict checks, but structure matches
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
            updates: updates,
            documentRequest, // Return this to frontend
            safetyTrigger
        });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
