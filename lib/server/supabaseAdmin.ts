declare const require: (id: string) => any;

if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin is server-only');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const requireFromApp = (() => {
  try {
    const { createRequire } = require('module');
    return createRequire(`${process.cwd()}/`);
  } catch {
    return require;
  }
})();

let createClient: ((...args: any[]) => any) | undefined;
try {
  ({ createClient } = requireFromApp('@supabase/supabase-js'));
} catch (error) {
  throw new Error('Missing @supabase/supabase-js; install it in the app workspace.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
