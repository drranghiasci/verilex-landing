import type { SupabaseClient } from '@supabase/supabase-js';

type ActivityPayload = {
  firm_id: string;
  case_id?: string | null;
  actor_user_id?: string | null;
  event_type: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(supabase: SupabaseClient, payload: ActivityPayload) {
  try {
    await supabase.from('case_activity').insert({
      firm_id: payload.firm_id,
      case_id: payload.case_id ?? null,
      actor_user_id: payload.actor_user_id ?? null,
      event_type: payload.event_type,
      message: payload.message,
      metadata: payload.metadata ?? {},
    });
  } catch {
    // best-effort logging
  }
}
