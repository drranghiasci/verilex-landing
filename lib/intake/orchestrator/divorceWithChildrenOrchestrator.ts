/**
 * Divorce + Custody (Married Parents) Orchestrator
 *
 * Full-stack family law intake orchestrator.
 * Features:
 * - Children gate: has_minor_children must be true (else flow blocks)
 * - Children loop: requires exactly N child objects
 * - Assets/debts hard-block: requires status before proceeding
 * - Marriage/grounds required
 */

import {
    type DivorceWithChildrenSchemaStepKey,
    type DivorceWithChildrenUiStepKey,
    DIVORCE_WITH_CHILDREN_SCHEMA_STEPS,
    DIVORCE_WITH_CHILDREN_UI_STEPS,
    getDivorceWithChildrenSchemaStepConfig,
} from './divorceWithChildrenStepMap';

// ============================================================================
// TYPES
// ============================================================================

export type DivorceWithChildrenStepStatus = 'complete' | 'current' | 'incomplete' | 'skipped' | 'blocked';

export type DivorceWithChildrenSchemaStepStatus = {
    key: DivorceWithChildrenSchemaStepKey;
    status: DivorceWithChildrenStepStatus;
    isRequired: boolean;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
    gateError?: string;
};

export type DivorceWithChildrenUiStepStatus = {
    key: DivorceWithChildrenUiStepKey;
    label: string;
    status: DivorceWithChildrenStepStatus;
    isVisible: boolean;
    completionPercent: number;
};

export type DivorceWithChildrenOrchestratorResult = {
    schemaSteps: DivorceWithChildrenSchemaStepStatus[];
    uiSteps: DivorceWithChildrenUiStepStatus[];
    currentSchemaStep: DivorceWithChildrenSchemaStepKey;
    currentUiStep: DivorceWithChildrenUiStepKey;
    currentStepMissingFields: string[];
    currentStepValidationErrors: { field: string; message: string }[];
    totalCompletionPercent: number;
    completedSchemaSteps: DivorceWithChildrenSchemaStepKey[];
    readyForReview: boolean;
    intakeMode: 'divorce_with_children';
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

function computeSchemaStepStatus(
    step: typeof DIVORCE_WITH_CHILDREN_SCHEMA_STEPS[number],
    payload: Payload
): DivorceWithChildrenSchemaStepStatus {
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

    // Check repeatable section requirements
    if (step.isRepeatable && step.repeatableRequiredFields) {
        // For children: gated by children_count
        if (step.repeatableCountField) {
            const count = (payload[step.repeatableCountField] as number) || 0;
            if (count > 0) {
                for (const fieldKey of step.repeatableRequiredFields) {
                    const fieldItems = toArray(payload[fieldKey]);
                    if (fieldItems.length < count) {
                        missingFields.push(`${fieldKey} (need ${count}, have ${fieldItems.length})`);
                    } else {
                        for (let i = 0; i < count; i++) {
                            if (!hasValue(fieldItems[i])) {
                                missingFields.push(`${fieldKey}[${i}]`);
                            }
                        }
                    }
                }
            }
        }
        // For assets/debts: gated by status field
        else if (step.gatedByStatus) {
            const statusValue = payload[step.gatedByStatus.field];
            if (statusValue === step.gatedByStatus.requiredValue) {
                const firstField = step.repeatableRequiredFields[0];
                const items = toArray(payload[firstField]);
                if (items.length === 0) {
                    missingFields.push(`${firstField} (at least 1 required)`);
                } else {
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

    // Run validations
    for (const validation of step.validations) {
        const value = payload[validation.field];
        if (hasValue(value) && !validation.validator(value, payload)) {
            validationErrors.push({
                field: validation.field,
                message: validation.errorMessage,
            });
        }
    }

    // Determine if step should be skipped
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

function computeUiStepStatus(
    uiStep: typeof DIVORCE_WITH_CHILDREN_UI_STEPS[number],
    schemaStatuses: Map<DivorceWithChildrenSchemaStepKey, DivorceWithChildrenSchemaStepStatus>,
    currentSchemaStep: DivorceWithChildrenSchemaStepKey
): DivorceWithChildrenUiStepStatus {
    const schemaStepsForUi = uiStep.schemaSteps.map((key) => schemaStatuses.get(key)!);

    const allSkipped = schemaStepsForUi.every((s) => s.status === 'skipped');
    const requiredSteps = schemaStepsForUi.filter((s) => s.isRequired);
    const completedSteps = requiredSteps.filter((s) => s.status === 'complete');
    const completionPercent = requiredSteps.length > 0
        ? Math.round((completedSteps.length / requiredSteps.length) * 100)
        : 100;

    const hasBlocked = schemaStepsForUi.some((s) => s.status === 'blocked');

    let status: DivorceWithChildrenStepStatus;
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

export function orchestrateDivorceWithChildrenIntake(payload: Payload): DivorceWithChildrenOrchestratorResult {
    // 1. Compute status for each schema step
    const schemaSteps: DivorceWithChildrenSchemaStepStatus[] = DIVORCE_WITH_CHILDREN_SCHEMA_STEPS.map((step) =>
        computeSchemaStepStatus(step, payload)
    );

    const schemaStatusMap = new Map<DivorceWithChildrenSchemaStepKey, DivorceWithChildrenSchemaStepStatus>();
    for (const status of schemaSteps) {
        schemaStatusMap.set(status.key, status);
    }

    // 2. Check for blocked flow (children gate)
    const childrenGateStatus = schemaStatusMap.get('children_gate');
    const flowBlocked = childrenGateStatus?.status === 'blocked';
    const flowBlockedReason = childrenGateStatus?.gateError;

    // 3. Determine current step
    let currentSchemaStep: DivorceWithChildrenSchemaStepKey = 'final_review';
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
    const uiSteps: DivorceWithChildrenUiStepStatus[] = DIVORCE_WITH_CHILDREN_UI_STEPS.map((uiStep) =>
        computeUiStepStatus(uiStep, schemaStatusMap, currentSchemaStep)
    );

    // 6. Determine current UI step
    let currentUiStep: DivorceWithChildrenUiStepKey = 'review';
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
        intakeMode: 'divorce_with_children',
        flowBlocked,
        flowBlockedReason,
    };
}

/**
 * Get chat prompt fields for current step.
 */
export function getDivorceWithChildrenChatPromptFields(result: DivorceWithChildrenOrchestratorResult): {
    stepKey: DivorceWithChildrenSchemaStepKey;
    stepLabel: string;
    missingFields: string[];
    validationErrors: { field: string; message: string }[];
    flowBlocked: boolean;
    flowBlockedReason?: string;
} {
    const stepConfig = getDivorceWithChildrenSchemaStepConfig(result.currentSchemaStep);
    return {
        stepKey: result.currentSchemaStep,
        stepLabel: stepConfig?.key ?? result.currentSchemaStep,
        missingFields: result.currentStepMissingFields,
        validationErrors: result.currentStepValidationErrors,
        flowBlocked: result.flowBlocked,
        flowBlockedReason: result.flowBlockedReason,
    };
}
