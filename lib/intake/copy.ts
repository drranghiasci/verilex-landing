export const COUNTY_WARNING_COPY = {
  mismatch: {
    message:
      'You selected a different county for filing than your current county. That can be okay, but it may affect where the case is filed. If you are unsure, keep your best guess - your attorney will review it.',
  },
  lowResidency: {
    message:
      'You entered less than 6 months of residency. This may affect filing requirements. Please continue - your attorney will review.',
  },
  opposingOutOfState: {
    message:
      'You indicated the other party may not live in Georgia. That can affect where a case is filed or served. Please continue - your attorney will review.',
  },
};

export const SAFETY_BANNER_COPY = {
  immediate: {
    title: 'Immediate safety',
    lines: [
      'Please call **911** immediately if you are in danger.',
      'This intake session is paused, if you are safe and would like to continue just proceed.',
    ],
  },
  dvPresent: {
    title: 'Safety resources',
    lines: [
      'Thank you for sharing this. If your situation changes or you feel unsafe at any time, call 911.',
      'You may also contact the National Domestic Violence Hotline at 1-800-799-SAFE (7233).',
    ],
  },
};

export const SECTION_TITLE_OVERRIDES: Record<string, Record<string, string>> = {
  default: {
    matter_metadata: 'Basics',
    client_identity: 'About You',
    opposing_party: 'Other Party',
    marriage_details: 'Marriage',
    separation_grounds: 'Separation',
    child_object: 'Children',
    children_custody: 'Custody',
    asset_object: 'Assets',
    income_support: 'Income & Support',
    debt_object: 'Debts',
    domestic_violence_risk: 'Safety',
    jurisdiction_venue: 'Jurisdiction',
    prior_legal_actions: 'Prior Cases',
    desired_outcomes: 'Goals',
    evidence_documents: 'Documents',
    final_review: 'Review',
  },
  legitimation: {
    opposing_party: 'Other Parent',
    marriage_details: 'Relationship',
    children_custody: 'Custody & Visitation',
  },
  custody: {
    opposing_party: 'Other Parent',
    marriage_details: 'Relationship',
  }
};

export const SECTION_CONTEXT_COPY = {
  legitimation: {
    children_custody:
      'Legitimation cases focus on establishing the parent-child relationship. Share any custody or parenting details you already have.',
  },
  modification: {
    prior_legal_actions:
      'Because this is a modification, prior custody orders and case numbers are especially important if you have them.',
  },
};

export const MODIFICATION_PROMPTS = {
  children_custody: 'Are you seeking to change an existing order?',
};
