import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import type { FirmPlan } from '@/lib/plans';

type FirmPlanState = {
  plan: FirmPlan;
  loading: boolean;
  error: string | null;
};

const DEFAULT_PLAN: FirmPlan = 'free';

export function useFirmPlan(): FirmPlanState {
  const { state } = useFirm();
  const [planState, setPlanState] = useState<FirmPlanState>({
    plan: DEFAULT_PLAN,
    loading: true,
    error: null,
  });

  const loadPlan = useCallback(async () => {
    if (!state.authed || !state.firmId) {
      setPlanState({ plan: DEFAULT_PLAN, loading: false, error: null });
      return;
    }

    setPlanState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase
      .from('firms')
      .select('plan')
      .eq('id', state.firmId)
      .single();

    if (error) {
      setPlanState({ plan: DEFAULT_PLAN, loading: false, error: error.message });
      return;
    }

    const plan = (data?.plan as FirmPlan | null) ?? DEFAULT_PLAN;
    setPlanState({ plan, loading: false, error: null });
  }, [state.authed, state.firmId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  return planState;
}
