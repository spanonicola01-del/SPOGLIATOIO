import { createClient } from "@supabase/supabase-js";

// Le chiavi arrivano dalle variabili d'ambiente configurate su Vercel.
// NON scrivere qui le chiavi in chiaro.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);
export const hasSupabase = Boolean(url && key);
