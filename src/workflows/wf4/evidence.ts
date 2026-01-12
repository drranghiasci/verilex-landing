import type { EvidencePointer } from './types';

const MAX_SNIPPET_LENGTH = 200;

function boundSnippet(snippet?: string) {
  if (!snippet) return undefined;
  if (snippet.length <= MAX_SNIPPET_LENGTH) return snippet;
  return snippet.slice(0, MAX_SNIPPET_LENGTH);
}

export function fieldPointer(
  sourceId: string,
  pathOrSpan: string,
  snippet?: string,
): EvidencePointer {
  return {
    source_type: 'field',
    source_id: sourceId,
    path_or_span: pathOrSpan,
    snippet: boundSnippet(snippet),
  };
}

export function messagePointer(
  sourceId: string,
  pathOrSpan: string,
  snippet?: string,
): EvidencePointer {
  return {
    source_type: 'message',
    source_id: sourceId,
    path_or_span: pathOrSpan,
    snippet: boundSnippet(snippet),
  };
}

export function documentPointer(
  sourceId: string,
  pathOrSpan: string,
  snippet?: string,
): EvidencePointer {
  return {
    source_type: 'document',
    source_id: sourceId,
    path_or_span: pathOrSpan,
    snippet: boundSnippet(snippet),
  };
}

export function wf3Pointer(
  sourceId: string,
  pathOrSpan: string,
  snippet?: string,
): EvidencePointer {
  return {
    source_type: 'wf3',
    source_id: sourceId,
    path_or_span: pathOrSpan,
    snippet: boundSnippet(snippet),
  };
}

export function validateEvidencePointers(
  evidence: EvidencePointer[],
): { ok: true } | { ok: false; error: string } {
  if (!Array.isArray(evidence)) {
    return { ok: false, error: 'evidence must be an array' };
  }

  for (const pointer of evidence) {
    if (!pointer || typeof pointer !== 'object') {
      return { ok: false, error: 'evidence pointer must be object' };
    }
    if (
      pointer.source_type !== 'field' &&
      pointer.source_type !== 'message' &&
      pointer.source_type !== 'document' &&
      pointer.source_type !== 'wf3'
    ) {
      return { ok: false, error: 'evidence source_type invalid' };
    }
    if (typeof pointer.source_id !== 'string' || pointer.source_id.length === 0) {
      return { ok: false, error: 'evidence source_id missing' };
    }
    if (typeof pointer.path_or_span !== 'string' || pointer.path_or_span.length === 0) {
      return { ok: false, error: 'evidence path_or_span missing' };
    }
    if (pointer.snippet !== undefined && typeof pointer.snippet !== 'string') {
      return { ok: false, error: 'evidence snippet must be string' };
    }
    if (pointer.snippet && pointer.snippet.length > MAX_SNIPPET_LENGTH) {
      return { ok: false, error: 'evidence snippet too long' };
    }
  }

  return { ok: true };
}

export function boundEvidenceSnippet(evidence: EvidencePointer[]): EvidencePointer[] {
  return evidence.map((pointer) => ({
    ...pointer,
    snippet: boundSnippet(pointer.snippet),
  }));
}
