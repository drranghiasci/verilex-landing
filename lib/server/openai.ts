
import OpenAI from 'openai';

export function getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

// Keep the old export for backward compatibility if needed, but it's unsafe. 
// Ideally we replace usages. For now, let's remove the top-level throw constant.
// If valid, `openai` will be the client. If not, accessing it might throw if we used a getter, 
// but let's just force usages to use the function or we verify env first.
// Actually, to minimize refactor, let's export a getter or just the function.
// Let's stick to the function pattern as it's safest for serverless.
