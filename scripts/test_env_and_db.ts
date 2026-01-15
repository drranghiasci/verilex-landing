
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading env from ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env.local:', result.error);
} else {
    console.log('Loaded .env.local successfully.');
}

// Check keys
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INTAKE_TOKEN_SECRET'];
const missing = required.filter(k => !process.env[k]);

if (missing.length > 0) {
    console.error('Missing keys:', missing);
    process.exit(1);
} else {
    console.log('All required keys present.');
}

// Attempt to initialize supabaseAdmin
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log(`Connecting to Supabase at ${supabaseUrl.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
});

async function testConnection() {
    const { count, error } = await supabase.from('firms').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Supabase connection failed:', error);
    } else {
        console.log('Supabase connection successful. Firms count:', count);
    }
}

testConnection();
