import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgwmqrinncjoqtiueyln.supabase.co';
const supabaseKey = 'sb_publishable_6bEBk-kZjLE3PIUm5JQfIQ_qTCJGV3K';

export const supabase = createClient(supabaseUrl, supabaseKey);
