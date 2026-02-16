import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'ourlittleworld-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
});

// Types for our database
export type Profile = {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    couple_id: string | null;
    created_at: string;
    updated_at: string;
};

export type Couple = {
    id: string;
    invite_code: string;
    couple_name: string | null;
    start_date: string | null;
    couple_photo_url: string | null;
    partner_1_nickname: string | null;
    partner_2_nickname: string | null;
    world_theme: string | null;
    created_at: string;
    updated_at: string;
};

export type Transaction = {
    id: string;
    couple_id: string;
    amount: number;
    category: string;
    note: string;
    payer: 'His' | 'Hers' | 'Shared';
    created_by: string;
    transaction_date: string;
    created_at: string;
};

export type Post = {
    id: string;
    couple_id: string;
    author_id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
};
