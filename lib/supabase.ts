import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)

// For API routes - create admin client
export function createClient() {
  return createSupabaseClient<Database>(
    supabaseUrl, 
    supabaseServiceKey || supabaseAnonKey
  )
}

export default supabase