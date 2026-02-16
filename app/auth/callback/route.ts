import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';

    // If we have a token_hash, this is an email confirmation
    if (token_hash && type) {
        // Redirect to Supabase to handle the confirmation, then back to our app
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const redirectTo = `${requestUrl.origin}${next}`;

        return NextResponse.redirect(
            `${supabaseUrl}/auth/v1/verify?token_hash=${token_hash}&type=${type}&redirect_to=${redirectTo}`
        );
    }

    // Otherwise, just redirect to the next page
    return NextResponse.redirect(new URL(next, request.url));
}
