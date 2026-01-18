
import React, { ReactNode } from 'react';
import SideNav from './SideNav';
import IntakeHeader from './IntakeHeader';

type StepInfo = {
    id: string;
    label: string;
    isCompleted: boolean;
    isActive: boolean;
};



type IntakeLayoutProps = {
    children: ReactNode;
    firmName?: string;
    firmWebsiteUrl?: string;
    steps: StepInfo[];
    currentStepIndex: number;
    completionPercentage: number;
    sidebar?: ReactNode;
    sidebarOpen?: boolean;
};

export default function IntakeLayout({
    children,
    firmName,
    firmWebsiteUrl,
    steps,
    currentStepIndex,
    completionPercentage,
    sidebar,
    sidebarOpen = true,
}: IntakeLayoutProps) {
    return (
        <div className="layout-roots">
            <SideNav
                steps={steps}
                currentStepIndex={currentStepIndex}
                completionPercentage={completionPercentage}
            />
            <main className="main-content">
                <IntakeHeader
                    firmName={firmName}
                    firmWebsiteUrl={firmWebsiteUrl}
                />
                <div className="content-area">
                    <div className="content-container">
                        {children}
                    </div>
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
                    /* flex-direction: row; Default is row, but explicit is good */
                    height: 100vh;
                    color: var(--text-0);
                    font-family: var(--font-sans);
                    overflow: hidden;
                    background: var(--bg);
                }

                .main-content {
                    flex: 1;
                    margin-left: 80px; /* Matches SideNav width (expanded to 80px for better fit) */
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    margin-top: 0;
                    width: auto;
                }

                .right-sidebar {
                    position: fixed;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    z-index: 40;
                    pointer-events: none;
                    display: flex;
                    justify-content: flex-end;
                }
                
                .right-sidebar > * {
                    pointer-events: auto;
                }

                .content-area {
                    flex: 1;
                    position: relative;
                    overflow: hidden; 
                    display: flex;
                    flex-direction: column;
                    align-items: center; 
                }

                .content-container {
                    width: 100%;
                    max-width: 900px; 
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }

                .mobile-header {
                    height: 60px;
                    display: flex;
                    align-items: center;
                    padding: 0 24px;
                    border-bottom: 1px solid var(--border);
                    background: rgba(10,10,10,0.5);
                    backdrop-filter: blur(10px);
                    display: none; /* Hide on desktop, show on mobile query below */
                }

                .brand {
                    font-weight: 600;
                    letter-spacing: -0.02em;
                }

                @media (max-width: 768px) {
                   .main-content {
                       margin-left: 0;
                       margin-top: 0; 
                   }
                   .mobile-header {
                       display: flex;
                   }
                }
            `}</style>
        </div>
    );
}

