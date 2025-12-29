import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';

type CaseRecord = {
  id: string;
  firm_id: string;
  client_name: string;
  matter_type: string;
  status: string;
  intake_summary: string | null;
  internal_notes: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
};

const STATUS_OPTIONS = ['open', 'pending', 'closed'] as const;

export default function CaseDetailPage() {
  const router = useRouter();
  const { state } = useFirm();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const caseId = useMemo(() => (typeof router.query.id === 'string' ? router.query.id : null), [router.query.id]);

  useEffect(() => {
    if (!state.authed || !state.firmId || !caseId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadCase = async () => {
      setLoading(true);
      setError(null);
      const { data, error: caseError } = await supabase
        .from('cases')
        .select(
          'id, firm_id, client_name, matter_type, status, intake_summary, internal_notes, last_activity_at, created_at, updated_at',
        )
        .eq('id', caseId)
        .limit(1);

      if (!mounted) return;
      if (caseError) {
        setError(caseError.message);
        setRecord(null);
      } else {
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as CaseRecord) : null;
        setRecord(row);
      }
      setLoading(false);
    };

    loadCase();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId, caseId]);

  const loadDocuments = useCallback(async () => {
    if (!state.authed || !state.firmId || !caseId) return;
    setDocumentsLoading(true);
    setDocumentsError(null);
    const { data, error: docsError } = await supabase
      .from('case_documents')
      .select('id, filename, storage_path, created_at')
      .eq('case_id', caseId)
      .eq('firm_id', state.firmId)
      .order('created_at', { ascending: false });

    if (docsError) {
      setDocumentsError(docsError.message);
      setDocuments([]);
    } else {
      setDocuments(data ?? []);
    }
    setDocumentsLoading(false);
  }, [caseId, state.authed, state.firmId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleChange = (field: keyof CaseRecord) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!record) return;
    setRecord({ ...record, [field]: event.target.value });
  };

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('cases')
        .update({
          client_name: record.client_name,
          matter_type: record.matter_type,
          status: record.status,
          internal_notes: record.internal_notes ?? null,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateError) {
        const message = updateError.message.toLowerCase().includes('jwt') ? 'Session expired — sign in again.' : updateError.message;
        setError(message);
        return;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from('cases')
        .select(
          'id, firm_id, client_name, matter_type, status, intake_summary, internal_notes, last_activity_at, created_at, updated_at',
        )
        .eq('id', record.id)
        .limit(1);

      if (refreshError) {
        setError(refreshError.message);
        return;
      }
      const row = Array.isArray(refreshed) && refreshed.length > 0 ? (refreshed[0] as CaseRecord) : null;
      setRecord(row);
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!caseId || !selectedFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setUploadError(sessionError.message);
        return;
      }
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setUploadError('Please sign in to upload files.');
        return;
      }

      const formData = new FormData();
      formData.append('caseId', caseId);
      formData.append('file', selectedFile);

      const res = await fetch('/api/myclient/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || 'Unable to upload document.');
        return;
      }

      setSelectedFile(null);
      await loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    setDownloadId(documentId);
    setDocumentsError(null);
    try {
      const doc = documents.find((item) => item.id === documentId);
      if (!doc?.storage_path) {
        setDocumentsError('Document is missing a storage path.');
        return;
      }

      const { data, error } = await supabase.storage.from('case-documents').createSignedUrl(doc.storage_path, 60);
      if (error || !data?.signedUrl) {
        setDocumentsError(error?.message || 'Unable to generate download link.');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : 'Unable to download document.');
    } finally {
      setDownloadId(null);
    }
  };

  return (
    <>
      <Head>
        <title>MyClient | Case Detail</title>
      </Head>
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/myclient/cases" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold text-white">
            {record?.client_name ? 'Case Detail' : 'Case Detail'}
          </h1>
        </div>

        {state.loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>}

        {loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}

        {!loading && state.authed && state.firmId && !record && !error && (
          <p className="mt-6 text-[color:var(--text-2)]">Case not found.</p>
        )}

        {record && (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-white">{record.client_name}</h2>
                <p className="mt-2 text-sm text-[color:var(--text-2)]">Matter type: {record.matter_type}</p>
              </div>
              <span className="rounded-full border border-white/15 bg-[var(--surface-0)] px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--text-2)]">
                {record.status}
              </span>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm text-[color:var(--text-2)]">
                  Client name
                  <input
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.client_name}
                    onChange={handleChange('client_name')}
                  />
                </label>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Matter type
                  <input
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.matter_type}
                    onChange={handleChange('matter_type')}
                  />
                </label>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Status
                  <select
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.status}
                    onChange={handleChange('status')}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Internal notes
                  <textarea
                    className="mt-2 h-40 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.internal_notes ?? ''}
                    onChange={handleChange('internal_notes')}
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4 text-sm text-[color:var(--text-2)] md:grid-cols-3">
              <div>
                <p className="text-white">Created</p>
                <p>{new Date(record.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white">Last activity</p>
                <p>{new Date(record.last_activity_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white">Updated</p>
                <p>{new Date(record.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {message && <span className="text-sm text-green-300">{message}</span>}
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Documents</h2>
                  <p className="text-sm text-[color:var(--text-2)]">Case files uploaded to this matter.</p>
                </div>
              </div>

              {documentsError && (
                <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {documentsError}
                </div>
              )}

              <div className="mt-4 grid gap-4">
                {documentsLoading ? (
                  <p className="text-sm text-[color:var(--text-2)]">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-2)]">No documents uploaded yet.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {documents.map((doc) => (
                      <li key={doc.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-white">{doc.filename}</p>
                          <p className="text-xs text-[color:var(--text-2)]">{new Date(doc.created_at).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleDownload(doc.id)}
                          disabled={downloadId === doc.id}
                          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white disabled:opacity-60"
                        >
                          {downloadId === doc.id ? 'Preparing…' : 'Download'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                <p className="text-sm text-[color:var(--text-2)]">Upload a document (PDF, image, or doc).</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    className="w-full text-sm text-[color:var(--text-2)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--surface-0)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
                  >
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                {uploadError && <p className="mt-3 text-sm text-red-200">{uploadError}</p>}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
