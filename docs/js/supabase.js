// supabase.js — Supabase client initialization
// Project: uzcmyhoyvzcajmaqrnsb
// This key is public (anon key) — safe for client-side use.
// Get your anon key from: https://supabase.com/dashboard/project/uzcmyhoyvzcajmaqrnsb/settings/api

const SUPABASE_URL = 'https://uzcmyhoyvzcajmaqrnsb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Y215aG95dnpjYWptYXFybnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4ODg1NjUsImV4cCI6MjA5ODQ2NDU2NX0.Z59zi67QI0RgOK3IKfV7uc1cW8qZdw9GZpghLu5yynQ';

// Create client only once
let _supabase = null;

function getSupabase() {
    if (_supabase) return _supabase;
    // Load from CDN if not already available via supabase-js script tag
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase JS library not loaded. Add the script tag to your HTML.');
        _supabase = null;
    }
    return _supabase;
}
