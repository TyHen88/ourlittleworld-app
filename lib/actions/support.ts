"use server";

import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";

export async function sendSupportEmail(formData: { subject: string; message: string }) {
    const session = await auth();
    const userEmail = session?.user?.email ?? "Anonymous";
    const userName = session?.user?.name ?? "User";

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error("SMTP configuration is missing");
        return { success: false, error: "SMTP configuration is missing on server" };
    }

    try {
        await sendEmail({
            from: `"${userName}" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to the support email configured
            replyTo: userEmail !== "Anonymous" ? userEmail : undefined,
            subject: `[Support Request] ${formData.subject}`,
            text: `Support Message from ${userName} (${userEmail}):\n\n${formData.message}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #FF6B9D; margin: 0; font-size: 24px;">New Support Request</h1>
                        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Our Little World Support Portal</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; margin-bottom: 25px;">
                        <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${userName} (${userEmail})</p>
                        <p style="margin: 0;"><strong>Subject:</strong> ${formData.subject}</p>
                    </div>
                    
                    <div style="color: #334155; line-height: 1.6; font-size: 16px;">
                        <p style="white-space: pre-wrap;">${formData.message}</p>
                    </div>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                        <p style="font-size: 12px; color: #94a3b8;">
                            This message was sent from the in-app support form.
                            <br />
                            User ID: ${session?.user?.id || 'N/A'}
                        </p>
                    </div>
                </div>
            `,
        }, "support-request");

        return { success: true };
    } catch (error: unknown) {
        console.error("Failed to send support email:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to send email"
        };
    }
}
