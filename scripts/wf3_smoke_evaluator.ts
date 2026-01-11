import { loadGaCounties } from '../src/workflow3/counties/gaCountiesLoader';
import { getRuleCatalog } from '../src/workflow3/catalog/loadRuleCatalog';
import { evaluateRules } from '../src/workflow3/evaluator/evaluateRules';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const lookup = loadGaCounties();
  const { catalog } = getRuleCatalog();

  const payload = {
    matter_type: 'divorce',
    urgency_level: 'urgent',
    intake_channel: 'web',
    client_county: 'Not A County',
    county_of_filing: 'fulton',
  };

  const result = evaluateRules(payload, catalog, lookup, {
    evaluatedAt: '2026-01-11T00:00:00.000Z',
  });

  assert(result.ruleset_version === catalog.ruleset_version, 'Ruleset version mismatch');
  assert(result.evaluated_at === '2026-01-11T00:00:00.000Z', 'Evaluated_at mismatch');
  assert(result.blocks.length > 0, 'Expected at least one block');
  assert(
    result.blocks.some((block) => block.rule_id === 'WF3.VALID.COUNTY.CLIENT_COUNTY'),
    'Expected invalid client_county block',
  );
  assert(
    result.normalizations.some((entry) => entry.field_path === '$.county_of_filing'),
    'Expected county_of_filing normalization',
  );

  console.log('WF3 evaluator smoke test passed.');
}

run();
