import { getRuleCatalog } from '../src/workflow3/catalog/loadRuleCatalog';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const { catalog, ruleset_version } = getRuleCatalog();
  assert(typeof ruleset_version === 'string' && ruleset_version.length > 0, 'Missing ruleset_version');
  assert(Array.isArray(catalog.rules) && catalog.rules.length > 0, 'Expected non-empty rules array');

  const duplicateCheck = new Set<string>();
  for (const rule of catalog.rules) {
    assert(typeof rule.rule_id === 'string' && rule.rule_id.length > 0, 'Rule missing rule_id');
    assert(!duplicateCheck.has(rule.rule_id), `Duplicate rule_id found: ${rule.rule_id}`);
    duplicateCheck.add(rule.rule_id);
  }

  console.log(`WF3 catalog smoke test passed (${ruleset_version}, ${catalog.rules.length} rules).`);
}

run();
