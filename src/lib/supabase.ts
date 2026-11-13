import { createClient } from '@supabase/supabase-js'

// Placeholders evitam que createClient lance no import quando as variáveis
// não existem (testes, build sem .env.local).
const url = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key-placeholder'

export const supabase = createClient(url, anonKey)
