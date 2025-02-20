import { createClient } from "@supabase/supabase-js";
import type { Database } from './type';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export default supabase;