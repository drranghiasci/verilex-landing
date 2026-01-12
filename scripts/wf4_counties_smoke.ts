import { isCanonicalCounty, loadWf4Counties, matchCountyMention } from '../src/workflows/wf4/counties';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const lookup = loadWf4Counties();

  const exact = matchCountyMention('Fulton County', lookup);
  assert(exact.match_type === 'EXACT', 'Expected EXACT match for Fulton County');
  assert(exact.suggested_county !== null, 'Expected suggested county for Fulton County');
  assert(
    exact.suggested_county ? isCanonicalCounty(exact.suggested_county, lookup) : false,
    'Expected suggested county to be canonical',
  );

  const ambiguous = matchCountyMention('Ba', lookup);
  assert(ambiguous.suggested_county === null, 'Expected ambiguous match to return null');
  assert(ambiguous.match_type === 'NONE', 'Expected ambiguous match_type NONE');

  console.log('WF4 counties smoke test passed.');
}

run();
