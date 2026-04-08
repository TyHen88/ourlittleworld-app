"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAutoEnablePushAfterRegister } from "@/lib/push-client";

type GoogleAuthButtonProps = {
    label: string;
    redirectTo?: string;
    autoEnablePushOnReturn?: boolean;
};

function GoogleIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path
                d="M21.8 12.23c0-.68-.06-1.33-.18-1.95H12v3.69h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.77 3.04-4.38 3.04-7.38Z"
                fill="#4285F4"
            />
            <path
                d="M12 22c2.76 0 5.07-.91 6.76-2.46l-3.3-2.56c-.92.62-2.08.99-3.46.99-2.66 0-4.92-1.8-5.73-4.21H2.86v2.64A10 10 0 0 0 12 22Z"
                fill="#34A853"
            />
            <path
                d="M6.27 13.76A5.96 5.96 0 0 1 5.95 12c0-.61.11-1.2.32-1.76V7.6H2.86A10 10 0 0 0 2 12c0 1.62.39 3.15 1.08 4.4l3.19-2.64Z"
                fill="#FBBC05"
            />
            <path
                d="M12 6.03c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.06 2.99 14.75 2 12 2A10 10 0 0 0 3.08 7.6l3.19 2.64c.81-2.41 3.07-4.21 5.73-4.21Z"
                fill="#EA4335"
            />
        </svg>
    );
}

export function GoogleAuthButton({
    label,
    redirectTo = "/onboarding",
    autoEnablePushOnReturn = false,
}: GoogleAuthButtonProps) {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadProviders() {
            try {
                const providers = await getProviders();
                if (active) {
                    setIsAvailable(Boolean(providers?.google));
                }
            } catch (error) {
                console.error("[GOOGLE_PROVIDER_LOAD_ERROR]", error);
                if (active) {
                    setIsAvailable(false);
                }
            } finally {
                if (active) {
                    setIsReady(true);
                }
            }
        }

        void loadProviders();

        return () => {
            active = false;
        };
    }, []);

    if (!isReady || !isAvailable) {
        return null;
    }

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            if (autoEnablePushOnReturn) {
                markAutoEnablePushAfterRegister();
            }
            await signIn("google", { redirectTo });
        } catch (error) {
            console.error("[GOOGLE_SIGNIN_ERROR]", error);
            setLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-14 rounded-3xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    <span>Redirecting...</span>
                </>
            ) : (
                <>
                    <GoogleIcon />
                    <span className="ml-3">{label}</span>
                </>
            )}
        </Button>
    );
}
