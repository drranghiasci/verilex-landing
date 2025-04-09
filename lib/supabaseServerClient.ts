import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

export const createServerSupabaseClient = () => {
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: async () => {
        const allCookies = await cookies();
        return allCookies.getAll().map(cookie => ({ name: cookie.name, value: cookie.value }));
      },
      setAll: () => {
        throw new Error('Setting cookies is not supported in this environment.');
      }
    }
  });
};
