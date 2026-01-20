/**
 * Intake Orchestrator Module
 *
 * Provides deterministic step completion and progression for intake flow.
 */

export {
    // Step Map
    SCHEMA_STEPS,
    UI_STEPS,
    GATING_FIELDS,
    getSchemaStepConfig,
    getUiStepConfig,
    // Validators
    validateZip,
    validateEmail,
    validatePhone,
    ZIP_REGEX_5,
    ZIP_REGEX_9,
    EMAIL_REGEX,
    PHONE_REGEX,
    // Types
    type SchemaStepKey,
    type UiStepKey,
    type SchemaStepConfig,
    type UiStepConfig,
    type ConditionalRequirement,
    type FieldValidation,
} from './intakeStepMap';

export {
    orchestrateIntake,
    getChatPromptFields,
    needsGatingResolution,
    // Types
    type StepStatus,
    type SchemaStepStatus,
    type UiStepStatus,
    type OrchestratorResult,
} from './stepOrchestrator';

// Custody (Unmarried) Mode
export {
    CUSTODY_SCHEMA_STEPS,
    CUSTODY_UI_STEPS,
    getCustodySchemaStepConfig,
    getCustodyUiStepConfig,
    type CustodySchemaStepKey,
    type CustodyUiStepKey,
} from './custodyUnmarriedStepMap';

export {
    orchestrateCustodyIntake,
    getCustodyChatPromptFields,
    type CustodyStepStatus,
    type CustodySchemaStepStatus,
    type CustodyUiStepStatus,
    type CustodyOrchestratorResult,
} from './custodyUnmarriedOrchestrator';
