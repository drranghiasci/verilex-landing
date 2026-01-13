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

    const gt = condition.gt;
    if (typeof gt === 'number' && !presentValues.some((value) => compareNumeric(value, 'gt', gt))) {
      return false;
    }
    const gte = condition.gte;
    if (typeof gte === 'number' && !presentValues.some((value) => compareNumeric(value, 'gte', gte))) {
      return false;
    }
    const lt = condition.lt;
    if (typeof lt === 'number' && !presentValues.some((value) => compareNumeric(value, 'lt', lt))) {
      return false;
    }
    const lte = condition.lte;
    if (typeof lte === 'number' && !presentValues.some((value) => compareNumeric(value, 'lte', lte))) {
      return false;
    }

    return true;
  });
}
