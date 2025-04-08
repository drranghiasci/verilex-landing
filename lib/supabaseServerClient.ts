// lib/supabaseServerClient.ts
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../types/supabase'; // Ensure the file '../types/supabase.ts' exists or adjust the path

export const createServerClient = () => {
  return createServerComponentClient<Database>({ cookies });
};
