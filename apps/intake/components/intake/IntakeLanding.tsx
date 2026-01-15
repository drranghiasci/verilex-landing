import React, { useState } from 'react';
import Head from 'next/head';
import { globalStyles } from './styles';
import { startIntake } from '../../../../lib/intake/intakeApi';
import Button from '../ui/Button';

type IntakeLandingProps = {
    firmSlug: string;
    firmName?: string;
    onStart: (token: string) => void;
};

export default function IntakeLanding({ firmSlug, firmName, onStart }: IntakeLandingProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await startIntake({ firmSlug });
            onStart(result.token);
        } catch (err) {
            setError('Unable to start intake. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>{firmName ? `${firmName} Intake` : 'Start Intake'}</title>
                <style jsx global>{globalStyles}</style>
            </Head>

            <div className="landing-page">
                <main className="landing-content">
                    <header className="landing-header">
                        {firmName && <h1 className="firm-name">{firmName}</h1>}
                        <h2 className="subtitle">
                            Answer a few questions so we can understand your situation and guide you correctly.
                        </h2>
                    </header>

                    <div className="landing-action">
                        <Button
                            variant="primary"
                            onClick={handleStart}
                            disabled={loading}
                            className="start-button"
                        >
                            {loading ? 'Starting...' : 'Start Intake'}
                        </Button>

                        {error && <div className="error-message">{error}</div>}

                        <p className="trust-cue">
                            Your responses are confidential and reviewed by the firm.
                        </p>
                    </div>
                </main>

                <style jsx>{`
          .landing-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            /* Apple/Vercel aesthetic: Clean, centered */
          }

          .landing-content {
            width: 100%;
            max-width: 480px;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 48px;
            animation: fadeIn 0.6s ease-out;
          }

          .firm-name {
            font-size: 24px;
            font-weight: 600;
            color: var(--text-0);
            letter-spacing: -0.01em;
            margin-bottom: 24px;
            opacity: 0.9;
          }

          .subtitle {
            font-size: 20px;
            line-height: 1.5;
            color: var(--text-1);
            font-weight: 500;
            max-width: 400px;
            margin: 0 auto;
          }

          .start-button {
            width: 100%;
            max-width: 240px;
            height: 56px;
            font-size: 16px;
            background: var(--text-0);
            color: var(--bg);
            border-radius: 12px;
            transition: transform 0.2s, opacity 0.2s;
          }
          
          .start-button:hover:not(:disabled) {
            transform: translateY(-1px);
            opacity: 0.95;
            background: #fff;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
          }

          .start-button:active:not(:disabled) {
            transform: translateY(0);
          }

          .trust-cue {
            margin-top: 24px;
            font-size: 13px;
            color: var(--text-2);
          }

          .error-message {
            margin-top: 16px;
            color: var(--danger);
            font-size: 14px;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
            </div>
        </>
    );
}
