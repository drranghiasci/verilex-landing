export const PROGRESS_STEPS_CONFIG: Record<string, string> = {
    // System / Hidden
    matter_metadata: "Basics",

    // Core Identity
    client_identity: "About You",
    opposing_party: "Other Party",

    // Divorce Specifics
    marriage_details: "Marriage Info",
    separation_grounds: "Separation",

    // Children
    child_object: "Children",
    children_custody: "Custody",

    // Financials
    asset_object: "Assets",
    debt_object: "Debts",
    income_support: "Income & Support",

    // Legal / Risk
    domestic_violence_risk: "Safety",
    jurisdiction_venue: "Legal Venue",
    prior_legal_actions: "Legal History",
    desired_outcomes: "Goals",
    evidence_documents: "Documents",

    // Final
    final_review: "Review",
};

export function getFriendlyStepLabel(sectionId: string): string {
    return PROGRESS_STEPS_CONFIG[sectionId] || "Details"; // Fallback
}
