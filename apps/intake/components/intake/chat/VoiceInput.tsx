import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VoiceInputProps = {
    onTextReady: (text: string) => void;
    disabled?: boolean;
};

export default function VoiceInput({ onTextReady, disabled }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await handleTranscribe(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscribe = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');

            const res = await fetch('/api/intake/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Transcription failed');

            const data = await res.json();
            if (data.text) {
                onTextReady(data.text);
            }
        } catch (error) {
            console.error('Transcription error:', error);
            alert('Failed to transcribe audio.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="relative flex items-center">
            <AnimatePresence mode="wait">
                {isProcessing ? (
                    <motion.div
                        key="processing"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="p-2 text-text-2"
                    >
                        <Loader2 className="animate-spin" size={20} />
                    </motion.div>
                ) : isRecording ? (
                    <motion.button
                        key="stop"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={stopRecording}
                        className="p-2 rounded-full bg-error/10 text-error hover:bg-error/20 transition-colors relative"
                        title="Stop Recording"
                    >
                        <Square size={20} fill="currentColor" />
                        <motion.span
                            className="absolute inset-0 rounded-full border border-error"
                            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                    </motion.button>
                ) : (
                    <motion.button
                        key="mic"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={startRecording}
                        disabled={disabled}
                        className="p-2 rounded-full text-text-2 hover:bg-surface-2 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Use Voice"
                    >
                        <Mic size={20} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
