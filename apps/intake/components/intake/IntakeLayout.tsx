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
};

export default function IntakeLayout({
    children,
    firmName,
    firmWebsiteUrl,
    steps,
    currentStepIndex,
    completionPercentage,
}: IntakeLayoutProps) {
    return (
        <div className="min-h-screen bg-[var(--bg)] text-[color:var(--text-0)]">
            {/* Fixed Header - z-50 */}
            <IntakeHeader
                firmName={firmName}
                firmWebsiteUrl={firmWebsiteUrl}
            />

            {/* Main Layout Container - starts below fixed header */}
            <div className="flex min-h-screen pt-16">
                {/* Left Sidebar - Pipeline Progress */}
                <SideNav
                    steps={steps}
                    currentStepIndex={currentStepIndex}
                    completionPercentage={completionPercentage}
                />

                {/* Main Content Area */}
                <main className="flex flex-1 flex-col pl-16 md:pl-20">
                    <div className="flex flex-1 flex-col items-center">
                        <div className="w-full max-w-[900px] flex-1 flex flex-col">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
