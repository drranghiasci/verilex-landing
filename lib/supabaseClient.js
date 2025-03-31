import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlyuskhbjpeiebtfmbcb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5seXVza2hianBlaWVidGZtYmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNzYyNjcsImV4cCI6MjA1ODk1MjI2N30.-88rXdVH4wq642DtUlwV8PUGjPjUCOy3mXhCORRM8bw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
