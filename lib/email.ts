import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { Resend, type Attachment, type CreateEmailOptions } from "resend";

type GlobalEmailState = typeof globalThis & {
    __ourLittleWorldEmailTransporter?: Transporter;
    __ourLittleWorldResendClient?: Resend;
};

type SmtpErrorLike = Error & {
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
};

function sanitizeEnvValue(value: string) {
    return value.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

function getOptionalEnv(name: string) {
    const value = process.env[name];
    return value ? sanitizeEnvValue(value) : undefined;
}

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return sanitizeEnvValue(value);
}

export function hasResendEmailProvider() {
    return Boolean(getOptionalEnv("RESEND_API_KEY"));
}

export function getResendApiKey() {
    return getRequiredEnv("RESEND_API_KEY");
}

export function getSmtpConfig() {
    const host = getRequiredEnv("SMTP_HOST");
    const port = Number(getRequiredEnv("SMTP_PORT"));

    if (!Number.isFinite(port)) {
        throw new Error("SMTP_PORT must be a valid number");
    }

    return {
        host,
        port,
        secure: port === 465,
        auth: {
            user: getRequiredEnv("SMTP_USER"),
            pass: getRequiredEnv("SMTP_PASSWORD"),
        },
        from: getRequiredEnv("SMTP_FROM"),
    };
}

function getResendClient() {
    const globalEmailState = globalThis as GlobalEmailState;

    if (!globalEmailState.__ourLittleWorldResendClient) {
        globalEmailState.__ourLittleWorldResendClient = new Resend(getResendApiKey());
    }

    return globalEmailState.__ourLittleWorldResendClient;
}

function buildSmtpTransporter() {
    const smtp = getSmtpConfig();

    return nodemailer.createTransport({
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        tls: {
            servername: smtp.host,
        },
    });
}

export function getEmailTransporter() {
    const globalEmailState = globalThis as GlobalEmailState;

    if (!globalEmailState.__ourLittleWorldEmailTransporter) {
        globalEmailState.__ourLittleWorldEmailTransporter = buildSmtpTransporter();
    }

    return globalEmailState.__ourLittleWorldEmailTransporter;
}

function formatAddress(address: unknown): string | undefined {
    if (!address) return undefined;
    if (typeof address === "string") return address;
    if (typeof address === "object" && "address" in address) {
        const addressRecord = address as { address?: unknown; name?: unknown };
        const emailAddress = typeof addressRecord.address === "string" ? addressRecord.address : undefined;
        const name = typeof addressRecord.name === "string" ? addressRecord.name : undefined;
        if (!emailAddress) return undefined;
        return name ? `${name} <${emailAddress}>` : emailAddress;
    }
    return undefined;
}

function formatAddressList(addresses: unknown): string | string[] | undefined {
    if (!addresses) return undefined;
    if (Array.isArray(addresses)) {
        const formatted = addresses
            .map((address) => formatAddress(address))
            .filter((address): address is string => Boolean(address));

        if (formatted.length === 0) return undefined;
        return formatted.length === 1 ? formatted[0] : formatted;
    }

    return formatAddress(addresses);
}

function mapResendAttachments(attachments: SendMailOptions["attachments"]): Attachment[] | undefined {
    if (!attachments || attachments.length === 0) return undefined;

    const mappedAttachments = attachments.flatMap((attachment) => {
        if (!attachment) return [];

        const content =
            typeof attachment.content === "string" || Buffer.isBuffer(attachment.content)
                ? attachment.content
                : undefined;

        if (!attachment.path && !content) {
            return [];
        }

        return [{
            filename: typeof attachment.filename === "string" ? attachment.filename : undefined,
            path: typeof attachment.path === "string" ? attachment.path : undefined,
            content,
            contentType: typeof attachment.contentType === "string" ? attachment.contentType : undefined,
            contentId: typeof attachment.cid === "string" ? attachment.cid : undefined,
        }];
    });

    return mappedAttachments.length > 0 ? mappedAttachments : undefined;
}

function normalizeHeaders(headers: SendMailOptions["headers"]) {
    if (!headers || typeof headers !== "object" || Array.isArray(headers)) return undefined;

    const normalizedHeaders = Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
    }, {});

    return Object.keys(normalizedHeaders).length > 0 ? normalizedHeaders : undefined;
}

function buildResendPayload(mailOptions: SendMailOptions): CreateEmailOptions {
    const from = formatAddress(mailOptions.from) ?? getDefaultFromAddress();
    const to = formatAddressList(mailOptions.to);
    const html = typeof mailOptions.html === "string" ? mailOptions.html : undefined;
    const text = typeof mailOptions.text === "string" ? mailOptions.text : undefined;
    const headers = normalizeHeaders(mailOptions.headers);
    const attachments = mapResendAttachments(mailOptions.attachments);

    if (!to) {
        throw new Error("Email recipient is required");
    }

    if (!html && !text) {
        throw new Error("Email html or text content is required for Resend");
    }

    const basePayload = {
        from,
        to,
        cc: formatAddressList(mailOptions.cc),
        bcc: formatAddressList(mailOptions.bcc),
        replyTo: formatAddressList(mailOptions.replyTo),
        subject: typeof mailOptions.subject === "string" ? mailOptions.subject : "",
    };

    const optionalFields = {
        ...(headers ? { headers } : {}),
        ...(attachments ? { attachments } : {}),
    };

    if (html && text) {
        return {
            ...basePayload,
            ...optionalFields,
            html,
            text,
        } as CreateEmailOptions;
    }

    if (html) {
        return {
            ...basePayload,
            ...optionalFields,
            html,
        } as CreateEmailOptions;
    }

    return {
        ...basePayload,
        ...optionalFields,
        text: text!,
    } as CreateEmailOptions;
}

async function sendWithResend(mailOptions: SendMailOptions, label: string) {
    const resend = getResendClient();
    const startedAt = Date.now();

    try {
        const { data, error } = await resend.emails.send(buildResendPayload(mailOptions));

        if (error) {
            const resendError = Object.assign(new Error(error.message), {
                code: error.name,
                responseCode: error.statusCode,
            });
            throw resendError;
        }

        console.info(`[EMAIL:${label}] sent via resend in ${Date.now() - startedAt}ms`, {
            id: data?.id,
        });

        return data;
    } catch (error) {
        const smtpError = error as SmtpErrorLike;
        console.error(`[EMAIL:${label}] failed via resend in ${Date.now() - startedAt}ms`, {
            message: smtpError.message,
            code: smtpError.code,
            command: smtpError.command,
            response: smtpError.response,
            responseCode: smtpError.responseCode,
        });
        throw error;
    }
}

async function sendWithSmtp(mailOptions: SendMailOptions, label: string) {
    const transporter = getEmailTransporter();
    const startedAt = Date.now();

    try {
        const info = await transporter.sendMail(mailOptions);
        console.info(`[EMAIL:${label}] sent via smtp in ${Date.now() - startedAt}ms`);
        return info;
    } catch (error) {
        const globalEmailState = globalThis as GlobalEmailState;
        globalEmailState.__ourLittleWorldEmailTransporter = undefined;
        const smtpError = error as SmtpErrorLike;
        console.error(`[EMAIL:${label}] failed via smtp in ${Date.now() - startedAt}ms`, {
            message: smtpError.message,
            code: smtpError.code,
            command: smtpError.command,
            response: smtpError.response,
            responseCode: smtpError.responseCode,
        });
        throw error;
    }
}

export async function sendEmail(mailOptions: SendMailOptions, label: string) {
    if (hasResendEmailProvider()) {
        return sendWithResend(mailOptions, label);
    }

    return sendWithSmtp(mailOptions, label);
}

export function getDefaultFromAddress() {
    return getOptionalEnv("RESEND_FROM")
        ?? getOptionalEnv("EMAIL_FROM")
        ?? getOptionalEnv("SMTP_FROM")
        ?? (() => {
            throw new Error("EMAIL_FROM, RESEND_FROM, or SMTP_FROM must be configured");
        })();
}

export async function sendEmailWithDefaultFrom(
    mailOptions: Omit<SendMailOptions, "from"> & { from?: SendMailOptions["from"] },
    label: string,
): Promise<unknown> {
    return sendEmail(
        {
            ...mailOptions,
            from: mailOptions.from ?? getDefaultFromAddress(),
        },
        label,
    );
}
