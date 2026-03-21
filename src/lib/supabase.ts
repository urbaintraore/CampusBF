import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uhhofqcgelrplisyjdhd.supabase.co';
const supabaseKey = 'sb_publishable_D3MFPeQSuG8-3CwfMyvBQQ_xNbCXcHG';

export const supabase = createClient(supabaseUrl, supabaseKey);
