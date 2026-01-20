/**
 * Step Orchestrator
 *
 * Deterministically computes:
 * 1. Which schema steps are required (based on gating fields)
 * 2. Which steps are complete (based on field presence + validation)
 * 3. Current step (first incomplete required step)
 * 4. Missing fields for current step
 *
 * This is the SINGLE SOURCE OF TRUTH for intake progression.
 * Chat and UI must read from orchestrator output, not compute independently.
 */

import {
    type SchemaStepKey,
    type UiStepKey,
    SCHEMA_STEPS,
    UI_STEPS,
    GATING_FIELDS,
    getSchemaStepConfig,
} from '../maps/divorce_custody.map';

// ============================================================================
// TYPES
// ============================================================================

export type StepStatus = 'complete' | 'current' | 'incomplete' | 'skipped';

export type SchemaStepStatus = {
    key: SchemaStepKey;
    status: StepStatus;
    isRequired: boolean;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
};

export type UiStepStatus = {
    key: UiStepKey;
    label: string;
    status: StepStatus;
    isVisible: boolean;
    completionPercent: number;
};

export type OrchestratorResult = {
    /** All schema step statuses */
    schemaSteps: SchemaStepStatus[];
    /** UI step statuses (derived from schema steps) */
    uiSteps: UiStepStatus[];
    /** Current schema step key (first incomplete required step) */
    currentSchemaStep: SchemaStepKey;
    /** Current UI step key (derived from current schema step) */
    currentUiStep: UiStepKey;
    /** Fields missing in the current step */
    currentStepMissingFields: string[];
    /** Validation errors in the current step */
    currentStepValidationErrors: { field: string; message: string }[];
    /** All gating field values */
    gatingFieldValues: Record<string, boolean | undefined>;
    /** Overall completion percentage */
    totalCompletionPercent: number;
    /** List of completed schema step keys */
    completedSchemaSteps: SchemaStepKey[];
    /** Whether all required steps are complete (ready for review) */
    readyForReview: boolean;
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

function getGatingFieldValue(gatingKey: keyof typeof GATING_FIELDS, payload: Payload): boolean | undefined {
    const fieldKey = GATING_FIELDS[gatingKey].field;
    const value = payload[fieldKey];
    if (typeof value === 'boolean') return value;
    return undefined;
}

function isStepRequired(step: typeof SCHEMA_STEPS[number], payload: Payload): boolean {
    if (!step.gatedBy) return true;
    const gatingValue = getGatingFieldValue(step.gatedBy, payload);
    // If gating field is not yet answered, step is potentially required (don't skip)
    if (gatingValue === undefined) return true;
    // If gating field is false, step is not required
    return gatingValue === true;
}

// ============================================================================
// STEP COMPLETION COMPUTATION
// ============================================================================

function computeSchemaStepStatus(step: typeof SCHEMA_STEPS[number], payload: Payload): SchemaStepStatus {
    const isRequired = isStepRequired(step, payload);

    // If not required (gated out), mark as skipped
    if (!isRequired) {
        return {
            key: step.key,
            status: 'skipped',
            isRequired: false,
            missingFields: [],
            validationErrors: [],
        };
    }

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

    // Check repeatable section requirements
    if (step.isRepeatable && step.repeatableRequiredFields && step.repeatableRequiredFields.length > 0) {
        // For repeatable sections with a gating field, we need at least one complete object
        // But if gated to true, we require at least one item
        if (step.gatedBy) {
            const gatingValue = getGatingFieldValue(step.gatedBy, payload);
            if (gatingValue === true) {
                // Check if at least one complete object exists
                const firstField = step.repeatableRequiredFields[0];
                const items = toArray(payload[firstField]);
                if (items.length === 0) {
                    missingFields.push(firstField);
                } else {
                    // Check each required field has matching items
                    for (const fieldKey of step.repeatableRequiredFields) {
                        const fieldItems = toArray(payload[fieldKey]);
                        for (let i = 0; i < items.length; i++) {
                            if (!hasValue(fieldItems[i])) {
                                missingFields.push(`${fieldKey}[${i}]`);
                            }
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

    // Also check conditional validations
    for (const cond of step.conditionalRequired) {
        if (cond.condition(payload)) {
            const matchingValidation = step.validations.find((v) => v.field === cond.field);
            if (matchingValidation) {
                const value = payload[cond.field];
                if (hasValue(value) && !matchingValidation.validator(value, payload)) {
                    if (!validationErrors.some((e) => e.field === cond.field)) {
                        validationErrors.push({
                            field: cond.field,
                            message: matchingValidation.errorMessage,
                        });
                    }
                }
            }
        }
    }

    const isComplete = missingFields.length === 0 && validationErrors.length === 0;

    return {
        key: step.key,
        status: isComplete ? 'complete' : 'incomplete',
        isRequired: true,
        missingFields,
        validationErrors,
    };
}

function computeUiStepStatus(
    uiStep: typeof UI_STEPS[number],
    schemaStatuses: Map<SchemaStepKey, SchemaStepStatus>,
    currentSchemaStep: SchemaStepKey,
): UiStepStatus {
    const schemaStepsForUi = uiStep.schemaSteps.map((key) => schemaStatuses.get(key)!);

    // Check if all schema steps are skipped (gated out)
    const allSkipped = schemaStepsForUi.every((s) => s.status === 'skipped');
    const isVisible = !uiStep.hideWhenAllGated || !allSkipped;

    // Compute completion
    const requiredSteps = schemaStepsForUi.filter((s) => s.isRequired);
    const completedSteps = requiredSteps.filter((s) => s.status === 'complete');
    const completionPercent = requiredSteps.length > 0
        ? Math.round((completedSteps.length / requiredSteps.length) * 100)
        : 100;

    // Determine status
    let status: StepStatus;
    if (allSkipped) {
        status = 'skipped';
    } else if (uiStep.schemaSteps.includes(currentSchemaStep)) {
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
        isVisible,
        completionPercent,
    };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export function orchestrateIntake(payload: Payload): OrchestratorResult {
    // 1. Collect gating field values
    const gatingFieldValues: Record<string, boolean | undefined> = {};
    for (const [gatingKey] of Object.entries(GATING_FIELDS)) {
        gatingFieldValues[gatingKey] = getGatingFieldValue(gatingKey as keyof typeof GATING_FIELDS, payload);
    }

    // 2. Compute status for each schema step
    const schemaSteps: SchemaStepStatus[] = SCHEMA_STEPS.map((step) =>
        computeSchemaStepStatus(step, payload)
    );

    const schemaStatusMap = new Map<SchemaStepKey, SchemaStepStatus>();
    for (const status of schemaSteps) {
        schemaStatusMap.set(status.key, status);
    }

    // 3. Determine current step (first incomplete required step, excluding final_review)
    let currentSchemaStep: SchemaStepKey = 'final_review';
    for (const status of schemaSteps) {
        if (status.key === 'final_review') continue;
        if (status.isRequired && status.status !== 'complete') {
            currentSchemaStep = status.key;
            break;
        }
    }

    // 4. Mark current step status
    const currentStepStatus = schemaStatusMap.get(currentSchemaStep);
    if (currentStepStatus && currentStepStatus.status !== 'skipped') {
        currentStepStatus.status = 'current';
    }

    // 5. Compute UI step statuses
    const uiSteps: UiStepStatus[] = UI_STEPS.map((uiStep) =>
        computeUiStepStatus(uiStep, schemaStatusMap, currentSchemaStep)
    );

    // 6. Determine current UI step
    let currentUiStep: UiStepKey = 'review';
    for (const uiStatus of uiSteps) {
        if (uiStatus.status === 'current') {
            currentUiStep = uiStatus.key;
            break;
        }
    }

    // 7. Compute totals
    const requiredSchemaSteps = schemaSteps.filter((s) => s.isRequired && s.key !== 'final_review');
    const completedSchemaSteps = requiredSchemaSteps
        .filter((s) => s.status === 'complete')
        .map((s) => s.key);

    const totalCompletionPercent = requiredSchemaSteps.length > 0
        ? Math.round((completedSchemaSteps.length / requiredSchemaSteps.length) * 100)
        : 100;

    const readyForReview = requiredSchemaSteps.every((s) => s.status === 'complete');

    // 8. Get current step missing fields and errors
    const currentStepConfig = getSchemaStepConfig(currentSchemaStep);
    const currentStepMissingFields = currentStepStatus?.missingFields ?? [];
    const currentStepValidationErrors = currentStepStatus?.validationErrors ?? [];

    return {
        schemaSteps,
        uiSteps,
        currentSchemaStep,
        currentUiStep,
        currentStepMissingFields,
        currentStepValidationErrors,
        gatingFieldValues,
        totalCompletionPercent,
        completedSchemaSteps,
        readyForReview,
    };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get the list of fields the chat should ask about for the current step.
 * This constrains the AI to only ask relevant questions.
 */
export function getChatPromptFields(result: OrchestratorResult): {
    stepKey: SchemaStepKey;
    stepLabel: string;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
} {
    const stepConfig = getSchemaStepConfig(result.currentSchemaStep);
    return {
        stepKey: result.currentSchemaStep,
        stepLabel: stepConfig?.key ?? result.currentSchemaStep,
        missingFields: result.currentStepMissingFields,
        validationErrors: result.currentStepValidationErrors,
    };
}

/**
 * Check if a specific gating field needs to be resolved.
 * Returns true if the gating field is undefined (not yet answered).
 */
export function needsGatingResolution(result: OrchestratorResult): string[] {
    const unresolved: string[] = [];
    for (const [key, value] of Object.entries(result.gatingFieldValues)) {
        if (value === undefined) {
            unresolved.push(GATING_FIELDS[key as keyof typeof GATING_FIELDS].field);
        }
    }
    return unresolved;
}
