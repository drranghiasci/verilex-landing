import type { SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('seq helpers are server-only');
}

type SeqQueryResult = {
  startSeq: number;
  lastSeq: number;
};

export async function allocateMessageSeqRange(
  client: SupabaseClient,
  intakeId: string,
  firmId: string,
  count: number,
): Promise<SeqQueryResult> {
  if (count <= 0) {
    return { startSeq: 0, lastSeq: 0 };
  }

  const { data, error } = await client
    .from('intake_messages')
    .select('seq')
    .eq('intake_id', intakeId)
    .eq('firm_id', firmId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle<{ seq: number }>();

  if (error) {
    throw new Error('Unable to allocate message sequence');
  }

  const maxSeq = typeof data?.seq === 'number' ? data.seq : 0;
  const startSeq = maxSeq + 1;
  return { startSeq, lastSeq: startSeq + count - 1 };
}
