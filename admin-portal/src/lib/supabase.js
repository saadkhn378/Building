import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljhtpyxhfgivqaxbnvhp.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_T-XJ6H5OgmM6Smu3IFQFIw_EvJpqYSb';

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
