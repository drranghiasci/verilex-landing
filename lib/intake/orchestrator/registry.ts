/**
 * Intake Orchestrator Registry
 * 
 * SINGLE SOURCE OF TRUTH for intake_type → resources.
 * All UI and backend code must use this registry to ensure correct mapping.
 */

import {
    CUSTODY_SCHEMA_STEPS,
    CUSTODY_UI_STEPS,
    getCustodySchemaStepConfig,
    getCustodyUiStepConfig,
    type CustodySchemaStepKey,
    type CustodyUiStepKey,
} from './maps/custody_unmarried.map';

import {
    DIVORCE_NO_CHILDREN_SCHEMA_STEPS,
    DIVORCE_NO_CHILDREN_UI_STEPS,
    getDivorceNoChildrenSchemaStepConfig,
    getDivorceNoChildrenUiStepConfig,
    type DivorceNoChildrenSchemaStepKey,
    type DivorceNoChildrenUiStepKey,
} from './maps/divorce_no_children.map';

import {
    DIVORCE_WITH_CHILDREN_SCHEMA_STEPS,
    DIVORCE_WITH_CHILDREN_UI_STEPS,
    getDivorceWithChildrenSchemaStepConfig,
    getDivorceWithChildrenUiStepConfig,
    type DivorceWithChildrenSchemaStepKey,
    type DivorceWithChildrenUiStepKey,
} from './maps/divorce_with_children.map';

import { transformCustodySchemaToSystemPrompt } from '../ai/prompts/custody_unmarried.system';
import { transformDivorceNoChildrenSchemaToSystemPrompt } from '../ai/prompts/divorce_no_children.system';
import { transformDivorceWithChildrenSchemaToSystemPrompt } from '../ai/prompts/divorce_with_children.system';

// ============================================================================
// TYPES
// ============================================================================

export type IntakeType = 'custody_unmarried' | 'divorce_no_children' | 'divorce_with_children';

export type UiStepInfo = {
    key: string;
    label: string;
    schemaSteps: string[];
};

export type SchemaStepInfo = {
    key: string;
    requiredFields: string[];
    conditionalRequired: Array<{ field: string; condition: (p: Record<string, unknown>) => boolean }>;
    validations: Array<{ field: string; validator: (v: unknown, p: Record<string, unknown>) => boolean; errorMessage: string }>;
    isRepeatable?: boolean;
};

// ============================================================================
// REGISTRY FUNCTIONS
// ============================================================================

/**
 * Get the UI step configuration for an intake type.
 * These are the steps shown in the sidebar.
 */
export function getUiSteps(intakeType: IntakeType): UiStepInfo[] {
    switch (intakeType) {
        case 'custody_unmarried':
            return CUSTODY_UI_STEPS.map(step => ({
                key: step.key,
                label: step.label,
                schemaSteps: step.schemaSteps as string[],
            }));
        case 'divorce_no_children':
            return DIVORCE_NO_CHILDREN_UI_STEPS.map(step => ({
                key: step.key,
                label: step.label,
                schemaSteps: step.schemaSteps as string[],
            }));
        case 'divorce_with_children':
            return DIVORCE_WITH_CHILDREN_UI_STEPS.map(step => ({
                key: step.key,
                label: step.label,
                schemaSteps: step.schemaSteps as string[],
            }));
        default: {
            const _exhaustive: never = intakeType;
            throw new Error(`Unknown intake type: ${_exhaustive}`);
        }
    }
}

/**
 * Get the schema step configuration for an intake type.
 * These define required fields and validations per step.
 */
export function getSchemaSteps(intakeType: IntakeType): SchemaStepInfo[] {
    switch (intakeType) {
        case 'custody_unmarried':
            return CUSTODY_SCHEMA_STEPS as SchemaStepInfo[];
        case 'divorce_no_children':
            return DIVORCE_NO_CHILDREN_SCHEMA_STEPS as SchemaStepInfo[];
        case 'divorce_with_children':
            return DIVORCE_WITH_CHILDREN_SCHEMA_STEPS as SchemaStepInfo[];
        default: {
            const _exhaustive: never = intakeType;
            throw new Error(`Unknown intake type: ${_exhaustive}`);
        }
    }
}

/**
 * Transformer function signature for system prompts.
 */
export type PromptTransformerFn = (
    payload: Record<string, unknown>,
    currentSectionId: string,
    missingFields?: string[],
    flowBlocked?: boolean,
    flowBlockedReason?: string,
) => string;

/**
 * Get the system prompt transformer for an intake type.
 */
export function getSystemPromptTransformer(intakeType: IntakeType): PromptTransformerFn {
    switch (intakeType) {
        case 'custody_unmarried':
            return transformCustodySchemaToSystemPrompt;
        case 'divorce_no_children':
            return transformDivorceNoChildrenSchemaToSystemPrompt;
        case 'divorce_with_children':
            return transformDivorceWithChildrenSchemaToSystemPrompt;
        default: {
            const _exhaustive: never = intakeType;
            throw new Error(`Unknown intake type: ${_exhaustive}`);
        }
    }
}

/**
 * Find which UI step contains a given schema step key.
 * Returns the UI step index (0-based) or -1 if not found.
 */
export function findUiStepForSchemaStep(intakeType: IntakeType, schemaStepKey: string): number {
    const uiSteps = getUiSteps(intakeType);
    return uiSteps.findIndex(uiStep => uiStep.schemaSteps.includes(schemaStepKey));
}

/**
 * Determine if a UI step is complete based on step_status.
 * A UI step is complete only if ALL of its underlying schema steps are marked 'complete'.
 * Returns false if any schema step has no entry in step_status.
 */
export function isUiStepComplete(
    intakeType: IntakeType,
    uiStepKey: string,
    stepStatus: Record<string, { status: string }>
): boolean {
    const uiSteps = getUiSteps(intakeType);
    const uiStep = uiSteps.find(s => s.key === uiStepKey);
    if (!uiStep) return false;

    // Must have at least one schema step to check
    if (uiStep.schemaSteps.length === 0) return false;

    return uiStep.schemaSteps.every(schemaKey => {
        const entry = stepStatus[schemaKey];
        // No entry means step hasn't been visited/completed
        if (!entry) return false;
        return entry.status === 'complete';
    });
}

/**
 * Build sidebar steps from intake type and orchestrator state.
 */
export function buildSidebarSteps(
    intakeType: IntakeType,
    currentSchemaStep: string,
    stepStatus: Record<string, { status: string }>
): Array<{ id: string; label: string; isCompleted: boolean; isActive: boolean }> {
    const uiSteps = getUiSteps(intakeType);
    const currentUiStepIndex = findUiStepForSchemaStep(intakeType, currentSchemaStep);

    return uiSteps.map((step, index) => ({
        id: step.key,
        label: step.label,
        isCompleted: isUiStepComplete(intakeType, step.key, stepStatus),
        isActive: index === currentUiStepIndex,
    }));
}

/**
 * Validate that an intake type is valid.
 */
export function isValidIntakeType(type: unknown): type is IntakeType {
    return type === 'custody_unmarried' || type === 'divorce_no_children' || type === 'divorce_with_children';
}

/**
 * Get the first schema step key for an intake type.
 */
export function getFirstSchemaStep(intakeType: IntakeType): string {
    const schemaSteps = getSchemaSteps(intakeType);
    return schemaSteps[0]?.key ?? '';
}

/**
 * Check if children status matches intake type.
 * Returns { valid: true } or { valid: false, suggestedType: IntakeType }
 */
export function validateIntakeTypePosture(
    intakeType: IntakeType,
    payload: Record<string, unknown>
): { valid: true } | { valid: false; suggestedType: IntakeType; reason: string } {
    const hasChildren = payload.has_children === true || payload.has_minor_children === true;
    const childrenCount = typeof payload.children_count === 'number' ? payload.children_count : 0;

    if (intakeType === 'divorce_no_children') {
        if (hasChildren || childrenCount > 0) {
            return {
                valid: false,
                suggestedType: 'divorce_with_children',
                reason: 'Intake indicates children present. Use divorce with children intake.',
            };
        }
    }

    if (intakeType === 'divorce_with_children') {
        if (!hasChildren && childrenCount === 0) {
            return {
                valid: false,
                suggestedType: 'divorce_no_children',
                reason: 'No children indicated. Use divorce without children intake.',
            };
        }
    }

    // custody_unmarried requires children
    if (intakeType === 'custody_unmarried') {
        if (!hasChildren && childrenCount === 0) {
            // For custody, we can't proceed without children
            return {
                valid: false,
                suggestedType: 'divorce_no_children',
                reason: 'Custody intake requires children. Please select a different intake type.',
            };
        }
    }

    return { valid: true };
}
