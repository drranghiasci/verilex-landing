
import fs from 'fs';
import path from 'path';
import { loadRuleCatalog } from '../src/workflow3/catalog/loadRuleCatalog';
import { loadGaCounties } from '../src/workflow3/counties/gaCountiesLoader';
import { evaluateRules } from '../src/workflow3/evaluator/evaluateRules';

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'docs'))) {
    return cwd;
  }
  return cwd;
}

// Manually fix imports if needed or rely on tsx
// Assuming running from repo root

async function main() {
  console.log('--- WF3 Rules Smoke Test ---');
  
  const root = resolveRepoRoot();
  const catalog = loadRuleCatalog();
  const counties = loadGaCounties(); // Loads from default path keys relative to root

  const fixturesDir = path.join(root, 'test/fixtures/wf3');
  if (!fs.existsSync(fixturesDir)) {
      console.error('Fixtures dir not found:', fixturesDir);
      process.exit(1);
  }
  
  const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
  let failureCount = 0;

  for (const fixtureFile of fixtures) {
     const content = fs.readFileSync(path.join(fixturesDir, fixtureFile), 'utf8');
     const payload = JSON.parse(content);
     const result = evaluateRules(payload, catalog, counties);
     
     console.log(`\n----------------------------------------`);
     console.log(`Fixture: ${fixtureFile}`);
     console.log(`Matter Type: ${payload.matter_type}`);
     console.log(`Blocks Found: ${result.blocks.length}`);
     
     if (result.blocks.length > 0) {
         console.log('Top Blocks:', result.blocks.slice(0, 5).map(b => b.rule_id));
     }

     const blocks = new Set(result.blocks.map(b => b.rule_id));

     // EXPECTATIONS
     if (fixtureFile === 'custody_minimal.json') {
         // Should NOT block on marriage/grounds
         const badRules = [
             'WF3.REQ.DATE_OF_MARRIAGE',
             'WF3.REQ.GROUNDS_FOR_DIVORCE',
             'WF3.REQ.ASSET_TYPE', // Empty array in code implies missing? No, code uses values.length==0.
         ];
         
         // In current broken state, these WILL be present.
         // We want to detect if they are present.
         const foundBad = badRules.filter(r => blocks.has(r));
         if (foundBad.length > 0) {
             console.error(`[FAIL] Custody fixture triggered divorce rules: ${foundBad.join(', ')}`);
             failureCount++;
         } else {
             console.log('[PASS] Custody fixture free of divorce rules.');
         }
     }

     if (fixtureFile === 'divorce_missing_marriage.json') {
         // Should block on marriage
         if (!blocks.has('WF3.REQ.DATE_OF_MARRIAGE')) {
             console.error('[FAIL] Divorce fixture MISSING expected marriage block.');
             failureCount++;
         } else {
             console.log('[PASS] Divorce fixture correctly blocked on marriage.');
         }

         // Should NOT block on assets (empty array)
         if (blocks.has('WF3.REQ.ASSET_TYPE')) {
              console.error('[FAIL] Divorce fixture with empty assets triggered asset type block (Repeatable Object Bug).');
              failureCount++;
         } else {
              console.log('[PASS] Divorce fixture with empty assets passed asset rules.');
         }
     }
  }

  console.log(`\n----------------------------------------`);
  if (failureCount > 0) {
      console.error(`FAILED: ${failureCount} expectations failed.`);
      process.exit(1);
  } else {
      console.log('SUCCESS: All expectations passed.');
      process.exit(0);
  }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
