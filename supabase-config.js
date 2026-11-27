/* ========================================================= FantaMultiple - Configurazione Supabase 1. SUPABASE_URL : Project URL (es. https://abcdefgh.supabase.co) 2. SUPABASE_KEY : chiave pubblica "Publishable key" (sb_publishable_...) oppure, nei progetti più vecchi, la "anon public" key 3. ADMIN_EMAIL : email dell'utente admin creato in Authentication (deve essere uguale a quella scritta in supabase.sql) Se SUPABASE_URL resta vuoto, il sito funziona in locale (localStorage). La chiave pubblica può stare nel sito: la protezione la fanno le regole (Row Level Security) create con supabase.sql. NON inserire MAI qui la chiave "secret" o "service_role". ========================================================= */

const SUPABASE_URL = "https://ttahtaxaqzwmddgalagn.supabase.co";
const SUPABASE_KEY = "sb_publishable_SRTjGbtB7vwaata0whY3zw_jBJMocpl";
const ADMIN_EMAIL = "admin@fantamultiple.it";
