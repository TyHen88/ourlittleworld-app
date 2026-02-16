import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');
    const nextParam = requestUrl.searchParams.get('next') ?? '/dashboard';

    const isSafeNextPath = (value: string) => {
        if (!value.startsWith('/')) return false;
        if (value.startsWith('//')) return false;
        return true;
    };

    const next = isSafeNextPath(nextParam) ? nextParam : '/dashboard';

    // If we have a token_hash, this is an email confirmation
    if (token_hash && type) {
        // Redirect to Supabase to handle the confirmation, then back to our app
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const redirectTo = new URL(next, requestUrl.origin);

        const verifyUrl = new URL('/auth/v1/verify', supabaseUrl);
        verifyUrl.searchParams.set('token_hash', token_hash);
        verifyUrl.searchParams.set('type', type);
        verifyUrl.searchParams.set('redirect_to', redirectTo.toString());

        return NextResponse.redirect(
            verifyUrl
        );
    }

    // Otherwise, just redirect to the next page
    return NextResponse.redirect(new URL(next, request.url));
}
