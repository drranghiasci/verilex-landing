import type { RuleAppliesWhen } from '../catalog/types';
import { getFieldValues } from './getField';
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
    const values = getFieldValues(payload, condition.path);
    const presentValues = values.filter((value) => !isMissingValue(value));

    if (typeof condition.exists === 'boolean') {
      const exists = presentValues.length > 0;
      if (exists !== condition.exists) return false;
    }

    if (condition.equals !== undefined) {
      if (!presentValues.some((value) => value === condition.equals)) return false;
    }

    if (typeof condition.gt === 'number' && !presentValues.some((value) => compareNumeric(value, 'gt', condition.gt))) {
      return false;
    }
    if (typeof condition.gte === 'number' && !presentValues.some((value) => compareNumeric(value, 'gte', condition.gte))) {
      return false;
    }
    if (typeof condition.lt === 'number' && !presentValues.some((value) => compareNumeric(value, 'lt', condition.lt))) {
      return false;
    }
    if (typeof condition.lte === 'number' && !presentValues.some((value) => compareNumeric(value, 'lte', condition.lte))) {
      return false;
    }

    return true;
  });
}
