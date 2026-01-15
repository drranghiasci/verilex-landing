
import React, { useState } from 'react';

type StepInfo = {
    id: string;
    label: string;
    isCompleted: boolean;
    isActive: boolean;
};

type SideNavProps = {
    steps: StepInfo[];
    currentStepIndex: number;
    completionPercentage: number;
};

export default function SideNav({ steps, currentStepIndex, completionPercentage }: SideNavProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <aside
            className={`side-nav ${isHovered ? 'expanded' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="track">
                <div
                    className="progress-fill"
                    style={{ height: `${completionPercentage}%` }}
                />
            </div>

            <div className="steps-container">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`step-item ${step.isActive ? 'active' : ''} ${step.isCompleted ? 'completed' : ''}`}
                    >
                        <div className="step-marker">
                            {step.isCompleted ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <span className="step-num">{index + 1}</span>
                            )}
                        </div>
                        <div className="step-label">
                            {step.label}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .side-nav {
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 64px; /* Collapsed width */
                    background: var(--bg-surface, #111);
                    border-right: 1px solid var(--border);
                    z-index: 50;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    padding: 24px 0;
                    overflow: hidden;
                }

                .side-nav.expanded {
                    width: 240px; /* Expanded width */
                    background: rgba(10, 10, 10, 0.95);
                    backdrop-filter: blur(10px);
                    box-shadow: 10px 0 30px rgba(0,0,0,0.3);
                }

                /* Vertical Track */
                .track {
                    position: absolute;
                    left: 31px; /* Center of 64px is 32px, minus 1px width/2 */
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--border);
                    z-index: 0;
                }

                .progress-fill {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    background: var(--primary, #3b82f6);
                    transition: height 0.5s ease;
                }

                .steps-container {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    padding-top: 40px; /* Offset from top */
                }

                .step-item {
                    display: flex;
                    align-items: center;
                    height: 32px;
                    padding-left: 16px; /* (64 - 32)/2 */
                    opacity: 0.6;
                    transition: all 0.2s;
                    cursor: default; /* Read only for now */
                    white-space: nowrap;
                }

                .step-item.active {
                    opacity: 1;
                }
                .step-item.completed {
                    opacity: 0.8;
                }

                .step-marker {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--bg);
                    border: 2px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-2);
                    transition: all 0.2s;
                    position: relative;
                    z-index: 2;
                }

                .step-item.active .step-marker {
                    border-color: var(--primary, #3b82f6);
                    color: var(--primary, #3b82f6);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                    transform: scale(1.1);
                }

                .step-item.completed .step-marker {
                    background: var(--primary, #3b82f6);
                    border-color: var(--primary, #3b82f6);
                    color: white;
                }

                .step-label {
                    margin-left: 16px;
                    font-size: 14px;
                    font-weight: 500;
                    opacity: 0;
                    transform: translateX(-10px);
                    transition: all 0.2s;
                }

                .side-nav.expanded .step-label {
                    opacity: 1;
                    transform: translateX(0);
                    transition-delay: 0.1s;
                }
            `}</style>
        </aside>
    );
}
