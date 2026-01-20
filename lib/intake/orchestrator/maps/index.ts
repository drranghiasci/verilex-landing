/**
 * Orchestrator Maps Index
 *
 * Re-exports all step maps
 */

export {
    SCHEMA_STEPS,
    UI_STEPS,
    GATING_FIELDS,
    getSchemaStepConfig,
    getUiStepConfig,
    validateZip,
    validateEmail,
    validatePhone,
    ZIP_REGEX_5,
    ZIP_REGEX_9,
    EMAIL_REGEX,
    PHONE_REGEX,
    type SchemaStepKey,
    type UiStepKey,
    type SchemaStepConfig,
    type UiStepConfig,
    type ConditionalRequirement,
    type FieldValidation,
} from './divorce_custody.map';

export {
    CUSTODY_SCHEMA_STEPS,
    CUSTODY_UI_STEPS,
    getCustodySchemaStepConfig,
    getCustodyUiStepConfig,
    type CustodySchemaStepKey,
    type CustodyUiStepKey,
} from './custody_unmarried.map';

export {
    DIVORCE_NO_CHILDREN_SCHEMA_STEPS,
    DIVORCE_NO_CHILDREN_UI_STEPS,
    getDivorceNoChildrenSchemaStepConfig,
    getDivorceNoChildrenUiStepConfig,
    type DivorceNoChildrenSchemaStepKey,
    type DivorceNoChildrenUiStepKey,
} from './divorce_no_children.map';

export {
    DIVORCE_WITH_CHILDREN_SCHEMA_STEPS,
    DIVORCE_WITH_CHILDREN_UI_STEPS,
    getDivorceWithChildrenSchemaStepConfig,
    getDivorceWithChildrenUiStepConfig,
    type DivorceWithChildrenSchemaStepKey,
    type DivorceWithChildrenUiStepKey,
} from './divorce_with_children.map';
