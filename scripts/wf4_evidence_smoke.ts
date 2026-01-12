import {
  documentPointer,
  fieldPointer,
  messagePointer,
  validateEvidencePointers,
  wf3Pointer,
} from '../src/workflows/wf4/evidence';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const longSnippet = 'x'.repeat(500);

const evidence = [
  fieldPointer('field-1', '$.client_first_name', longSnippet),
  messagePointer('msg-1', '0:10', 'short'),
  documentPointer('doc-1', 'p1:10-20'),
  wf3Pointer('wf3-1', 'rule:WF3.REQ.CLIENT_FIRST_NAME'),
];

const check = validateEvidencePointers(evidence);
assert(check.ok, 'evidence should validate');

const snippet = evidence[0]?.snippet ?? '';
assert(snippet.length <= 200, 'snippet should be bounded to max length');

const badCheck = validateEvidencePointers([
  {
    source_type: 'invalid',
    source_id: '',
    path_or_span: '',
  } as any,
]);
assert(!badCheck.ok, 'invalid evidence should fail');

console.log('WF4 evidence smoke test passed.');
