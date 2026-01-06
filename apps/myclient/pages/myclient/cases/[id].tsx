import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import { canEditCases, canEditDocuments, canDeleteDocuments } from '@/lib/permissions';
import { logActivity } from '@/lib/activity';
import { useFirmPlan } from '@/lib/useFirmPlan';
import { canUploadDocument } from '@/lib/plans';
import type { CaseTaskRow } from '@/types/tasks';

type CaseRecord = {
  id: string;
  firm_id: string;
  client_name: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  title: string | null;
  matter_type: string;
  status: string;
  intake_summary: string | null;
  internal_notes: string | null;
  state: string | null;
  county: string | null;
  court_name: string | null;
  case_number: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  filename: string;
  display_name: string | null;
  doc_type: string;
  tags: string[];
  storage_path: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
};

function getCaseDisplay(record: CaseRecord) {
  const displayName =
    record.client_last_name || record.client_first_name
      ? `${record.client_last_name ?? ''}${record.client_first_name ? `, ${record.client_first_name}` : ''}`.trim()
      : record.title || record.client_name;
  const subtitle = [
    record.matter_type,
    [record.county, record.state].filter(Boolean).join(', '),
    record.case_number ? `Case #${record.case_number}` : null,
  ]
    .filter(Boolean)
    .join(' • ');
  return { displayName, subtitle };
}

const STATUS_STYLES: Record<string, string> = {
  open: 'border-emerald-400/40 text-emerald-200',
  paused: 'border-amber-400/40 text-amber-200',
  closed: 'border-slate-400/40 text-slate-200',
};

function sanitizeFilename(name: string) {
  const trimmed = name.replace(/[/\\]/g, '').trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 0 ? safe : 'document';
}

export default function CaseDetailPage() {
  const router = useRouter();
  const { state } = useFirm();
  const { plan, loading: planLoading } = useFirmPlan();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentAction, setDocumentAction] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocType, setEditDocType] = useState('other');
  const [editDocTags, setEditDocTags] = useState('');
  const [tasks, setTasks] = useState<CaseTaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [documentCountLoading, setDocumentCountLoading] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'documents' | 'tasks' | 'activity'>('overview');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesStatus, setNotesStatus] = useState<'Saving…' | 'Saved' | 'Error saving' | null>(null);
  const notesInitialized = useRef(false);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const canEdit = canEditCases(state.role);
  const canEditDocs = canEditDocuments(state.role);
  const canDeleteDocs = canDeleteDocuments(state.role);
  const documentLimitCheck =
    documentCount === null ? { ok: true } : canUploadDocument({ plan, currentDocumentCount: documentCount });
  const documentLimitReached = !planLoading && documentCount !== null && !documentLimitCheck.ok;
  const isPermissionError = (message?: string | null) => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return lower.includes('permission') || lower.includes('policy') || lower.includes('not allowed');
  };

  const caseId = useMemo(() => (typeof router.query.id === 'string' ? router.query.id : null), [router.query.id]);

  const refreshDocumentCount = useCallback(async () => {
    if (!state.authed || !state.firmId) return;
    setDocumentCountLoading(true);
    const { count, error: countError } = await supabase
      .from('case_documents')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', state.firmId)
      .is('deleted_at', null);
    if (countError) {
      setDocumentCount(null);
    } else {
      setDocumentCount(count ?? 0);
    }
    setDocumentCountLoading(false);
  }, [state.authed, state.firmId]);

  useEffect(() => {
    refreshDocumentCount();
  }, [refreshDocumentCount]);

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
          'id, firm_id, client_name, client_first_name, client_last_name, client_email, client_phone, title, matter_type, status, intake_summary, internal_notes, state, county, court_name, case_number, last_activity_at, created_at, updated_at',
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
      .select('id, filename, display_name, doc_type, tags, storage_path, created_at')
      .eq('case_id', caseId)
      .eq('firm_id', state.firmId)
      .not('storage_path', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (docsError) {
      setDocumentsError(docsError.message);
      setDocuments([]);
    } else {
      const normalized = (data ?? []).map((doc) => ({
        ...doc,
        display_name: doc.display_name ?? null,
        doc_type: doc.doc_type ?? 'other',
        tags: doc.tags ?? [],
      }));
      setDocuments(normalized);
    }
    setDocumentsLoading(false);
  }, [caseId, state.authed, state.firmId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!record) return;
    notesInitialized.current = false;
    setNotesDraft(record.internal_notes ?? '');
    setNotesStatus(null);
    const timer = setTimeout(() => {
      notesInitialized.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, [record?.id]);

  useEffect(() => {
    if (!record || !notesInitialized.current || !canEdit) return;
    const handle = setTimeout(async () => {
      if (notesDraft === (record.internal_notes ?? '')) return;
      setNotesStatus('Saving…');
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setNotesStatus('Error saving');
          return;
        }
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          setNotesStatus('Error saving');
          return;
        }

        const clientName = `${record.client_first_name ?? ''} ${record.client_last_name ?? ''}`.trim();
        const { error: updateError } = await supabase
          .from('cases')
          .update({
            client_name: clientName || record.client_name,
            internal_notes: notesDraft,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateError) {
          setNotesStatus('Error saving');
          if (isPermissionError(updateError.message)) {
            setError('You don’t have permission to perform this action. Please contact your firm admin.');
          }
          return;
        }

        setRecord((prev) => (prev ? { ...prev, internal_notes: notesDraft } : prev));
        setNotesStatus('Saved');

        try {
          await supabase.from('case_activity').insert({
            firm_id: record.firm_id,
            case_id: record.id,
            actor_user_id: accessToken ? sessionData.session?.user?.id ?? null : null,
            event_type: 'case_updated',
            message: 'Notes updated',
            metadata: { field: 'internal_notes' },
          });
        } catch {
          // best-effort logging
        }
      } catch (err) {
        setNotesStatus('Error saving');
      }
    }, 800);

    return () => clearTimeout(handle);
  }, [notesDraft, record]);

  const loadActivity = useCallback(async () => {
    if (!state.authed || !state.firmId || !caseId) return;
    setActivityLoading(true);
    setActivityError(null);
    const { data, error: activityError } = await supabase
      .from('case_activity')
      .select('id, event_type, message, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityError) {
      setActivityError(activityError.message);
      setActivityRows([]);
    } else {
      setActivityRows(data ?? []);
    }
    setActivityLoading(false);
  }, [caseId, state.authed, state.firmId]);

  useEffect(() => {
    if (activeTab !== 'activity') return;
    loadActivity();
  }, [activeTab, loadActivity]);

  const loadTasks = useCallback(async () => {
    if (!state.authed || !state.firmId || !caseId) return;
    setTasksLoading(true);
    setTasksError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setTasksError(sessionError?.message || 'Please sign in.');
      setTasksLoading(false);
      return;
    }

    const params = new URLSearchParams({ firmId: state.firmId, caseId });
    const res = await fetch(`/api/myclient/tasks/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      setTasksError(payload.error || 'Unable to load tasks.');
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    setTasks(Array.isArray(payload.tasks) ? payload.tasks : []);
    setTasksLoading(false);
  }, [caseId, state.authed, state.firmId]);

  useEffect(() => {
    if (activeTab !== 'tasks') return;
    loadTasks();
  }, [activeTab, loadTasks]);

  const handleAddTask = async () => {
    setTaskActionError(null);
    if (!newTaskTitle.trim()) {
      setTaskActionError('Task title is required.');
      return;
    }
    if (!newTaskDue) {
      setTaskActionError('Due date is required.');
      return;
    }
    if (!record || !state.firmId) return;
    if (!canEdit) {
      setTaskActionError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setTaskActionError(sessionError?.message || 'Please sign in.');
      return;
    }

    const res = await fetch('/api/myclient/tasks/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        firmId: state.firmId,
        caseId: record.id,
        title: newTaskTitle.trim(),
        description: null,
        due_date: newTaskDue,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      const msg = payload.error || 'Unable to add task.';
      setTaskActionError(
        isPermissionError(msg)
          ? 'You don’t have permission to perform this action. Please contact your firm admin.'
          : msg,
      );
      return;
    }

    const data = payload.task as CaseTaskRow;
    setTasks((prev) => [data, ...prev]);
    setNewTaskTitle('');
    setNewTaskDue('');
    await logActivity(supabase, {
      firm_id: state.firmId,
      case_id: record.id,
      actor_user_id: sessionData.session?.user?.id ?? null,
      event_type: 'task_created',
      message: `Task created: ${data.title}`,
      metadata: { due_date: data.due_date },
    });
  };

  const handleToggleTask = async (task: CaseTaskRow, nextStatus: 'open' | 'done') => {
    setTaskActionError(null);
    if (!record || !state.firmId) return;
    if (!canEdit) {
      setTaskActionError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setTaskActionError(sessionError?.message || 'Please sign in.');
      return;
    }

    const res = await fetch('/api/myclient/tasks/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        firmId: state.firmId,
        taskId: task.id,
        updates: { status: nextStatus },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      const msg = payload.error || 'Unable to update task.';
      setTaskActionError(
        isPermissionError(msg)
          ? 'You don’t have permission to perform this action. Please contact your firm admin.'
          : msg,
      );
      return;
    }

    const updated = payload.task as CaseTaskRow;
    setTasks((prev) => prev.map((row) => (row.id === task.id ? { ...row, ...updated } : row)));

    await logActivity(supabase, {
      firm_id: state.firmId,
      case_id: record.id,
      actor_user_id: state.userId,
      event_type: 'task_completed',
      message: nextStatus === 'done' ? `Task completed: ${task.title}` : `Task reopened: ${task.title}`,
      metadata: {},
    });
  };

  const handleUpload = async () => {
    if (!caseId || !selectedFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }
    if (!state.firmId) {
      setUploadError('No firm linked yet.');
      return;
    }
    if (!canEditDocs) {
      setUploadError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }
    if (documentLimitReached) {
      setUploadError(`${documentLimitCheck.reason} Upgrade to Pro to upload more documents.`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const actorId = sessionData.session?.user?.id ?? null;

      const { data: draft, error: draftError } = await supabase
        .from('case_documents')
        .insert({
          firm_id: state.firmId,
          case_id: caseId,
          filename: selectedFile.name,
          display_name: selectedFile.name,
          doc_type: 'other',
          tags: [],
          storage_path: null,
        })
        .select('id')
        .single();

      if (draftError || !draft?.id) {
        setUploadError(
          isPermissionError(draftError?.message)
            ? 'You don’t have permission to perform this action. Please contact your firm admin.'
            : draftError?.message || 'Unable to create upload record.',
        );
        return;
      }

      const safeName = sanitizeFilename(selectedFile.name);
      const storagePath = `${state.firmId}/cases/${caseId}/${draft.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(storagePath, selectedFile, {
          upsert: false,
          contentType: selectedFile.type || 'application/octet-stream',
        });

      if (uploadError) {
        await supabase.from('case_documents').update({ deleted_at: new Date().toISOString() }).eq('id', draft.id);
        setUploadError(uploadError.message || 'Unable to upload document.');
        return;
      }

      const { error: updateError } = await supabase
        .from('case_documents')
        .update({
          storage_path: storagePath,
          size_bytes: selectedFile.size,
          mime_type: selectedFile.type || null,
        })
        .eq('id', draft.id);

      if (updateError) {
        await supabase.from('case_documents').update({ deleted_at: new Date().toISOString() }).eq('id', draft.id);
        setUploadError(updateError.message || 'Unable to finalize upload.');
        return;
      }

      try {
        await supabase.from('case_activity').insert({
          firm_id: state.firmId,
          case_id: caseId,
          actor_user_id: actorId,
          event_type: 'document_uploaded',
          message: `Document uploaded: ${selectedFile.name}`,
          metadata: { file_name: selectedFile.name },
        });
      } catch {
        // best-effort logging
      }

      setSelectedFile(null);
      await loadDocuments();
      await refreshDocumentCount();
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

  const startDocEdit = (doc: DocumentRow) => {
    setEditingDocId(doc.id);
    setEditDocName(doc.display_name || doc.filename);
    setEditDocType(doc.doc_type || 'other');
    setEditDocTags(doc.tags.join(', '));
    setDocumentAction(null);
    setDocumentActionError(null);
  };

  const handleDocSave = async (docId: string) => {
    setDocumentAction(null);
    setDocumentActionError(null);
    if (!canEditDocs) {
      setDocumentActionError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }
    const tags = editDocTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const original = documents.find((doc) => doc.id === docId);
    const { error: updateError } = await supabase
      .from('case_documents')
      .update({ display_name: editDocName.trim() || null, doc_type: editDocType, tags })
      .eq('id', docId);

    if (updateError) {
      setDocumentActionError(
        isPermissionError(updateError.message)
          ? 'You don’t have permission to perform this action. Please contact your firm admin.'
          : updateError.message,
      );
      return;
    }

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? { ...doc, display_name: editDocName.trim() || null, doc_type: editDocType, tags }
          : doc,
      ),
    );
    if (original && state.firmId) {
      if ((original.display_name || original.filename) !== editDocName.trim()) {
        await logActivity(supabase, {
          firm_id: state.firmId,
          case_id: caseId,
          actor_user_id: state.userId,
          event_type: 'document_renamed',
          message: `Document renamed: ${(original.display_name || original.filename)} → ${editDocName.trim()}`,
          metadata: { document_id: docId },
        });
      }
      if (original.doc_type !== editDocType || original.tags.join(',') !== tags.join(',')) {
        await logActivity(supabase, {
          firm_id: state.firmId,
          case_id: caseId,
          actor_user_id: state.userId,
          event_type: 'document_updated',
          message: `Document updated: ${editDocName.trim() || original.filename}`,
          metadata: { document_id: docId },
        });
      }
    }
    setDocumentAction('Saved');
    setEditingDocId(null);
  };

  const handleDocDelete = async (docId: string) => {
    setDocumentAction(null);
    setDocumentActionError(null);
    if (!canDeleteDocs) {
      setDocumentActionError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }
    const confirmed = window.confirm('Delete this document? This cannot be undone.');
    if (!confirmed) return;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setDocumentActionError(sessionError?.message || 'Please sign in.');
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
      setDocumentActionError(
        isPermissionError(data.error)
          ? 'You don’t have permission to perform this action. Please contact your firm admin.'
          : data.error || 'Unable to delete document.',
      );
      return;
    }
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setDocumentAction('Deleted');
    await refreshDocumentCount();
  };

  return (
    <>
      <Head>
        <title>MyClient | Case Detail</title>
      </Head>
      <div className="mx-auto max-w-6xl rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
        <div className="flex flex-col gap-4">
          <Link href="/myclient/cases" className="text-sm text-[color:var(--muted)] hover:text-white transition">
            ← Back to Active Cases
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold text-white">Case Detail</h1>
            {record && (
              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${
                  STATUS_STYLES[record.status.toLowerCase()] ?? 'border-white/15 text-[color:var(--muted)]'
                }`}
              >
                {record.status}
              </span>
            )}
          </div>
        </div>

        {state.loading && <p className="mt-6 text-[color:var(--muted)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--muted)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && <p className="mt-6 text-[color:var(--muted)]">No firm linked yet.</p>}

        {loading && <p className="mt-6 text-[color:var(--muted)]">Loading...</p>}

        {!loading && state.authed && state.firmId && !record && !error && (
          <p className="mt-6 text-[color:var(--muted)]">Case not found.</p>
        )}

        {record && (
          <>
            <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-0)] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {(() => {
                    const { displayName, subtitle } = getCaseDisplay(record);
                    return (
                      <>
                        <h2 className="text-3xl font-semibold text-white">{displayName}</h2>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">{subtitle || 'Case details'}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-6 border-b border-[color:var(--border)] text-sm text-[color:var(--muted)]">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'notes', label: 'Notes' },
                { key: 'documents', label: 'Documents' },
                { key: 'tasks', label: 'Tasks' },
                { key: 'activity', label: 'Activity' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`mr-6 border-b-2 pb-3 transition ${
                    activeTab === tab.key ? 'border-[color:var(--accent-light)] text-white' : 'border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h3 className="text-sm font-semibold text-white">Client</h3>
                  <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                    <p>First name: <span className="text-white">{record.client_first_name ?? '—'}</span></p>
                    <p>Last name: <span className="text-white">{record.client_last_name ?? '—'}</span></p>
                    <p>Email: <span className="text-white">{record.client_email ?? '—'}</span></p>
                    <p>Phone: <span className="text-white">{record.client_phone ?? '—'}</span></p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h3 className="text-sm font-semibold text-white">Matter</h3>
                  <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                    <p>Matter type: <span className="text-white">{record.matter_type}</span></p>
                    <p>Status: <span className="text-white">{record.status}</span></p>
                    <p>Created: <span className="text-white">{new Date(record.created_at).toLocaleString()}</span></p>
                    <p>Last updated: <span className="text-white">{new Date(record.updated_at).toLocaleString()}</span></p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h3 className="text-sm font-semibold text-white">Jurisdiction</h3>
                  <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                    <p>State: <span className="text-white">{record.state ?? '—'}</span></p>
                    <p>County: <span className="text-white">{record.county ?? '—'}</span></p>
                    <p>Court: <span className="text-white">{record.court_name ?? '—'}</span></p>
                    <p>Case number: <span className="text-white">{record.case_number ?? '—'}</span></p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  rows={8}
                  readOnly={!canEdit}
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface-1)] px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
                <p className="mt-3 text-xs text-[color:var(--text-2)]">
                  {canEdit ? notesStatus ?? 'Autosave enabled.' : 'Read-only access.'}
                </p>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-6">
                {documentsError && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {documentsError}
                  </div>
                )}
                {documentActionError && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {documentActionError}
                  </div>
                )}
                {documentAction && (
                  <div className="mb-4 rounded-lg border border-white/10 bg-[var(--surface-1)] px-4 py-2 text-sm text-white">
                    {documentAction}
                  </div>
                )}

                <div className="grid gap-4">
                  {documentsLoading ? (
                    <p className="text-sm text-[color:var(--text-2)]">Loading documents...</p>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-[color:var(--text-2)]">No documents uploaded yet.</p>
                  ) : (
                    <ul className="divide-y divide-white/10">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-white">{doc.display_name || doc.filename}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-2)]">
                          <span className="rounded-full border border-white/15 px-2 py-0.5 uppercase tracking-wide">{doc.doc_type}</span>
                          {doc.tags.length > 0 && (
                            <span>
                              {doc.tags.slice(0, 2).join(', ')}
                              {doc.tags.length > 2 ? ` +${doc.tags.length - 2}` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[color:var(--text-2)]">{new Date(doc.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {editingDocId === doc.id ? (
                          <>
                            <input
                              value={editDocName}
                              onChange={(event) => setEditDocName(event.target.value)}
                              disabled={!canEditDocs}
                              className="w-full rounded-md border border-white/10 bg-[var(--surface-1)] px-2 py-1 text-xs text-white outline-none"
                              placeholder="Display name"
                            />
                            <input
                              value={editDocType}
                              onChange={(event) => setEditDocType(event.target.value)}
                              disabled={!canEditDocs}
                              className="w-full rounded-md border border-white/10 bg-[var(--surface-1)] px-2 py-1 text-xs text-white outline-none"
                              placeholder="Type"
                            />
                            <input
                              value={editDocTags}
                              onChange={(event) => setEditDocTags(event.target.value)}
                              disabled={!canEditDocs}
                              className="w-full rounded-md border border-white/10 bg-[var(--surface-1)] px-2 py-1 text-xs text-white outline-none"
                              placeholder="Tags (comma separated)"
                            />
                            <button
                              onClick={() => handleDocSave(doc.id)}
                              disabled={!canEditDocs}
                              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDocId(null)}
                              className="rounded-lg border border-white/10 px-3 py-2 text-xs uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {canEditDocs && (
                              <button
                                onClick={() => startDocEdit(doc)}
                                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                              >
                                Rename/Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(doc.id)}
                              disabled={downloadId === doc.id}
                              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white disabled:opacity-60"
                            >
                              {downloadId === doc.id ? 'Preparing…' : 'Download'}
                            </button>
                            {canDeleteDocs && (
                              <button
                                onClick={() => handleDocDelete(doc.id)}
                                className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 hover:text-white"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                  <p className="text-sm text-[color:var(--text-2)]">Upload a document (PDF, image, or doc).</p>
                  {documentLimitReached && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-[color:var(--text-2)]">
                      {documentLimitCheck.reason} Upgrade to Pro to upload more documents.
                      <Link href="/myclient/upgrade" className="ml-2 text-white underline underline-offset-4">
                        Upgrade
                      </Link>
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="file"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                      disabled={!canEditDocs || documentLimitReached || documentCountLoading}
                      className="w-full text-sm text-[color:var(--text-2)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--surface-0)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                    />
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !selectedFile || !canEditDocs || documentLimitReached || documentCountLoading}
                      className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
                    >
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  {!canEditDocs && (
                    <p className="mt-3 text-sm text-[color:var(--text-2)]">
                      You have read-only access. Please contact your firm admin to upload documents.
                    </p>
                  )}
                  {uploadError && <p className="mt-3 text-sm text-red-200">{uploadError}</p>}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="mt-6 space-y-6">
                {taskActionError && (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {taskActionError}
                  </div>
                )}
                {!canEdit && (
                  <p className="text-sm text-[color:var(--text-2)]">Read-only access to tasks.</p>
                )}
                {canEdit && (
                  <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4">
                    <h3 className="text-sm font-semibold text-white">Add task</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
                      <input
                        value={newTaskTitle}
                        onChange={(event) => setNewTaskTitle(event.target.value)}
                        placeholder="Task title"
                        className="w-full rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                      <input
                        type="date"
                        value={newTaskDue}
                        onChange={(event) => setNewTaskDue(event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                      <button
                        onClick={handleAddTask}
                        className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)]"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4">
                  <h3 className="text-sm font-semibold text-white">Open tasks</h3>
                  {tasksLoading ? (
                    <p className="mt-3 text-sm text-[color:var(--text-2)]">Loading tasks...</p>
                  ) : tasks.filter((task) => task.status === 'open').length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--text-2)]">No open tasks.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                      {tasks
                        .filter((task) => task.status === 'open')
                        .map((task) => (
                          <li key={task.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-white">{task.title}</p>
                              {task.due_date && <p className="text-xs">Due {new Date(task.due_date).toLocaleDateString()}</p>}
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => handleToggleTask(task, 'done')}
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                              >
                                Mark done
                              </button>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4">
                  <h3 className="text-sm font-semibold text-white">Completed</h3>
                  {tasks.filter((task) => task.status === 'done').length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--text-2)]">No completed tasks.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                      {tasks
                        .filter((task) => task.status === 'done')
                        .map((task) => (
                          <li key={task.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-white">{task.title}</p>
                              {task.completed_at && <p className="text-xs">Completed {new Date(task.completed_at).toLocaleDateString()}</p>}
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => handleToggleTask(task, 'open')}
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
                              >
                                Reopen
                              </button>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                {tasksError && (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {tasksError}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-6">
                {activityError && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {activityError}
                  </div>
                )}
                {activityLoading ? (
                  <p className="text-sm text-[color:var(--text-2)]">Loading activity…</p>
                ) : activityRows.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-2)]">No activity yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {activityRows.map((item) => {
                      const typeLabel =
                        item.event_type === 'case_created'
                          ? 'Created'
                          : item.event_type === 'case_updated'
                            ? 'Updated'
                            : 'Document';
                      return (
                        <li key={item.id} className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-white">{item.message}</p>
                              <p className="text-xs text-[color:var(--text-2)]">{new Date(item.created_at).toLocaleString()}</p>
                            </div>
                            <span className="rounded-full border border-white/15 px-2 py-1 text-xs uppercase tracking-wide text-[color:var(--text-2)]">
                              {typeLabel}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
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
