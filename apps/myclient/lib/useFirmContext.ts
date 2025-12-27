import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type FirmContextState = {
  loading: boolean;
  authed: boolean;
  email: string | null;
  userId: string | null;
  firmId: string | null;
  role: string | null;
  error: string | null;
};

const initialState: FirmContextState = {
  loading: true,
  authed: false,
  email: null,
  userId: null,
  firmId: null,
  role: null,
  error: null,
};

export function useFirmContext(): { state: FirmContextState; refresh: () => Promise<void> } {
  const [state, setState] = useState<FirmContextState>(initialState);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      setState({
        loading: false,
        authed: false,
        email: null,
        userId: null,
        firmId: null,
        role: null,
        error: error ? error.message : null,
      });
      return;
    }

    const userId = data.session.user.id;
    const email = data.session.user.email ?? null;

    const { data: members, error: memberError } = await supabase
      .from('firm_members')
      .select('firm_id, role')
      .eq('user_id', userId)
      .limit(1);

    const member = Array.isArray(members) && members.length > 0 ? members[0] : null;

    setState({
      loading: false,
      authed: true,
      email,
      userId,
      firmId: member?.firm_id ?? null,
      role: member?.role ?? null,
      error: memberError ? memberError.message : null,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, refresh };
}
