import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';
import { canEditDocuments, canDeleteDocuments } from '@/lib/permissions';
import { logActivity } from '@/lib/activity';
import { useFirmPlan } from '@/lib/useFirmPlan';
import { canUploadDocument } from '@/lib/plans';

type DocumentRow = {
  id: string;
  case_id: string;
  filename: string;
  display_name: string | null;
  doc_type: string;
  tags: string[];
  storage_path: string;
  created_at: string;
};

type CaseRow = {
  id: string;
  title: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
};

export default function DocumentsPage() {
  const { state } = useFirm();
  const { plan, loading: planLoading } = useFirmPlan();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('other');
  const [editTags, setEditTags] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const canEdit = canEditDocuments(state.role);
  const canDelete = canDeleteDocuments(state.role);
  const documentLimitCheck = canUploadDocument({ plan, currentDocumentCount: documents.length });
  const documentLimitReached = !planLoading && !documentLimitCheck.ok;
  const isPermissionError = (message?: string | null) => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return lower.includes('permission') || lower.includes('policy') || lower.includes('not allowed');
  };

  const caseMap = useMemo(() => {
    const map = new Map<string, CaseRow>();
    cases.forEach((row) => map.set(row.id, row));
    return map;
  }, [cases]);

  const docTypeOptions = useMemo(() => {
    const values = documents.map((doc) => doc.doc_type).filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    const tagTerm = tagFilter.trim().toLowerCase();
    return documents.filter((doc) => {
      if (docTypeFilter !== 'all' && doc.doc_type !== docTypeFilter) return false;
      if (term) {
        const name = (doc.display_name || doc.filename).toLowerCase();
        if (!name.includes(term)) return false;
      }
      if (tagTerm) {
        const tags = doc.tags.map((tag) => tag.toLowerCase());
        if (!tags.includes(tagTerm)) return false;
      }
      return true;
    });
  }, [documents, search, docTypeFilter, tagFilter]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;

    let mounted = true;
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      const { data: docs, error: docsError } = await supabase
        .from('case_documents')
        .select('id, case_id, filename, display_name, doc_type, tags, storage_path, created_at')
        .eq('firm_id', state.firmId)
        .is('deleted_at', null)
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false });

      if (!mounted) return;
      if (docsError) {
        setError(docsError.message);
        setLoading(false);
        return;
      }

      const docRows = (docs ?? []).map((doc) => ({
        ...doc,
        display_name: doc.display_name ?? null,
        doc_type: doc.doc_type ?? 'other',
        tags: doc.tags ?? [],
      })) as DocumentRow[];
      const caseIds = Array.from(new Set(docRows.map((doc) => doc.case_id)));

      let caseRows: CaseRow[] = [];
      if (caseIds.length > 0) {
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('id, title, client_first_name, client_last_name')
          .in('id', caseIds);

        if (caseError) {
          setError(caseError.message);
          setLoading(false);
          return;
        }
        caseRows = (caseData ?? []) as CaseRow[];
      }

      if (mounted) {
        setDocuments(docRows);
        setCases(caseRows);
        setLoading(false);
      }
    };

    loadDocuments();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId]);

  const handleDownload = async (documentId: string) => {
    setDownloadId(documentId);
    setError(null);
    try {
      const doc = documents.find((item) => item.id === documentId);
      if (!doc?.storage_path) {
        setError('Document is missing a storage path.');
        return;
      }

      const { data, error: signedError } = await supabase.storage.from('case-documents').createSignedUrl(doc.storage_path, 60);
      if (signedError || !data?.signedUrl) {
        setError(signedError?.message || 'Unable to generate download link.');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download document.');
    } finally {
      setDownloadId(null);
    }
  };

  const startEdit = (doc: DocumentRow) => {
    setEditingId(doc.id);
    setEditName(doc.display_name || doc.filename);
    setEditType(doc.doc_type || 'other');
    setEditTags(doc.tags.join(', '));
    setActionStatus(null);
    setActionError(null);
  };

  const handleSaveEdit = async (docId: string) => {
    setActionStatus(null);
    setActionError(null);
    if (!canEdit) {
      setActionError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }
    const tags = editTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const original = documents.find((doc) => doc.id === docId);
    const { error: updateError } = await supabase
      .from('case_documents')
      .update({ display_name: editName.trim() || null, doc_type: editType, tags })
      .eq('id', docId);

    if (updateError) {
      setActionError(
        isPermissionError(updateError.message)
          ? 'You don’t have permission to perform this action. Please contact your firm admin.'
          : updateError.message,
      );
      return;
    }

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? { ...doc, display_name: editName.trim() || null, doc_type: editType, tags }
          : doc,
      ),
    );
    if (original) {
      if ((original.display_name || original.filename) !== editName.trim()) {
        await logActivity(supabase, {
          firm_id: state.firmId!,
          case_id: original.case_id,
          actor_user_id: state.userId,
          event_type: 'document_renamed',
          message: `Document renamed: ${(original.display_name || original.filename)} → ${editName.trim()}`,
          metadata: { document_id: docId },
        });
      }
      if (original.doc_type !== editType || original.tags.join(',') !== tags.join(',')) {
        await logActivity(supabase, {
          firm_id: state.firmId!,
          case_id: original.case_id,
          actor_user_id: state.userId,
          event_type: 'document_updated',
          message: `Document updated: ${editName.trim() || original.filename}`,
          metadata: { document_id: docId },
        });
      }
    }
    setActionStatus('Saved');
    setEditingId(null);
  };

  const handleDelete = async (docId: string) => {
    setActionStatus(null);
    setActionError(null);
    if (!canDelete) {
      setActionError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }
    const confirmed = window.confirm('Delete this document? This cannot be undone.');
    if (!confirmed) return;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setActionError(sessionError?.message || 'Please sign in.');
      return;
    }

    const res = await fetch('/api/myclient/documents/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ documentId: docId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setActionError(
        isPermissionError(data.error)
          ? 'You don’t have permission to perform this action. Please contact your firm admin.'
          : data.error || 'Unable to delete document.',
      );
      return;
    }
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setActionStatus('Deleted');
  };

  return (
    <>
      <Head>
        <title>MyClient | Documents</title>
      </Head>
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/myclient/app"
            className="text-sm text-[color:var(--text-2)] hover:text-white transition"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-semibold text-white">Documents</h1>
        </div>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">
          Firm {state.firmId ? state.firmId.slice(0, 8) : 'No firm'} · Role {state.role ?? 'member'}
        </p>

        {state.loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && (
          <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>
        )}

        {state.authed && state.firmId && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by filename"
                className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
              <label htmlFor="docTypeFilter" className="sr-only">Filter by document type</label>
              <select
                id="docTypeFilter"
                value={docTypeFilter}
                onChange={(event) => setDocTypeFilter(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="all">Type: All</option>
                {docTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                placeholder="Filter by tag"
                className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {actionError && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {actionError}
              </div>
            )}
            {actionStatus && (
              <div className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-white">
                {actionStatus}
              </div>
            )}
            {documentLimitReached && (
              <div className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-[color:var(--text-2)]">
                {documentLimitCheck.reason} Upgrade to Pro to upload more documents.
                <Link href="/myclient/upgrade" className="ml-2 text-white underline underline-offset-4">
                  Upgrade
                </Link>
              </div>
            )}
            {!canEdit && (
              <div className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-[color:var(--text-2)]">
                You have read-only access. Please contact your firm admin to manage documents.
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-white/10">
              {loading ? (
                <p className="px-4 py-6 text-[color:var(--text-2)]">Loading...</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="px-4 py-6 text-[color:var(--text-2)]">No documents uploaded yet.</p>
              ) : (
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="text-[color:var(--text-2)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">File</th>
                      <th className="px-4 py-3 font-semibold">Case</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Tags</th>
                      <th className="px-4 py-3 font-semibold">Uploaded</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[color:var(--text-1)]">
                    {filteredDocuments.map((doc) => {
                      const caseRow = caseMap.get(doc.case_id);
                      const caseLabel =
                        caseRow?.title ||
                        (caseRow?.client_last_name || caseRow?.client_first_name
                          ? `${caseRow?.client_last_name ?? ''}${caseRow?.client_first_name ? `, ${caseRow?.client_first_name}` : ''}`.trim()
                          : 'Unknown case');
                      const displayName = doc.display_name || doc.filename;
                      const tagLabel = doc.tags.length > 0 ? doc.tags.slice(0, 2).join(', ') : '—';
                      return (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 text-white">
                              {editingId === doc.id ? (
                                <input
                                  value={editName}
                                  onChange={(event) => setEditName(event.target.value)}
                                  disabled={!canEdit}
                                  className="w-full rounded-md border border-white/10 bg-[var(--surface-0)] px-2 py-1 text-sm text-white outline-none"
                                  placeholder="Enter document name"
                                />
                              ) : (
                                displayName
                              )}
                            </td>
                          <td className="px-4 py-3">
                            <Link href={`/myclient/cases/${doc.case_id}`} className="text-[color:var(--text-2)] hover:text-white">
                              {caseLabel}
                            </Link>
                          </td>
                          <td className="px-4 py-3 capitalize">
                            {editingId === doc.id ? (
                              <input
                                value={editType}
                                onChange={(event) => setEditType(event.target.value)}
                                disabled={!canEdit}
                                className="w-full rounded-md border border-white/10 bg-[var(--surface-0)] px-2 py-1 text-sm text-white outline-none"
                                placeholder="Enter document type"
                              />
                            ) : (
                              doc.doc_type
                            )}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--text-2)]">
                            {editingId === doc.id ? (
                              <input
                                value={editTags}
                                onChange={(event) => setEditTags(event.target.value)}
                                disabled={!canEdit}
                                className="w-full rounded-md border border-white/10 bg-[var(--surface-0)] px-2 py-1 text-sm text-white outline-none"
                                placeholder="Enter tags (comma-separated)"
                              />
                            ) : (
                              <>
                                {tagLabel}
                                {doc.tags.length > 2 && ` +${doc.tags.length - 2}`}
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--text-2)]">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {editingId === doc.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(doc.id)}
                                    disabled={!canEdit}
                                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  {canEdit && (
                                    <button
                                      onClick={() => startEdit(doc)}
                                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                                    >
                                      Rename/Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDownload(doc.id)}
                                    disabled={downloadId === doc.id}
                                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white disabled:opacity-60"
                                  >
                                    {downloadId === doc.id ? 'Preparing…' : 'Download'}
                                  </button>
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDelete(doc.id)}
                                      className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-200 hover:text-white"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
