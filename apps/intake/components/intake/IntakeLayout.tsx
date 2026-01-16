
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
            <SideNav /* Actually TopNav now */
                steps={steps}
                currentStepIndex={currentStepIndex}
                completionPercentage={completionPercentage}
            />
            <main className="main-content">
                {/* Mobile header redundant if TopNav is always visible? 
                    Keep it for mobile specific branding if needed, 
                    but TopNav covers it. Let's hide mobile-header for now to avoid double header.
                 */}
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
                    flex-direction: column; /* Vertical layout main */
                    height: 100vh;
                    color: var(--text-0);
                    font-family: var(--font-sans);
                    overflow: hidden;
                    background: var(--bg); /* Ensure BG covers everything */
                }

                .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    margin-top: 64px; /* Space for TopNav */
                    width: 100%;
                }

                .right-sidebar {
                    position: fixed;
                    right: 0;
                    top: 64px; /* Below TopNav */
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
                    align-items: center; /* Center content container */
                }

                .content-container {
                    width: 100%;
                    max-width: 900px; /* Centered max width */
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }

                .mobile-header {
                    display: none; /* Hidden in favor of TopNav */
                }

                @media (max-width: 768px) {
                   /* Mobile tweaks */
                   .main-content {
                       margin-top: 64px; 
                   }
                }
            `}</style>
        </div>
    );
}

