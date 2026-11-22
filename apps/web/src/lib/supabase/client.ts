import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://hrzzxtjuiofivnytqldj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyenp4dGp1aW9maXZueXRxbGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcyODIsImV4cCI6MjEwODM1MzI4Mn0.wvk5DbgdpfMdjgs4m9niv7TXXoNbKmRoYhmaJ-XnM-s';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return createBrowserClient(url, anonKey);
}
