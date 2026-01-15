import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
    api: {
        bodyParser: false,
    },
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const form = formidable({
            maxFileSize: 25 * 1024 * 1024, // 25MB
            keepExtensions: true,
        });

        const [fields, files] = await form.parse(req);
        const audioFile = files.file?.[0];

        if (!audioFile) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFile.filepath),
            model: 'whisper-1',
        });

        // Cleanup temp file
        fs.unlinkSync(audioFile.filepath);

        return res.status(200).json({ text: transcription.text });
    } catch (error) {
        console.error('Transcription error:', error);
        return res.status(500).json({ error: 'Transcription failed' });
    }
}
