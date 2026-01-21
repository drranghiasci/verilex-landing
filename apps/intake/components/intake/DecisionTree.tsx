import React, { useState } from 'react';
import type { IntakeType } from './IntakeSelector';

type DecisionTreeProps = {
    onResult: (intakeType: IntakeType) => void;
    onBack: () => void;
};

type Answer = 'yes' | 'no' | 'not_sure';

type Question = {
    id: string;
    text: string;
};

const QUESTIONS: Question[] = [
    { id: 'ending_marriage', text: 'Are you trying to end a marriage?' },
    { id: 'minor_children', text: 'Are there minor children with the other party?' },
    { id: 'were_married', text: 'Were you married to the other party?' },
    { id: 'filing_divorce', text: 'Are you filing for divorce right now?' },
];

/**
 * Deterministic routing logic:
 * - Ending marriage + No children → divorce_no_children
 * - Ending marriage + Children → divorce_with_children
 * - Not married + Children → custody_unmarried
 * - Ambiguous → default to divorce_with_children (most comprehensive)
 */
function determineIntakeType(answers: Record<string, Answer>): IntakeType {
    const endingMarriage = answers.ending_marriage;
    const minorChildren = answers.minor_children;
    const wereMarried = answers.were_married;
    const filingDivorce = answers.filing_divorce;

    // Clear divorce cases
    if (endingMarriage === 'yes' || filingDivorce === 'yes') {
        if (minorChildren === 'no') {
            return 'divorce_no_children';
        }
        return 'divorce_with_children';
    }

    // Not ending marriage / not married → custody only if children
    if (endingMarriage === 'no' || wereMarried === 'no') {
        if (minorChildren === 'yes') {
            return 'custody_unmarried';
        }
        // No children, not divorcing - default to divorce_no_children
        return 'divorce_no_children';
    }

    // Children with uncertainty about marriage status
    if (minorChildren === 'yes') {
        if (wereMarried === 'yes') {
            return 'divorce_with_children';
        }
        return 'custody_unmarried';
    }

    // Default fallback: most comprehensive
    return 'divorce_with_children';
}

function canDetermineResult(answers: Record<string, Answer>, questionIndex: number): IntakeType | null {
    // After Q1 (ending_marriage) + Q2 (minor_children), we can often determine
    if (questionIndex >= 2) {
        const endingMarriage = answers.ending_marriage;
        const minorChildren = answers.minor_children;

        // Clear divorce without kids
        if (endingMarriage === 'yes' && minorChildren === 'no') {
            return 'divorce_no_children';
        }

        // Clear divorce with kids
        if (endingMarriage === 'yes' && minorChildren === 'yes') {
            return 'divorce_with_children';
        }

        // Not divorcing with kids
        if (endingMarriage === 'no' && minorChildren === 'yes') {
            return 'custody_unmarried';
        }
    }

    // After Q3 (were_married), we can usually determine
    if (questionIndex >= 3) {
        return determineIntakeType(answers);
    }

    return null;
}

export default function DecisionTree({ onResult, onBack }: DecisionTreeProps) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});

    const handleAnswer = (answer: Answer) => {
        const question = QUESTIONS[currentQuestion];
        const newAnswers = { ...answers, [question.id]: answer };
        setAnswers(newAnswers);

        // Check if we can determine result early
        const earlyResult = canDetermineResult(newAnswers, currentQuestion + 1);
        if (earlyResult) {
            onResult(earlyResult);
            return;
        }

        // Move to next question or determine final result
        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            // All questions answered - determine result
            onResult(determineIntakeType(newAnswers));
        }
    };

    const question = QUESTIONS[currentQuestion];
    const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

    return (
        <div className="tree-container">
            <button type="button" className="back-button" onClick={onBack}>
                ← Back to options
            </button>

            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="question-card">
                <p className="question-number">Question {currentQuestion + 1} of {QUESTIONS.length}</p>
                <h2 className="question-text">{question.text}</h2>

                <div className="answer-buttons">
                    <button type="button" className="answer-btn yes" onClick={() => handleAnswer('yes')}>
                        Yes
                    </button>
                    <button type="button" className="answer-btn no" onClick={() => handleAnswer('no')}>
                        No
                    </button>
                    <button type="button" className="answer-btn not-sure" onClick={() => handleAnswer('not_sure')}>
                        Not sure
                    </button>
                </div>
            </div>

            <style jsx>{`
        .tree-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.4s ease-out;
        }

        .back-button {
          position: absolute;
          top: 24px;
          left: 24px;
          background: transparent;
          border: none;
          color: var(--text-2);
          font-size: 14px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: var(--surface-0);
          color: var(--text-0);
        }

        .progress-bar {
          width: 100%;
          max-width: 400px;
          height: 4px;
          background: var(--surface-1);
          border-radius: 2px;
          margin-bottom: 48px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.3s ease;
        }

        .question-card {
          text-align: center;
          max-width: 480px;
        }

        .question-number {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
        }

        .question-text {
          font-size: clamp(22px, 4vw, 28px);
          font-weight: 600;
          color: var(--text-0);
          line-height: 1.3;
          margin-bottom: 40px;
        }

        .answer-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 320px;
          margin: 0 auto;
        }

        .answer-btn {
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 500;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--border);
          background: var(--surface-0);
          color: var(--text-0);
        }

        .answer-btn:hover {
          transform: translateY(-1px);
        }

        .answer-btn.yes:hover {
          background: rgba(52, 211, 153, 0.15);
          border-color: var(--success);
        }

        .answer-btn.no:hover {
          background: rgba(248, 113, 113, 0.15);
          border-color: var(--danger);
        }

        .answer-btn.not-sure:hover {
          background: var(--surface-1);
          border-color: var(--border-highlight);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
