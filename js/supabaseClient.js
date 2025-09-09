const SUPABASE_URL = window.SUPABASE_URL || 'https://jxlxpumcoihfapmrsaqd.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHhwdW1jb2loZmFwbXJzYXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjE3MDcsImV4cCI6MjA3Mjk5NzcwN30.PJiDPZ_Dqli_42isJexeYgsf0ebWbCSOwHtR7lsQTN0';

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

window.supabaseClient = supabaseClient;
