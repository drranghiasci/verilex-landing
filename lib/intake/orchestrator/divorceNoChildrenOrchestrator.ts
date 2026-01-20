/**
 * Divorce (No Children) Orchestrator
 *
 * Mode-locked orchestrator for divorce without children.
 * Features:
 * - Children gate: stops flow if has_minor_children=true
 * - Assets/debts hard-block: requires status before proceeding
 * - Repeatable items gated by status field
 */

import {
    type DivorceNoChildrenSchemaStepKey,
    type DivorceNoChildrenUiStepKey,
    DIVORCE_NO_CHILDREN_SCHEMA_STEPS,
    DIVORCE_NO_CHILDREN_UI_STEPS,
    getDivorceNoChildrenSchemaStepConfig,
} from './divorceNoChildrenStepMap';

// ============================================================================
// TYPES
// ============================================================================

export type DivorceNoChildrenStepStatus = 'complete' | 'current' | 'incomplete' | 'skipped' | 'blocked';

export type DivorceNoChildrenSchemaStepStatus = {
    key: DivorceNoChildrenSchemaStepKey;
    status: DivorceNoChildrenStepStatus;
    isRequired: boolean;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
    gateError?: string;
};

export type DivorceNoChildrenUiStepStatus = {
    key: DivorceNoChildrenUiStepKey;
    label: string;
    status: DivorceNoChildrenStepStatus;
    isVisible: boolean;
    completionPercent: number;
};

export type DivorceNoChildrenOrchestratorResult = {
    schemaSteps: DivorceNoChildrenSchemaStepStatus[];
    uiSteps: DivorceNoChildrenUiStepStatus[];
    currentSchemaStep: DivorceNoChildrenSchemaStepKey;
    currentUiStep: DivorceNoChildrenUiStepKey;
    currentStepMissingFields: string[];
    currentStepValidationErrors: { field: string; message: string }[];
    totalCompletionPercent: number;
    completedSchemaSteps: DivorceNoChildrenSchemaStepKey[];
    readyForReview: boolean;
    intakeMode: 'divorce_no_children';
    /** If true, flow is blocked and client needs to be routed */
    flowBlocked: boolean;
    flowBlockedReason?: string;
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

function computeDivorceNoChildrenSchemaStepStatus(
    step: typeof DIVORCE_NO_CHILDREN_SCHEMA_STEPS[number],
    payload: Payload
): DivorceNoChildrenSchemaStepStatus {
    const missingFields: string[] = [];
    const validationErrors: { field: string; message: string }[] = [];
    let gateError: string | undefined;

    // Check gate first
    if (step.gateCheck) {
        const gateResult = step.gateCheck(payload);
        if (!gateResult.pass) {
            gateError = gateResult.errorMessage;
        }
    }

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

    // Check repeatable section requirements (gated by status)
    if (step.isRepeatable && step.repeatableRequiredFields && step.gatedByStatus) {
        const statusValue = payload[step.gatedByStatus.field];
        if (statusValue === step.gatedByStatus.requiredValue) {
            // Status indicates items are reported - require at least 1
            const firstField = step.repeatableRequiredFields[0];
            const items = toArray(payload[firstField]);
            if (items.length === 0) {
                missingFields.push(`${firstField} (at least 1 required)`);
            } else {
                // Check each item has required fields
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
        // If status is 'none_reported' or 'deferred_to_attorney', don't require items
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

    // Determine if step should be skipped based on gating
    const isSkipped = step.gatedByStatus
        ? payload[step.gatedByStatus.field] !== step.gatedByStatus.requiredValue
        : false;

    const isBlocked = !!gateError;
    const isComplete = !isBlocked && missingFields.length === 0 && validationErrors.length === 0;

    return {
        key: step.key,
        status: isBlocked ? 'blocked' : isSkipped ? 'skipped' : isComplete ? 'complete' : 'incomplete',
        isRequired: !isSkipped,
        missingFields,
        validationErrors,
        gateError,
    };
}

function computeDivorceNoChildrenUiStepStatus(
    uiStep: typeof DIVORCE_NO_CHILDREN_UI_STEPS[number],
    schemaStatuses: Map<DivorceNoChildrenSchemaStepKey, DivorceNoChildrenSchemaStepStatus>,
    currentSchemaStep: DivorceNoChildrenSchemaStepKey
): DivorceNoChildrenUiStepStatus {
    const schemaStepsForUi = uiStep.schemaSteps.map((key) => schemaStatuses.get(key)!);

    // Check if all steps are skipped
    const allSkipped = schemaStepsForUi.every((s) => s.status === 'skipped');

    const requiredSteps = schemaStepsForUi.filter((s) => s.isRequired);
    const completedSteps = requiredSteps.filter((s) => s.status === 'complete');
    const completionPercent = requiredSteps.length > 0
        ? Math.round((completedSteps.length / requiredSteps.length) * 100)
        : 100;

    // Check if any step is blocked
    const hasBlocked = schemaStepsForUi.some((s) => s.status === 'blocked');

    let status: DivorceNoChildrenStepStatus;
    if (hasBlocked) {
        status = 'blocked';
    } else if (allSkipped) {
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
        isVisible: true,
        completionPercent,
    };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export function orchestrateDivorceNoChildrenIntake(payload: Payload): DivorceNoChildrenOrchestratorResult {
    // 1. Compute status for each schema step
    const schemaSteps: DivorceNoChildrenSchemaStepStatus[] = DIVORCE_NO_CHILDREN_SCHEMA_STEPS.map((step) =>
        computeDivorceNoChildrenSchemaStepStatus(step, payload)
    );

    const schemaStatusMap = new Map<DivorceNoChildrenSchemaStepKey, DivorceNoChildrenSchemaStepStatus>();
    for (const status of schemaSteps) {
        schemaStatusMap.set(status.key, status);
    }

    // 2. Check for blocked flow (children gate)
    const childrenGateStatus = schemaStatusMap.get('children_gate');
    const flowBlocked = childrenGateStatus?.status === 'blocked';
    const flowBlockedReason = childrenGateStatus?.gateError;

    // 3. Determine current step (first incomplete required step, excluding final_review)
    let currentSchemaStep: DivorceNoChildrenSchemaStepKey = 'final_review';
    for (const status of schemaSteps) {
        if (status.key === 'final_review') continue;
        if (status.status === 'blocked') {
            currentSchemaStep = status.key;
            break;
        }
        if (status.isRequired && status.status !== 'complete' && status.status !== 'skipped') {
            currentSchemaStep = status.key;
            break;
        }
    }

    // 4. Mark current step status
    const currentStepStatus = schemaStatusMap.get(currentSchemaStep);
    if (currentStepStatus && currentStepStatus.status === 'incomplete') {
        currentStepStatus.status = 'current';
    }

    // 5. Compute UI step statuses
    const uiSteps: DivorceNoChildrenUiStepStatus[] = DIVORCE_NO_CHILDREN_UI_STEPS.map((uiStep) =>
        computeDivorceNoChildrenUiStepStatus(uiStep, schemaStatusMap, currentSchemaStep)
    );

    // 6. Determine current UI step
    let currentUiStep: DivorceNoChildrenUiStepKey = 'review';
    for (const uiStatus of uiSteps) {
        if (uiStatus.status === 'current' || uiStatus.status === 'blocked') {
            currentUiStep = uiStatus.key;
            break;
        }
    }

    // 7. Compute totals
    const requiredSchemaSteps = schemaSteps.filter(
        (s) => s.isRequired && s.key !== 'final_review' && s.status !== 'skipped'
    );
    const completedSchemaSteps = requiredSchemaSteps
        .filter((s) => s.status === 'complete')
        .map((s) => s.key);

    const totalCompletionPercent = requiredSchemaSteps.length > 0
        ? Math.round((completedSchemaSteps.length / requiredSchemaSteps.length) * 100)
        : 100;

    const readyForReview = !flowBlocked && requiredSchemaSteps.every((s) => s.status === 'complete');

    // 8. Get current step missing fields and errors
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
        intakeMode: 'divorce_no_children',
        flowBlocked,
        flowBlockedReason,
    };
}

/**
 * Get the list of fields the chat should ask about for the current step.
 */
export function getDivorceNoChildrenChatPromptFields(result: DivorceNoChildrenOrchestratorResult): {
    stepKey: DivorceNoChildrenSchemaStepKey;
    stepLabel: string;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
    flowBlocked: boolean;
    flowBlockedReason?: string;
} {
    const stepConfig = getDivorceNoChildrenSchemaStepConfig(result.currentSchemaStep);
    return {
        stepKey: result.currentSchemaStep,
        stepLabel: stepConfig?.key ?? result.currentSchemaStep,
        missingFields: result.currentStepMissingFields,
        validationErrors: result.currentStepValidationErrors,
        flowBlocked: result.flowBlocked,
        flowBlockedReason: result.flowBlockedReason,
    };
}
