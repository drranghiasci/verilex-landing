export type RuleSeverity = 'block' | 'warning';

export type RuleCondition = {
  path: string;
  exists?: boolean;
  equals?: unknown;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};

export type RuleAppliesWhen = {
  all: RuleCondition[];
};

export type EvidenceMissingOrNull = {
  type: 'missing_or_null';
  paths: string[];
};

export type EvidenceCsvLookup = {
  type: 'csv_lookup';
  csv: string;
  input_path: string;
  match_on: string[];
  output: string;
};

export type EvidenceEnumMembership = {
  type: 'enum_membership';
  path: string;
  allowed_values: string[];
};

export type EvidenceTypeCheck = {
  type: 'type_check';
  path: string;
  expected_type: string;
};

export type EvidenceDateOrder = {
  type: 'date_order';
  earlier_path: string;
  later_path: string;
  operator: string;
};

export type EvidenceStrategy =
  | EvidenceMissingOrNull
  | EvidenceCsvLookup
  | EvidenceEnumMembership
  | EvidenceTypeCheck
  | EvidenceDateOrder;

export type RuleDefinition = {
  rule_id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  applies_when: RuleAppliesWhen;
  field_paths: string[];
  message_template: string;
  evidence_strategy: EvidenceStrategy;
};

export type RuleCatalog = {
  ruleset_version: string;
  rules: RuleDefinition[];
};

export type LoadedRuleCatalog = {
  catalog: RuleCatalog;
  ruleset_version: string;
};
