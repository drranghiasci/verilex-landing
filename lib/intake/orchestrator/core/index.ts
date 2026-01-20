/**
 * Orchestrator Core Index
 *
 * Re-exports all orchestrator implementations
 */

export {
    orchestrateIntake,
    getChatPromptFields,
    needsGatingResolution,
    type StepStatus,
    type SchemaStepStatus,
    type UiStepStatus,
    type OrchestratorResult,
} from './divorce_custody.orchestrator';

export {
    orchestrateCustodyIntake,
    getCustodyChatPromptFields,
    type CustodyStepStatus,
    type CustodySchemaStepStatus,
    type CustodyUiStepStatus,
    type CustodyOrchestratorResult,
} from './custody_unmarried.orchestrator';

export {
    orchestrateDivorceNoChildrenIntake,
    getDivorceNoChildrenChatPromptFields,
    type DivorceNoChildrenStepStatus,
    type DivorceNoChildrenSchemaStepStatus,
    type DivorceNoChildrenUiStepStatus,
    type DivorceNoChildrenOrchestratorResult,
} from './divorce_no_children.orchestrator';

export {
    orchestrateDivorceWithChildrenIntake,
    getDivorceWithChildrenChatPromptFields,
    type DivorceWithChildrenStepStatus,
    type DivorceWithChildrenSchemaStepStatus,
    type DivorceWithChildrenUiStepStatus,
    type DivorceWithChildrenOrchestratorResult,
} from './divorce_with_children.orchestrator';
