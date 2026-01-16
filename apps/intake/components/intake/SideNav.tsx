import React from 'react';

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

export default function TopNav({ steps, currentStepIndex, completionPercentage }: SideNavProps) {
    return (
        <header className="top-nav">
            <div className="nav-content">
                <div className="brand-section">
                    <span className="brand-logo">VeriLex</span>
                    <span className="divider">/</span>
                    <span className="context">Intake</span>
                </div>

                <div className="steps-track">
                    <div className="steps-progress-bg">
                        <div
                            className="steps-progress-fill"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>

                    <div className="steps-nodes">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`step-node ${step.isActive ? 'active' : ''} ${step.isCompleted ? 'completed' : ''}`}
                            >
                                <div className="node-circle">
                                    {step.isCompleted ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <span className="node-label">{step.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .top-nav {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 64px;
                    background: rgba(10, 10, 15, 0.8);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
                    z-index: 50;
                    display: flex;
                    justify-content: center;
                }

                .nav-content {
                    width: 100%;
                    max-width: 1200px;
                    display: flex;
                    align-items: center;
                    padding: 0 24px;
                    gap: 40px;
                }

                .brand-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-0);
                    min-width: 120px;
                }

                .brand-logo { color: var(--text-0); }
                .divider { color: var(--text-2); }
                .context { color: var(--text-2); }

                .steps-track {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                    height: 32px;
                }

                .steps-progress-bg {
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: 50%;
                    height: 2px;
                    background: var(--surface-2);
                    transform: translateY(-50%);
                    z-index: 0;
                    border-radius: 2px;
                    overflow: hidden;
                }

                .steps-progress-fill {
                    height: 100%;
                    background: var(--accent);
                    transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 0 10px var(--accent-glow);
                }

                .steps-nodes {
                    position: relative;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    z-index: 1;
                }

                .step-node {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(10, 10, 15, 0.8); /* cutout effect */
                    padding: 0 8px;
                    border-radius: 12px;
                    transition: all 0.3s;
                    opacity: 0.5;
                }
                
                .step-node.active, .step-node.completed {
                    opacity: 1;
                }

                .node-circle {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--surface-1);
                    border: 2px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--text-2);
                    transition: all 0.3s;
                }

                .step-node.active .node-circle {
                    border-color: var(--accent);
                    background: var(--accent);
                    color: white;
                    transform: scale(1.1);
                    box-shadow: 0 0 10px var(--accent-glow);
                }

                .step-node.completed .node-circle {
                    border-color: var(--accent);
                    background: var(--accent);
                    color: white;
                }

                .node-label {
                    font-size: 12px;
                    font-weight: 500;
                    display: none; /* Hide labels by default on small screens/dense steps */
                }

                /* Show active step label */
                .step-node.active .node-label {
                    display: block;
                    color: var(--text-0);
                }
                
                @media (min-width: 1024px) {
                    .node-label {
                        display: block; /* Show all on desktop if space permits */
                    }
                    .step-node {
                        opacity: 0.7;
                    }
                    .step-node.active {
                        opacity: 1;
                    }
                }
            `}</style>
        </header>
    );
}
