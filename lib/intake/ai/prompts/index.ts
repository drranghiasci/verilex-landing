/**
 * AI Prompts Index
 *
 * Re-exports all system prompt transformers
 */

export { transformSchemaToSystemPrompt } from './divorce_custody.system';

export { transformCustodySchemaToSystemPrompt } from './custody_unmarried.system';

export { transformDivorceNoChildrenSchemaToSystemPrompt } from './divorce_no_children.system';

export { transformDivorceWithChildrenSchemaToSystemPrompt } from './divorce_with_children.system';
