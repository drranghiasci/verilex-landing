import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ResolveFirmResponse,
  type DocumentInput,
  type IntakeDocument,
  type IntakeMessage,
  type IntakeRecord,
  type MessageInput,
  loadIntake,
  resolveFirm,
  saveIntake,
  startIntake,
  submitIntake,
} from '../../../../lib/intake/intakeApi';

type UseIntakeSessionOptions = {
  firmSlug: string;
  token?: string;
  autoSave?: boolean;
  debounceMs?: number;
  currentStepId?: string;
};

type SaveResult = {
  ok: boolean;
  locked?: boolean;
};

export function useIntakeSession(options: UseIntakeSessionOptions) {
  const { firmSlug, autoSave = true, debounceMs = 800, currentStepId } = options;
  const [token, setToken] = useState(options.token ?? '');
  const [firm, setFirm] = useState<ResolveFirmResponse | null>(null);
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [documents, setDocuments] = useState<IntakeDocument[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const pendingPatchRef = useRef<Record<string, unknown>>({});
  const pendingMessagesRef = useRef<MessageInput[]>([]);
  const pendingDocumentsRef = useRef<DocumentInput[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStepRef = useRef<string | undefined>(currentStepId);

  const storageKey = useMemo(() => `intake:token:${firmSlug}`, [firmSlug]);

  useEffect(() => {
    if (!firmSlug) return;
    let active = true;
    const loadFirm = async () => {
      try {
        const result = await resolveFirm(firmSlug);
        if (active) setFirm(result);
      } catch {
        if (active) setFirm(null);
      }
    };
    loadFirm();
    return () => {
      active = false;
    };
  }, [firmSlug]);

  useEffect(() => {
    if (token || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setToken(stored);
  }, [storageKey, token]);

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, token);
  }, [storageKey, token]);

  const applyLoad = useCallback((data: {
    intake: IntakeRecord;
    messages: IntakeMessage[];
    documents: IntakeDocument[];
    locked: boolean;
  }) => {
    setIntake(data.intake);
    setPayload(data.intake.raw_payload ?? {});
    setMessages(data.messages ?? []);
    setDocuments(data.documents ?? []);
    setLocked(data.locked);
  }, []);

  const start = useCallback(
    async (prefill?: {
      matter_type?: string;
      urgency_level?: string;
      intake_channel?: string;
      language_preference?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const startResult = await startIntake({
          firmSlug,
          matter_type: prefill?.matter_type,
          urgency_level: prefill?.urgency_level,
          intake_channel: prefill?.intake_channel,
          language_preference: prefill?.language_preference,
        });
        setToken(startResult.token);
        const loaded = await loadIntake({ token: startResult.token });
        applyLoad(loaded);
        return startResult;
      } catch (err) {
      if (err && typeof err === 'object' && 'requestId' in err && typeof err.requestId === 'string') {
        setError({ message: 'Unable to start intake. Please try again.', requestId: err.requestId });
      } else {
        setError({ message: err instanceof Error ? err.message : 'Unable to start intake' });
      }
      throw err;
    } finally {
      setLoading(false);
      }
    },
    [applyLoad, firmSlug],
  );

  const load = useCallback(
    async (overrideToken?: string) => {
      const activeToken = overrideToken ?? token;
      if (!activeToken) {
        setError({ message: 'Missing intake token' });
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        if (overrideToken) {
          setToken(overrideToken);
        }
        const result = await loadIntake({ token: activeToken });
        applyLoad(result);
        return result;
      } catch (err) {
        if (err && typeof err === 'object' && 'requestId' in err && typeof err.requestId === 'string') {
          setError({ message: 'Unable to load intake. Please try again.', requestId: err.requestId });
        } else {
          setError({ message: err instanceof Error ? err.message : 'Unable to load intake' });
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [applyLoad, token],
  );

  const queuePatch = useCallback((patch: Record<string, unknown>) => {
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    setPayload((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateField = useCallback(
    (key: string, value: unknown) => {
      queuePatch({ [key]: value });
    },
    [queuePatch],
  );

  const queueMessages = useCallback((nextMessages: MessageInput[]) => {
    if (!nextMessages.length) return;
    pendingMessagesRef.current = [...pendingMessagesRef.current, ...nextMessages];
  }, []);

  const queueDocuments = useCallback((nextDocuments: DocumentInput[]) => {
    if (!nextDocuments.length) return;
    pendingDocumentsRef.current = [...pendingDocumentsRef.current, ...nextDocuments];
  }, []);

  const flushPending = useCallback(async (): Promise<SaveResult> => {
    if (!token || !intake?.id) {
      return { ok: false };
    }
    if (locked) {
      return { ok: false, locked: true };
    }

    const patch = pendingPatchRef.current;
    const nextMessages = pendingMessagesRef.current;
    const nextDocuments = pendingDocumentsRef.current;

    if (!Object.keys(patch).length && !nextMessages.length && !nextDocuments.length) {
      return { ok: true };
    }

    setLoading(true);
      setError(null);
    try {
      const result = await saveIntake({
        token,
        intakeId: intake.id,
        patch,
        messages: nextMessages,
        documents: nextDocuments,
      });

      if (!result.ok && result.locked) {
        setLocked(true);
        return { ok: false, locked: true };
      }

      if (result.ok) {
        pendingPatchRef.current = {};
        pendingMessagesRef.current = [];
        pendingDocumentsRef.current = [];

        if (intake) {
          setIntake({
            ...intake,
            updated_at: result.updated_at ?? intake.updated_at ?? null,
          });
        }

        if (nextMessages.length > 0) {
          const appended: IntakeMessage[] = nextMessages.map((message) => ({ ...message }));
          if (typeof result.last_seq === 'number') {
            const startSeq = result.last_seq - appended.length + 1;
            appended.forEach((message, idx) => {
              message.seq = startSeq + idx;
            });
          }
          setMessages((prev) => [...prev, ...appended]);
        }

        if (nextDocuments.length > 0) {
          setDocuments((prev) => [...prev, ...nextDocuments]);
        }
      }

      return result.ok ? { ok: true } : { ok: false, locked: true };
    } catch (err) {
      if (err && typeof err === 'object' && 'requestId' in err && typeof err.requestId === 'string') {
        setError({ message: 'Unable to save intake. Please try again.', requestId: err.requestId });
      } else {
        setError({ message: err instanceof Error ? err.message : 'Unable to save intake' });
      }
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [intake, locked, token]);

  const scheduleAutoSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void flushPending();
    }, debounceMs);
  }, [debounceMs, flushPending]);

  useEffect(() => {
    if (!autoSave) return;
    if (!currentStepId) return;
    if (lastStepRef.current && lastStepRef.current !== currentStepId) {
      scheduleAutoSave();
    }
    lastStepRef.current = currentStepId;
  }, [autoSave, currentStepId, scheduleAutoSave]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const submit = useCallback(async () => {
    if (!token || !intake?.id) {
      setError({ message: 'Missing intake token' });
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await submitIntake({ token, intakeId: intake.id, patch: payload });
      if (result.ok) {
        setLocked(true);
        setIntake((prev) =>
          prev
            ? { ...prev, status: 'submitted', submitted_at: result.submitted_at ?? prev.submitted_at }
            : prev,
        );
        return result;
      }
      if (result.locked) {
        setLocked(true);
      }
      return result;
    } catch (err) {
      if (err && typeof err === 'object' && 'requestId' in err && typeof err.requestId === 'string') {
        setError({ message: 'Unable to submit intake. Please try again.', requestId: err.requestId });
      } else {
        setError({ message: err instanceof Error ? err.message : 'Unable to submit intake' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [intake, payload, token]);

  return {
    token,
    setToken,
    firm,
    intake,
    payload,
    messages,
    documents,
    locked,
    loading,
    error,
    resolveFirm,
    start,
    load,
    submit,
    queuePatch,
    updateField,
    queueMessages,
    queueDocuments,
    flushPending,
  };
}
