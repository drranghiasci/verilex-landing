
import React, { ReactNode } from 'react';
import SideNav from './SideNav';

type StepInfo = {
    id: string;
    label: string;
    isCompleted: boolean;
    isActive: boolean;
};

type IntakeLayoutProps = {
    children: ReactNode;
    firmName?: string;
    steps: StepInfo[];
    currentStepIndex: number;
    completionPercentage: number;
};

export default function IntakeLayout({ children, firmName, steps, currentStepIndex, completionPercentage }: IntakeLayoutProps) {
    return (
        <div className="layout-roots">
            <SideNav
                steps={steps}
                currentStepIndex={currentStepIndex}
                completionPercentage={completionPercentage}
            />
            <main className="main-content">
                <header className="mobile-header">
                    {/* Minimal header for mobile or brand alignment */}
                    <span className="brand">{firmName || 'VeriLex'}</span>
                </header>
                <div className="content-area">
                    {children}
                </div>
            </main>

            <style jsx>{`
                .layout-roots {
                    display: flex;
                    height: 100vh;

                    color: var(--text-0);
                    font-family: var(--font-sans);
                }

                .main-content {
                    flex: 1;
                    margin-left: 64px; /* Matches SideNav collapsed width */
                    display: flex;
                    flex-direction: column;
                    transition: margin-left 0.3s;
                    position: relative;
                }

                .content-area {
                    flex: 1;
                    position: relative;
                    overflow: hidden; /* For scrolling internals */
                    display: flex;
                    flex-direction: column;
                }

                .mobile-header {
                    height: 60px;
                    display: flex;
                    align-items: center;
                    padding: 0 24px;
                    border-bottom: 1px solid var(--border);
                    background: rgba(10,10,10,0.5);
                    backdrop-filter: blur(10px);
                }

                .brand {
                    font-weight: 600;
                    letter-spacing: -0.02em;
                }
            `}</style>
        </div>
    );
}
