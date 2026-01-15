
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { openai } from '../../../../../lib/server/openai';
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

    try {
        // 1. Load Intake
        const { data: intake, error: loadError } = await supabaseAdmin
            .from('intake_drafts')
            .select('*')
            .eq('token', token)
            .single();

        if (loadError || !intake) {
            return res.status(404).json({ error: 'Intake not found' });
        }

        if (intake.locked || intake.status === 'submitted') {
            return res.status(403).json({ error: 'Intake is locked' });
        }

        // 2. Prepare Context
        const payload = intake.payload ?? {};
        const enabledSectionIds = getEnabledSectionIds(payload.matter_type);


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
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.2, // Low temp for accurate extraction
        });

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
                    .from('intake_drafts')
                    .update({ payload: newPayload, updated_at: new Date().toISOString() })
                    .eq('token', token);
            }

            // For document requests, we usually want the AI to also say something like "I can help with that..."
            // If finalResponse is null, generate a confirmation message. 
            if (!finalResponse) {
                // Second turn
                const secondTurnMessages: ChatCompletionMessageParam[] = [
                    ...messages,
                    responseMessage,
                    {
                        role: 'tool',
                        tool_call_id: responseMessage.tool_calls[0].id,
                        content: JSON.stringify({ success: true, updated: Object.keys(updates), docRequestTriggered: !!documentRequest }),
                    }
                ];
                const secondCompletion = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: secondTurnMessages,
                    temperature: 0.4,
                });
                finalResponse = secondCompletion.choices[0].message.content;
            }
        }

        return res.status(200).json({
            ok: true,
            response: finalResponse,
            updates: updates,
            documentRequest // Return this to frontend
        });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
