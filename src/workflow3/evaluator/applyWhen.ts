import type { RuleAppliesWhen } from '../catalog/types';
import { getField } from './getField';
import { isMissingValue } from './requirements';

type NumericOperator = 'gt' | 'gte' | 'lt' | 'lte';

function compareNumeric(value: unknown, operator: NumericOperator, expected: number): boolean {
  if (typeof value !== 'number' || Number.isNaN(value)) return false;
  switch (operator) {
    case 'gt':
      return value > expected;
    case 'gte':
      return value >= expected;
    case 'lt':
      return value < expected;
    case 'lte':
      return value <= expected;
    default:
      return false;
  }
}

export function appliesWhen(payload: unknown, applies: RuleAppliesWhen | undefined): boolean {
  if (!applies || !Array.isArray(applies.all)) return true;

  return applies.all.every((condition) => {
    const value = getField(payload, condition.path);

    if (typeof condition.exists === 'boolean') {
      const exists = !isMissingValue(value);
      if (exists !== condition.exists) return false;
    }

    if (condition.equals !== undefined) {
      if (value !== condition.equals) return false;
    }

    if (condition.gt !== undefined && !compareNumeric(value, 'gt', condition.gt)) return false;
    if (condition.gte !== undefined && !compareNumeric(value, 'gte', condition.gte)) return false;
    if (condition.lt !== undefined && !compareNumeric(value, 'lt', condition.lt)) return false;
    if (condition.lte !== undefined && !compareNumeric(value, 'lte', condition.lte)) return false;

    return true;
  });
}
