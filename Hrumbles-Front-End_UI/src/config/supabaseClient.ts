
import { createClient } from "@supabase/supabase-js";
import type { Database } from './type';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "https://kbpeyfietrwlhwcwqhjw.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGV5ZmlldHJ3bGh3Y3dxaGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NDA5NjEsImV4cCI6MjA1NDQxNjk2MX0.A-K4DO6D2qQZ66qIXY4BlmoHxc-W5B0itV-HAAM84YA";

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export default supabase;
