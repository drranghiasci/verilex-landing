import type {
  EvidenceCsvLookup,
  EvidenceDateOrder,
  EvidenceEnumMembership,
  EvidenceMissingOrNull,
  EvidenceStrategy,
  EvidenceTypeCheck,
  LoadedRuleCatalog,
  RuleCatalog,
  RuleDefinition,
  RuleSeverity,
} from './types';

type ValidationError = {
  path: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function validateStringArray(value: unknown, path: string, errors: ValidationError[]) {
  if (!Array.isArray(value)) {
    errors.push({ path, message: 'Expected array of strings' });
    return;
  }
  value.forEach((item, index) => {
    if (!isString(item)) {
      errors.push({ path: `${path}[${index}]`, message: 'Expected string' });
    }
  });
}

function validateEvidenceStrategy(
  value: unknown,
  path: string,
  errors: ValidationError[],
): value is EvidenceStrategy {
  if (!isRecord(value)) {
    errors.push({ path, message: 'Expected evidence_strategy object' });
    return false;
  }

  if (!isString(value.type)) {
    errors.push({ path: `${path}.type`, message: 'Missing evidence_strategy.type' });
    return false;
  }

  const allowedKeysByType: Record<string, string[]> = {
    missing_or_null: ['type', 'paths'],
    csv_lookup: ['type', 'csv', 'input_path', 'match_on', 'output'],
    enum_membership: ['type', 'path', 'allowed_values'],
    type_check: ['type', 'path', 'expected_type'],
    date_order: ['type', 'earlier_path', 'later_path', 'operator'],
  };

  const allowedKeys = allowedKeysByType[value.type];
  if (!allowedKeys) {
    errors.push({ path: `${path}.type`, message: `Unsupported evidence_strategy type: ${value.type}` });
    return false;
  }

  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      errors.push({ path: `${path}.${key}`, message: 'Unexpected evidence_strategy key' });
    }
  });

  switch (value.type) {
    case 'missing_or_null': {
      const strategy = value as EvidenceMissingOrNull;
      validateStringArray(strategy.paths, `${path}.paths`, errors);
      return true;
    }
    case 'csv_lookup': {
      const strategy = value as EvidenceCsvLookup;
      if (!isString(strategy.csv)) {
        errors.push({ path: `${path}.csv`, message: 'Expected csv string' });
      }
      if (!isString(strategy.input_path)) {
        errors.push({ path: `${path}.input_path`, message: 'Expected input_path string' });
      }
      validateStringArray(strategy.match_on, `${path}.match_on`, errors);
      if (!isString(strategy.output)) {
        errors.push({ path: `${path}.output`, message: 'Expected output string' });
      }
      return true;
    }
    case 'enum_membership': {
      const strategy = value as EvidenceEnumMembership;
      if (!isString(strategy.path)) {
        errors.push({ path: `${path}.path`, message: 'Expected path string' });
      }
      validateStringArray(strategy.allowed_values, `${path}.allowed_values`, errors);
      return true;
    }
    case 'type_check': {
      const strategy = value as EvidenceTypeCheck;
      if (!isString(strategy.path)) {
        errors.push({ path: `${path}.path`, message: 'Expected path string' });
      }
      if (!isString(strategy.expected_type)) {
        errors.push({ path: `${path}.expected_type`, message: 'Expected expected_type string' });
      }
      return true;
    }
    case 'date_order': {
      const strategy = value as EvidenceDateOrder;
      if (!isString(strategy.earlier_path)) {
        errors.push({ path: `${path}.earlier_path`, message: 'Expected earlier_path string' });
      }
      if (!isString(strategy.later_path)) {
        errors.push({ path: `${path}.later_path`, message: 'Expected later_path string' });
      }
      if (!isString(strategy.operator)) {
        errors.push({ path: `${path}.operator`, message: 'Expected operator string' });
      }
      return true;
    }
    default:
      return false;
  }
}

function validateRuleDefinition(
  value: unknown,
  path: string,
  ruleIds: Set<string>,
  errors: ValidationError[],
): value is RuleDefinition {
  if (!isRecord(value)) {
    errors.push({ path, message: 'Expected rule object' });
    return false;
  }

  const allowedKeys = [
    'rule_id',
    'name',
    'description',
    'severity',
    'applies_when',
    'field_paths',
    'message_template',
    'evidence_strategy',
  ];
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      errors.push({ path: `${path}.${key}`, message: 'Unexpected rule key' });
    }
  });

  if (!isString(value.rule_id)) {
    errors.push({ path: `${path}.rule_id`, message: 'Missing rule_id' });
  } else if (ruleIds.has(value.rule_id)) {
    errors.push({ path: `${path}.rule_id`, message: `Duplicate rule_id: ${value.rule_id}` });
  } else {
    ruleIds.add(value.rule_id);
  }

  if (!isString(value.name)) {
    errors.push({ path: `${path}.name`, message: 'Missing name' });
  }

  if (!isString(value.description)) {
    errors.push({ path: `${path}.description`, message: 'Missing description' });
  }

  const severity = value.severity as RuleSeverity;
  if (!isString(value.severity) || (severity !== 'block' && severity !== 'warning')) {
    errors.push({ path: `${path}.severity`, message: 'Invalid severity' });
  }

  if (!isRecord(value.applies_when)) {
    errors.push({ path: `${path}.applies_when`, message: 'Missing applies_when' });
  } else {
    const allowedAppliesKeys = ['all'];
    Object.keys(value.applies_when).forEach((key) => {
      if (!allowedAppliesKeys.includes(key)) {
        errors.push({ path: `${path}.applies_when.${key}`, message: 'Unexpected applies_when key' });
      }
    });

    const conditions = (value.applies_when as { all?: unknown }).all;
    if (!Array.isArray(conditions)) {
      errors.push({ path: `${path}.applies_when.all`, message: 'Expected applies_when.all array' });
    } else {
      conditions.forEach((condition, index) => {
        const conditionPath = `${path}.applies_when.all[${index}]`;
        if (!isRecord(condition)) {
          errors.push({ path: conditionPath, message: 'Expected condition object' });
          return;
        }
        if (!isString(condition.path)) {
          errors.push({ path: `${conditionPath}.path`, message: 'Missing condition path' });
        }
        if (condition.exists !== undefined && !isBoolean(condition.exists)) {
          errors.push({ path: `${conditionPath}.exists`, message: 'Expected exists boolean' });
        }
        const numericKeys = ['gt', 'gte', 'lt', 'lte'] as const;
        const hasNumeric = numericKeys.some((key) => condition[key] !== undefined);
        if (condition.exists === undefined && condition.equals === undefined && !hasNumeric) {
          errors.push({
            path: conditionPath,
            message: 'Condition must include exists, equals, or numeric comparator',
          });
        }
        numericKeys.forEach((key) => {
          if (condition[key] !== undefined && typeof condition[key] !== 'number') {
            errors.push({ path: `${conditionPath}.${key}`, message: 'Expected number' });
          }
        });
        const allowedConditionKeys = ['path', 'exists', 'equals', 'gt', 'gte', 'lt', 'lte'];
        Object.keys(condition).forEach((key) => {
          if (!allowedConditionKeys.includes(key)) {
            errors.push({ path: `${conditionPath}.${key}`, message: 'Unexpected condition key' });
          }
        });
      });
    }
  }

  validateStringArray(value.field_paths, `${path}.field_paths`, errors);

  if (!isString(value.message_template)) {
    errors.push({ path: `${path}.message_template`, message: 'Missing message_template' });
  }

  validateEvidenceStrategy(value.evidence_strategy, `${path}.evidence_strategy`, errors);

  return true;
}

export function validateRuleCatalog(raw: unknown): RuleCatalog {
  const errors: ValidationError[] = [];

  if (!isRecord(raw)) {
    throw new Error('Invalid rule catalog: expected object root');
  }

  const allowedRootKeys = ['ruleset_version', 'rules'];
  Object.keys(raw).forEach((key) => {
    if (!allowedRootKeys.includes(key)) {
      errors.push({ path: `root.${key}`, message: 'Unexpected root key' });
    }
  });

  if (!isString(raw.ruleset_version)) {
    errors.push({ path: 'root.ruleset_version', message: 'Missing ruleset_version' });
  }

  if (!Array.isArray(raw.rules)) {
    errors.push({ path: 'root.rules', message: 'Missing rules array' });
  } else {
    const ruleIds = new Set<string>();
    raw.rules.forEach((rule, index) => {
      validateRuleDefinition(rule, `root.rules[${index}]`, ruleIds, errors);
    });
  }

  if (errors.length > 0) {
    const message = errors.map((error) => `- ${error.path}: ${error.message}`).join('\n');
    throw new Error(`Invalid rule catalog:\n${message}`);
  }

  return raw as RuleCatalog;
}

export function getRulesetVersion(raw: unknown): string {
  const catalog = validateRuleCatalog(raw);
  return catalog.ruleset_version;
}

export function assertValidCatalog(raw: unknown): LoadedRuleCatalog {
  const catalog = validateRuleCatalog(raw);
  return { catalog, ruleset_version: catalog.ruleset_version };
}
