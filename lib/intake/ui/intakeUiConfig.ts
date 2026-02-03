/**
 * Intake UI Configuration
 * 
 * SINGLE SOURCE OF TRUTH for intake-type-specific UI copy.
 * Includes welcome messages and human-friendly labels for each intake type.
 * 
 * This config is used by:
 * - GuidedChatPanel (welcome message)
 * - IntakeSidebar (step labels, filtered to intake type)
 * - IntakeSelector (intake type titles)
 */

export type IntakeType = 'custody_unmarried' | 'divorce_no_children' | 'divorce_with_children';

export type IntakeUiConfig = {
    /** Displayed as the header/title when chat starts */
    welcomeTitle: string;
    /** Short welcome body, reassuring, no legal advice, no overpromises */
    welcomeBody: string;
    /** Short description for selector cards */
    selectorDescription: string;
    /** Human-readable name for the intake type */
    displayName: string;
};

/**
 * UI configuration per intake type.
 * 
 * Note: Sidebar step labels are defined in the intake map files (UI_STEPS).
 * This config provides only the welcome copy and display names.
 */
export const INTAKE_UI_CONFIG: Record<IntakeType, IntakeUiConfig> = {
    custody_unmarried: {
        welcomeTitle: 'Child Custody Intake',
        welcomeBody: "I'll collect the details your firm needs to get started on your custody matter. This is not legal advice—I'm just recording information for your attorney.",
        selectorDescription: 'For custody and visitation matters between unmarried parents',
        displayName: 'Child Custody (Unmarried Parents)',
    },
    divorce_no_children: {
        welcomeTitle: 'Divorce Intake',
        welcomeBody: "I'll collect the details your firm needs to get started on your divorce. This is not legal advice—I'm just recording information for your attorney.",
        selectorDescription: 'For divorce matters without minor children',
        displayName: 'Divorce (No Minor Children)',
    },
    divorce_with_children: {
        welcomeTitle: 'Divorce Intake',
        welcomeBody: "I'll collect the details your firm needs to get started on your divorce and custody matters. This is not legal advice—I'm just recording information for your attorney.",
        selectorDescription: 'For divorce matters involving minor children',
        displayName: 'Divorce (With Minor Children)',
    },
};

/**
 * Get the UI config for an intake type.
 */
export function getIntakeUiConfig(intakeType: IntakeType): IntakeUiConfig {
    return INTAKE_UI_CONFIG[intakeType];
}

/**
 * Check if a string is a valid intake type.
 */
export function isValidIntakeType(type: unknown): type is IntakeType {
    return type === 'custody_unmarried' || type === 'divorce_no_children' || type === 'divorce_with_children';
}
