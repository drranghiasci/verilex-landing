/**
 * Custody (Unmarried) Orchestrator
 *
 * Mode-locked orchestrator for custody intake.
 * Uses custody-specific step map instead of divorce step map.
 */

import {
    type CustodySchemaStepKey,
    type CustodyUiStepKey,
    CUSTODY_SCHEMA_STEPS,
    CUSTODY_UI_STEPS,
    getCustodySchemaStepConfig,
} from '../maps/custody_unmarried.map';

// ============================================================================
// TYPES
// ============================================================================

export type CustodyStepStatus = 'complete' | 'current' | 'incomplete' | 'skipped';

export type CustodySchemaStepStatus = {
    key: CustodySchemaStepKey;
    status: CustodyStepStatus;
    isRequired: boolean;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
};

export type CustodyUiStepStatus = {
    key: CustodyUiStepKey;
    label: string;
    status: CustodyStepStatus;
    isVisible: boolean;
    completionPercent: number;
};

export type CustodyOrchestratorResult = {
    schemaSteps: CustodySchemaStepStatus[];
    uiSteps: CustodyUiStepStatus[];
    currentSchemaStep: CustodySchemaStepKey;
    currentUiStep: CustodyUiStepKey;
    currentStepMissingFields: string[];
    currentStepValidationErrors: { field: string; message: string }[];
    totalCompletionPercent: number;
    completedSchemaSteps: CustodySchemaStepKey[];
    readyForReview: boolean;
    intakeMode: 'custody_unmarried';
};

// ============================================================================
// HELPERS
// ============================================================================

type Payload = Record<string, unknown>;

function hasValue(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
        return Object.values(value).some((v) => hasValue(v));
    }
    return false;
}

function toArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
}

// ============================================================================
// STEP COMPLETION COMPUTATION
// ============================================================================

function computeCustodySchemaStepStatus(
    step: typeof CUSTODY_SCHEMA_STEPS[number],
    payload: Payload
): CustodySchemaStepStatus {
    const missingFields: string[] = [];
    const validationErrors: { field: string; message: string }[] = [];

    // Check required fields
    for (const fieldKey of step.requiredFields) {
        if (!hasValue(payload[fieldKey])) {
            missingFields.push(fieldKey);
        }
    }

    // Check conditional required fields
    for (const cond of step.conditionalRequired) {
        if (cond.condition(payload) && !hasValue(payload[cond.field])) {
            missingFields.push(cond.field);
        }
    }

    // Check repeatable section requirements (children)
    if (step.isRepeatable && step.repeatableRequiredFields && step.repeatableRequiredFields.length > 0) {
        const childrenCount = (payload.children_count as number) || 0;
        if (childrenCount > 0) {
            for (const fieldKey of step.repeatableRequiredFields) {
                const fieldItems = toArray(payload[fieldKey]);
                // Need at least children_count items
                if (fieldItems.length < childrenCount) {
                    missingFields.push(`${fieldKey} (need ${childrenCount} items, have ${fieldItems.length})`);
                } else {
                    // Check each item has a value
                    for (let i = 0; i < childrenCount; i++) {
                        if (!hasValue(fieldItems[i])) {
                            missingFields.push(`${fieldKey}[${i}]`);
                        }
                    }
                }
            }
        }
    }

    // Run validations (only on fields that have values)
    for (const validation of step.validations) {
        const value = payload[validation.field];
        if (hasValue(value) && !validation.validator(value, payload)) {
            validationErrors.push({
                field: validation.field,
                message: validation.errorMessage,
            });
        }
    }

    const isComplete = missingFields.length === 0 && validationErrors.length === 0;

    return {
        key: step.key,
        status: isComplete ? 'complete' : 'incomplete',
        isRequired: true, // All custody steps are required (no gating in this mode)
        missingFields,
        validationErrors,
    };
}

function computeCustodyUiStepStatus(
    uiStep: typeof CUSTODY_UI_STEPS[number],
    schemaStatuses: Map<CustodySchemaStepKey, CustodySchemaStepStatus>,
    currentSchemaStep: CustodySchemaStepKey
): CustodyUiStepStatus {
    const schemaStepsForUi = uiStep.schemaSteps.map((key) => schemaStatuses.get(key)!);

    const requiredSteps = schemaStepsForUi.filter((s) => s.isRequired);
    const completedSteps = requiredSteps.filter((s) => s.status === 'complete');
    const completionPercent = requiredSteps.length > 0
        ? Math.round((completedSteps.length / requiredSteps.length) * 100)
        : 100;

    let status: CustodyStepStatus;
    if (uiStep.schemaSteps.includes(currentSchemaStep)) {
        status = 'current';
    } else if (completionPercent === 100) {
        status = 'complete';
    } else {
        status = 'incomplete';
    }

    return {
        key: uiStep.key,
        label: uiStep.label,
        status,
        isVisible: true, // All steps visible in custody intake
        completionPercent,
    };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export function orchestrateCustodyIntake(payload: Payload): CustodyOrchestratorResult {
    // 1. Compute status for each schema step
    const schemaSteps: CustodySchemaStepStatus[] = CUSTODY_SCHEMA_STEPS.map((step) =>
        computeCustodySchemaStepStatus(step, payload)
    );

    const schemaStatusMap = new Map<CustodySchemaStepKey, CustodySchemaStepStatus>();
    for (const status of schemaSteps) {
        schemaStatusMap.set(status.key, status);
    }

    // 2. Determine current step (first incomplete required step, excluding final_review)
    let currentSchemaStep: CustodySchemaStepKey = 'final_review';
    for (const status of schemaSteps) {
        if (status.key === 'final_review') continue;
        if (status.isRequired && status.status !== 'complete') {
            currentSchemaStep = status.key;
            break;
        }
    }

    // 3. Mark current step status
    const currentStepStatus = schemaStatusMap.get(currentSchemaStep);
    if (currentStepStatus && currentStepStatus.status !== 'skipped') {
        currentStepStatus.status = 'current';
    }

    // 4. Compute UI step statuses
    const uiSteps: CustodyUiStepStatus[] = CUSTODY_UI_STEPS.map((uiStep) =>
        computeCustodyUiStepStatus(uiStep, schemaStatusMap, currentSchemaStep)
    );

    // 5. Determine current UI step
    let currentUiStep: CustodyUiStepKey = 'review';
    for (const uiStatus of uiSteps) {
        if (uiStatus.status === 'current') {
            currentUiStep = uiStatus.key;
            break;
        }
    }

    // 6. Compute totals
    const requiredSchemaSteps = schemaSteps.filter((s) => s.isRequired && s.key !== 'final_review');
    const completedSchemaSteps = requiredSchemaSteps
        .filter((s) => s.status === 'complete')
        .map((s) => s.key);

    const totalCompletionPercent = requiredSchemaSteps.length > 0
        ? Math.round((completedSchemaSteps.length / requiredSchemaSteps.length) * 100)
        : 100;

    const readyForReview = requiredSchemaSteps.every((s) => s.status === 'complete');

    // 7. Get current step missing fields and errors
    const currentStepMissingFields = currentStepStatus?.missingFields ?? [];
    const currentStepValidationErrors = currentStepStatus?.validationErrors ?? [];

    return {
        schemaSteps,
        uiSteps,
        currentSchemaStep,
        currentUiStep,
        currentStepMissingFields,
        currentStepValidationErrors,
        totalCompletionPercent,
        completedSchemaSteps,
        readyForReview,
        intakeMode: 'custody_unmarried',
    };
}

/**
 * Get the list of fields the chat should ask about for the current step.
 */
export function getCustodyChatPromptFields(result: CustodyOrchestratorResult): {
    stepKey: CustodySchemaStepKey;
    stepLabel: string;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
} {
    const stepConfig = getCustodySchemaStepConfig(result.currentSchemaStep);
    return {
        stepKey: result.currentSchemaStep,
        stepLabel: stepConfig?.key ?? result.currentSchemaStep,
        missingFields: result.currentStepMissingFields,
        validationErrors: result.currentStepValidationErrors,
    };
}
