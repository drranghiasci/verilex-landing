import type { EvidenceMissingOrNull, RuleCatalog, RuleDefinition } from '../catalog/types';
import type { GaCountyLookup } from '../counties/types';
import { normalizeCounty } from '../counties/gaCountyNormalize';
import { appliesWhen } from './applyWhen';
import { getField } from './getField';
import { findMissingPaths, isMissingValue } from './requirements';
import type { CountyNormalization, RuleEvidence, RuleEvaluation, RuleFinding, RulesEngineResult } from './types';

type EvaluateRulesOptions = {
  evaluatedAt?: string;
};

function buildPathsEvidence(payload: unknown, paths: string[]): RuleEvidence {
  const values: Record<string, unknown> = {};
  paths.forEach((path) => {
    const value = getField(payload, path);
    values[path] = isMissingValue(value) ? null : value;
  });
  return { paths: values };
}

function mapMatchStrategy(strategy: string): 'slug' | 'name' {
  if (strategy === 'slug_exact') return 'slug';
  return 'name';
}

function evaluateMissingOrNull(payload: unknown, strategy: EvidenceMissingOrNull) {
  const missingPaths = findMissingPaths(payload, strategy.paths);
  const evidence = buildPathsEvidence(payload, strategy.paths);
  const passed = missingPaths.length === 0;
  return { passed, evidence, missingPaths };
}

function evaluateEnumMembership(payload: unknown, rule: RuleDefinition) {
  const strategy = rule.evidence_strategy;
  if (strategy.type !== 'enum_membership') {
    return { passed: true, evidence: {} };
  }
  const value = getField(payload, strategy.path);
  if (isMissingValue(value)) {
    return { passed: true, evidence: { path: strategy.path, value: null } };
  }
  if (typeof value !== 'string') {
    return {
      passed: false,
      evidence: {
        path: strategy.path,
        value,
        allowed_values: strategy.allowed_values,
      },
    };
  }
  const passed = strategy.allowed_values.includes(value);
  return {
    passed,
    evidence: {
      path: strategy.path,
      value,
      allowed_values: strategy.allowed_values,
    },
  };
}

function evaluateTypeCheck(payload: unknown, rule: RuleDefinition) {
  const strategy = rule.evidence_strategy;
  if (strategy.type !== 'type_check') {
    return { passed: true, evidence: {} };
  }
  const value = getField(payload, strategy.path);
  if (isMissingValue(value)) {
    return { passed: true, evidence: { path: strategy.path, value: null } };
  }

  let passed = false;
  if (strategy.expected_type === 'number') {
    passed = typeof value === 'number' && !Number.isNaN(value);
  } else if (strategy.expected_type === 'boolean') {
    passed = typeof value === 'boolean';
  } else if (strategy.expected_type === 'date') {
    passed = typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  return {
    passed,
    evidence: {
      path: strategy.path,
      value,
      expected_type: strategy.expected_type,
    },
  };
}

function evaluateDateOrder(payload: unknown, rule: RuleDefinition) {
  const strategy = rule.evidence_strategy;
  if (strategy.type !== 'date_order') {
    return { passed: true, evidence: {} };
  }
  const earlierValue = getField(payload, strategy.earlier_path);
  const laterValue = getField(payload, strategy.later_path);

  if (isMissingValue(earlierValue) || isMissingValue(laterValue)) {
    return {
      passed: true,
      evidence: {
        earlier_path: strategy.earlier_path,
        later_path: strategy.later_path,
        earlier_value: isMissingValue(earlierValue) ? null : earlierValue,
        later_value: isMissingValue(laterValue) ? null : laterValue,
        operator: strategy.operator,
      },
    };
  }

  const earlierDate = Date.parse(String(earlierValue));
  const laterDate = Date.parse(String(laterValue));
  if (Number.isNaN(earlierDate) || Number.isNaN(laterDate)) {
    return {
      passed: true,
      evidence: {
        earlier_path: strategy.earlier_path,
        later_path: strategy.later_path,
        earlier_value: earlierValue,
        later_value: laterValue,
        operator: strategy.operator,
      },
    };
  }

  let passed = true;
  switch (strategy.operator) {
    case '<=':
      passed = earlierDate <= laterDate;
      break;
    case '<':
      passed = earlierDate < laterDate;
      break;
    case '>=':
      passed = earlierDate >= laterDate;
      break;
    case '>':
      passed = earlierDate > laterDate;
      break;
    default:
      passed = true;
  }

  return {
    passed,
    evidence: {
      earlier_path: strategy.earlier_path,
      later_path: strategy.later_path,
      earlier_value: earlierValue,
      later_value: laterValue,
      operator: strategy.operator,
    },
  };
}

function evaluateCsvLookup(payload: unknown, rule: RuleDefinition, lookup: GaCountyLookup) {
  const strategy = rule.evidence_strategy;
  if (strategy.type !== 'csv_lookup') {
    return { passed: true, evidence: {}, normalization: null };
  }

  const value = getField(payload, strategy.input_path);
  if (isMissingValue(value)) {
    return { passed: true, evidence: { input_path: strategy.input_path, input_value: null }, normalization: null };
  }

  const rawValue = String(value);
  const normalized = normalizeCounty(rawValue, lookup);
  if (!normalized.ok) {
    return {
      passed: false,
      evidence: {
        input_path: strategy.input_path,
        input_value: rawValue,
        error: normalized.error,
        source: strategy.csv,
      },
      normalization: null,
    };
  }

  const normalization: CountyNormalization = {
    kind: 'county_normalization',
    field_path: strategy.input_path,
    input_value: rawValue,
    normalized_value: normalized.normalized_value,
    match_strategy: mapMatchStrategy(normalized.match_strategy),
    source: strategy.csv,
  };

  return {
    passed: true,
    evidence: {
      input_path: strategy.input_path,
      input_value: rawValue,
      normalized_value: normalized.normalized_value,
      match_strategy: normalization.match_strategy,
      source: strategy.csv,
    },
    normalization,
  };
}

function evaluateRule(
  payload: unknown,
  rule: RuleDefinition,
  lookup: GaCountyLookup,
): { passed: boolean; evidence: RuleEvidence; missingPaths: string[]; normalization: CountyNormalization | null } {
  if (rule.evidence_strategy.type === 'missing_or_null') {
    const result = evaluateMissingOrNull(payload, rule.evidence_strategy);
    return {
      passed: result.passed,
      evidence: result.evidence,
      missingPaths: result.missingPaths,
      normalization: null,
    };
  }

  if (rule.evidence_strategy.type === 'enum_membership') {
    const result = evaluateEnumMembership(payload, rule);
    return { passed: result.passed, evidence: result.evidence, missingPaths: [], normalization: null };
  }

  if (rule.evidence_strategy.type === 'type_check') {
    const result = evaluateTypeCheck(payload, rule);
    return { passed: result.passed, evidence: result.evidence, missingPaths: [], normalization: null };
  }

  if (rule.evidence_strategy.type === 'date_order') {
    const result = evaluateDateOrder(payload, rule);
    return { passed: result.passed, evidence: result.evidence, missingPaths: [], normalization: null };
  }

  if (rule.evidence_strategy.type === 'csv_lookup') {
    const result = evaluateCsvLookup(payload, rule, lookup);
    return {
      passed: result.passed,
      evidence: result.evidence,
      missingPaths: [],
      normalization: result.normalization,
    };
  }

  return { passed: true, evidence: {}, missingPaths: [], normalization: null };
}

export function evaluateRules(
  payload: unknown,
  catalog: RuleCatalog,
  countyLookup: GaCountyLookup,
  options: EvaluateRulesOptions = {},
): RulesEngineResult {
  const evaluatedAt = options.evaluatedAt ?? new Date().toISOString();
  const rulesetVersion = catalog.ruleset_version;
  const requiredMissing = new Set<string>();
  const blocks: RuleFinding[] = [];
  const warnings: RuleFinding[] = [];
  const ruleEvaluations: RuleEvaluation[] = [];
  const normalizationMap = new Map<string, CountyNormalization>();

  catalog.rules.forEach((rule) => {
    const applicable = appliesWhen(payload, rule.applies_when);

    if (!applicable) {
      ruleEvaluations.push({
        rule_id: rule.rule_id,
        severity: rule.severity,
        passed: true,
        field_paths: rule.field_paths,
        evidence: { skipped: true },
        message: '',
        evaluated_at: evaluatedAt,
        ruleset_version: rulesetVersion,
      });
      return;
    }

    const { passed, evidence, missingPaths, normalization } = evaluateRule(payload, rule, countyLookup);

    if (
      missingPaths.length > 0 &&
      rule.evidence_strategy.type === 'missing_or_null' &&
      rule.severity === 'block'
    ) {
      missingPaths.forEach((path) => requiredMissing.add(path));
    }

    if (normalization) {
      normalizationMap.set(normalization.field_path, normalization);
    }

    if (!passed) {
      const finding: RuleFinding = {
        rule_id: rule.rule_id,
        severity: rule.severity,
        message: rule.message_template,
        field_paths: rule.field_paths,
        evidence,
        evaluated_at: evaluatedAt,
        ruleset_version: rulesetVersion,
      };
      if (rule.severity === 'block') {
        blocks.push(finding);
      } else {
        warnings.push(finding);
      }
    }

    ruleEvaluations.push({
      rule_id: rule.rule_id,
      severity: rule.severity,
      passed,
      field_paths: rule.field_paths,
      evidence,
      message: passed ? '' : rule.message_template,
      evaluated_at: evaluatedAt,
      ruleset_version: rulesetVersion,
    });
  });

  return {
    ruleset_version: rulesetVersion,
    evaluated_at: evaluatedAt,
    required_fields_missing: Array.from(requiredMissing),
    blocks,
    warnings,
    normalizations: Array.from(normalizationMap.values()),
    rule_evaluations: ruleEvaluations,
  };
}
