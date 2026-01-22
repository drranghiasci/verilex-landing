/**
 * Hook: Use Intake Steps from Registry + Orchestrator State
 * 
 * Derives sidebar steps from:
 * - intake_type → registry UI steps
 * - current_step_key → active step
 * - step_status → completion state
 */

import { useMemo } from 'react';
import {
    buildSidebarSteps,
    isValidIntakeType,
    type IntakeType,
} from '../../../../lib/intake/orchestrator/registry';

export type OrchestratorState = {
    intakeType: IntakeType | null | undefined;
    currentStepKey: string | null | undefined;
    stepStatus: Record<string, { status: string }> | null | undefined;
    completionPercent?: number;
    readyForReview?: boolean;
};

export type SidebarStep = {
    id: string;
    label: string;
    isCompleted: boolean;
    isActive: boolean;
};

/**
 * Build sidebar steps from intake type and orchestrator state.
 * Returns empty array if intake_type is not set (selector phase).
 */
export function useIntakeSteps(state: OrchestratorState): {
    steps: SidebarStep[];
    currentStepIndex: number;
    completionPercent: number;
    readyForReview: boolean;
    hasIntakeType: boolean;
} {
    const { intakeType, currentStepKey, stepStatus, completionPercent, readyForReview } = state;

    const hasIntakeType = isValidIntakeType(intakeType);

    const steps = useMemo(() => {
        if (!hasIntakeType) return [];
        const result = buildSidebarSteps(
            intakeType as IntakeType,
            currentStepKey ?? '',
            stepStatus ?? {},
        );
        // Debug: log step completion state
        console.log('[useIntakeSteps] stepStatus:', stepStatus);
        console.log('[useIntakeSteps] steps:', result.map(s => ({ id: s.id, isCompleted: s.isCompleted })));
        return result;
    }, [hasIntakeType, intakeType, currentStepKey, stepStatus]);

    const currentStepIndex = useMemo(() => {
        const idx = steps.findIndex(s => s.isActive);
        return idx >= 0 ? idx : 0;
    }, [steps]);

    // Calculate completion from completed steps
    const calculatedCompletion = useMemo(() => {
        if (!steps.length) return 0;
        const completed = steps.filter(s => s.isCompleted).length;
        return Math.round((completed / steps.length) * 100);
    }, [steps]);

    return {
        steps,
        currentStepIndex,
        completionPercent: completionPercent ?? calculatedCompletion,
        readyForReview: readyForReview ?? false,
        hasIntakeType,
    };
}
