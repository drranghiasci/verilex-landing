
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function test() {
    console.log('Testing supabaseAdmin import (dynamic)...');
    // Dynamic import to ensure process.env is populated
    const { supabaseAdmin } = await import('../lib/server/supabaseAdmin');

    const { count, error } = await supabaseAdmin.from('firms').select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('Success! Firms count:', count);
}

test();
