import { loadGaCounties } from '../src/workflow3/counties/gaCountiesLoader';
import { normalizeCounty } from '../src/workflow3/counties/gaCountyNormalize';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const lookup = loadGaCounties();

  const slugMatch = normalizeCounty('appling', lookup);
  assert(slugMatch.ok, 'Expected slug match for "appling"');
  if (slugMatch.ok) {
    assert(slugMatch.normalized_value === 'appling', 'Expected canonical slug value');
  }

  const nameMatch = normalizeCounty('Appling', lookup);
  assert(nameMatch.ok, 'Expected name match for "Appling"');

  const normalizedMatch = normalizeCounty('Ben  Hill', lookup);
  assert(normalizedMatch.ok, 'Expected normalized match for "Ben  Hill"');
  if (normalizedMatch.ok) {
    assert(
      normalizedMatch.match_strategy === 'name_trimmed',
      'Expected name_trimmed match strategy',
    );
  }

  const badMatch = normalizeCounty('Not A County', lookup);
  assert(!badMatch.ok, 'Expected unknown county to fail');

  console.log('WF3 county normalization smoke test passed.');
}

run();
