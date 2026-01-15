
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
    sidebar?: ReactNode; // New prop for the right sidebar
    sidebarOpen?: boolean;
};

export default function IntakeLayout({
    children,
    firmName,
    steps,
    currentStepIndex,
    completionPercentage,
    sidebar,
    sidebarOpen = true // Default to true if not passed
}: IntakeLayoutProps) {
    return (
        <div className="layout-roots">
            <SideNav
                steps={steps}
                currentStepIndex={currentStepIndex}
                completionPercentage={completionPercentage}
            />
            <main className="main-content">
                <header className="mobile-header">
                    <span className="brand">{firmName || 'VeriLex'}</span>
                </header>
                <div className="content-area">
                    {children}
                </div>
            </main>

            {/* The Right Sidebar Panel */}
            {sidebar && (
                <aside className="right-sidebar">
                    {sidebar}
                </aside>
            )}

            <style jsx>{`
                .layout-roots {
                    display: flex;
                    height: 100vh;
                    color: var(--text-0);
                    font-family: var(--font-sans);
                    overflow: hidden; /* Prevent body scroll */
                }

                .main-content {
                    flex: 1;
                    margin-left: 72px; /* Matches SideNav width */
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    /* Create space for right sidebar if present AND open */
                    margin-right: ${sidebar && sidebarOpen ? '320px' : '0'}; 
                    transition: margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .right-sidebar {
                    position: fixed;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 320px;
                    /* We don't set background here, let the child (IntakeSidebar) handle it */
                    z-index: 40;
                    pointer-events: none; /* Let clicks pass through if empty/transparent */
                }
                
                /* Allow clicks on children */
                .right-sidebar > * {
                    pointer-events: auto;
                }

                .content-area {
                    flex: 1;
                    position: relative;
                    overflow: hidden; 
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

                @media (max-width: 1024px) {
                    .main-content {
                        margin-right: 0 !important; /* Always 0 on mobile */
                    }
                    /* We don't hide .right-sidebar because IntakeSidebar manages its own off-canvas state */
                }
            `}</style>
        </div>
    );
}

