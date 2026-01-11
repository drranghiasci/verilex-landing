import fs from 'fs';
import path from 'path';
import { loadGaCounties } from '../src/workflow3/counties/gaCountiesLoader';
import { getRuleCatalog } from '../src/workflow3/catalog/loadRuleCatalog';
import { evaluateRules } from '../src/workflow3/evaluator/evaluateRules';
import type { RulesEngineResult } from '../src/workflow3/evaluator/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readFixture(name: string): Record<string, unknown> {
  const fixturePath = path.join(
    process.cwd(),
    'src',
    'workflow3',
    '__fixtures__',
    name,
  );
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

function assertShape(result: RulesEngineResult) {
  assert(typeof result.ruleset_version === 'string', 'ruleset_version missing');
  assert(typeof result.evaluated_at === 'string', 'evaluated_at missing');
  assert(Array.isArray(result.required_fields_missing), 'required_fields_missing missing');
  assert(Array.isArray(result.blocks), 'blocks missing');
  assert(Array.isArray(result.warnings), 'warnings missing');
  assert(Array.isArray(result.normalizations), 'normalizations missing');
  assert(Array.isArray(result.rule_evaluations), 'rule_evaluations missing');
}

function run() {
  const lookup = loadGaCounties();
  const { catalog } = getRuleCatalog();

  const minimal = readFixture('intake_minimal_missing.json');
  const minimalResult = evaluateRules(minimal, catalog, lookup, {
    evaluatedAt: '2026-01-11T00:00:00.000Z',
  });
  assertShape(minimalResult);
  assert(minimalResult.blocks.length > 0, 'Expected blocks for missing required fields');
  assert(
    minimalResult.required_fields_missing.includes('$.matter_type'),
    'Expected missing matter_type',
  );
  assert(
    minimalResult.blocks.some((block) => block.rule_id === 'WF3.REQ.MATTER_TYPE'),
    'Expected block for missing matter_type',
  );

  const valid = readFixture('intake_valid_example.json');
  const invalidCountyPayload = { ...valid, client_county: 'Not A County' };
  const invalidCountyResult = evaluateRules(invalidCountyPayload, catalog, lookup, {
    evaluatedAt: '2026-01-11T00:00:00.000Z',
  });
  assertShape(invalidCountyResult);
  const countyBlock = invalidCountyResult.blocks.find(
    (block) => block.rule_id === 'WF3.VALID.COUNTY.CLIENT_COUNTY',
  );
  assert(Boolean(countyBlock), 'Expected invalid county block');
  assert(
    countyBlock?.evidence && (countyBlock.evidence as Record<string, unknown>).input_value === 'Not A County',
    'Expected invalid county evidence input_value',
  );

  const validCountyResult = evaluateRules(valid, catalog, lookup, {
    evaluatedAt: '2026-01-11T00:00:00.000Z',
  });
  assertShape(validCountyResult);
  const normalization = validCountyResult.normalizations.find(
    (entry) => entry.field_path === '$.county_of_filing',
  );
  assert(Boolean(normalization), 'Expected county_of_filing normalization');
  if (normalization) {
    assert(normalization.normalized_value === 'fulton', 'Expected normalized county value');
  }

  console.log('WF3 smoke tests passed.');
}

run();
