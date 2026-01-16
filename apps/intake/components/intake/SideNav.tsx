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
            <div className="scroll-area">
                <div className="track-container">
                    <div className="track">
                        <div
                            className="progress-fill"
                            style={{ height: `${completionPercentage}%` }}
                        />
                    </div>
                </div>

                <div className="steps-container">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`step-item ${step.isActive ? 'active' : ''} ${step.isCompleted ? 'completed' : ''}`}
                        >
                            <div className="step-marker-wrapper">
                                <div className="step-marker">
                                    {step.isCompleted ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <span className="step-num">{index + 1}</span>
                                    )}
                                </div>
                            </div>
                            <div className="step-label">
                                {step.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .side-nav {
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 80px; /* Wider to avoid clipping */
                    background: rgba(5, 5, 10, 0.6);
                    backdrop-filter: blur(20px);
                    border-right: 1px solid var(--border);
                    z-index: 50;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                }

                .side-nav.expanded {
                    width: 260px;
                    background: rgba(10, 10, 15, 0.95);
                    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
                }

                .scroll-area {
                    flex: 1;
                    position: relative;
                    overflow-y: auto;
                    overflow-x: hidden;
                    width: 100%;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .scroll-area::-webkit-scrollbar {
                    display: none;
                }

                .track-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 80px; /* Match collapsed width */
                    pointer-events: none;
                    z-index: 0;
                }

                .track {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--border);
                    min-height: 100vh; /* Ensure it stretches */
                    opacity: 0.2;
                }

                .side-nav.expanded .track {
                    /* In expanded mode, move track to align with markers on left */
                    left: 40px; 
                    transform: translateX(-50%);
                    opacity: 1;
                }

                .progress-fill {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    background: linear-gradient(to bottom, var(--accent), var(--accent-light));
                    box-shadow: 0 0 10px var(--accent-glow);
                    transition: height 0.5s ease;
                }

                .steps-container {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    padding: 40px 0;
                }

                .step-item {
                    display: flex;
                    align-items: center;
                    height: 40px;
                    position: relative;
                    padding-left: 0; /* Centered by default via flex in container? No, let's use padding */
                }

                .step-marker-wrapper {
                    width: 80px; /* Fixed width matching collapsed nav */
                    display: flex;
                    justify-content: center;
                    flex-shrink: 0;
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
                    transition: all 0.3s;
                    z-index: 2;
                }

                .step-item.active .step-marker {
                    border-color: var(--accent-light);
                    color: white;
                    background: var(--accent);
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2), 0 0 20px var(--accent-glow);
                    transform: scale(1.15);
                }

                .step-item.completed .step-marker {
                    background: var(--accent-light);
                    border-color: var(--accent-light);
                    color: white;
                }

                .step-label {
                    margin-left: 0;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-1);
                    opacity: 0;
                    white-space: nowrap;
                    transform: translateX(-10px);
                    transition: all 0.2s;
                    pointer-events: none;
                }

                .side-nav.expanded .step-label {
                    opacity: 1;
                    transform: translateX(0);
                    transition-delay: 0.05s;
                    pointer-events: auto;
                }

                .step-item.active .step-label {
                    color: var(--text-0);
                    font-weight: 600;
                }
            `}</style>
        </aside>
    );
}
