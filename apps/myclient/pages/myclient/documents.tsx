import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';

type DocumentRow = {
  id: string;
  case_id: string;
  filename: string;
  storage_path: string;
  created_at: string;
};

type CaseRow = {
  id: string;
  client_name: string | null;
};

export default function DocumentsPage() {
  const { state } = useFirm();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const caseMap = useMemo(() => {
    const map = new Map<string, CaseRow>();
    cases.forEach((row) => map.set(row.id, row));
    return map;
  }, [cases]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((doc) => doc.filename.toLowerCase().includes(term));
  }, [documents, search]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;

    let mounted = true;
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      const { data: docs, error: docsError } = await supabase
        .from('case_documents')
        .select('id, case_id, filename, storage_path, created_at')
        .eq('firm_id', state.firmId)
        .order('created_at', { ascending: false });

      if (!mounted) return;
      if (docsError) {
        setError(docsError.message);
        setLoading(false);
        return;
      }

      const docRows = docs ?? [];
      const caseIds = Array.from(new Set(docRows.map((doc) => doc.case_id)));

      let caseRows: CaseRow[] = [];
      if (caseIds.length > 0) {
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('id, client_name')
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

  return (
    <>
      <Head>
        <title>MyClient | Documents</title>
      </Head>
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
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
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by filename"
              className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
            />

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {error}
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
                      <th className="px-4 py-3 font-semibold">Uploaded</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[color:var(--text-1)]">
                    {filteredDocuments.map((doc) => {
                      const caseRow = caseMap.get(doc.case_id);
                      const caseLabel = caseRow?.client_name ?? 'Unknown case';
                      return (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 text-white">{doc.filename}</td>
                          <td className="px-4 py-3">
                            <Link href={`/myclient/cases/${doc.case_id}`} className="text-[color:var(--text-2)] hover:text-white">
                              {caseLabel}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[color:var(--text-2)]">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDownload(doc.id)}
                              disabled={downloadId === doc.id}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white disabled:opacity-60"
                            >
                              {downloadId === doc.id ? 'Preparing…' : 'Download'}
                            </button>
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
