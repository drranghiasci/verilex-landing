import type { RuleSeverity } from '../catalog/types';

export type RuleEvidence = Record<string, unknown>;

export type RuleFinding = {
  rule_id: string;
  severity: RuleSeverity;
  message: string;
  field_paths: string[];
  evidence: RuleEvidence;
  evaluated_at: string;
  ruleset_version: string;
};

export type RuleEvaluation = {
  rule_id: string;
  severity: RuleSeverity;
  passed: boolean;
  field_paths: string[];
  evidence: RuleEvidence;
  message: string;
  evaluated_at: string;
  ruleset_version: string;
};

export type CountyNormalization = {
  kind: 'county_normalization';
  field_path: string;
  input_value: string;
  normalized_value: string;
  match_strategy: 'slug' | 'name';
  source: string;
};

export type RulesEngineResult = {
  ruleset_version: string;
  evaluated_at: string;
  required_fields_missing: string[];
  blocks: RuleFinding[];
  warnings: RuleFinding[];
  normalizations: CountyNormalization[];
  rule_evaluations: RuleEvaluation[];
};
