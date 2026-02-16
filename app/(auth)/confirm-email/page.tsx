import React, { Suspense } from "react";
import ConfirmEmailClient from "./ConfirmEmailClient";

export default function ConfirmEmailPage() {
    return (
        <Suspense>
            <ConfirmEmailClient />
        </Suspense>
    );
}
