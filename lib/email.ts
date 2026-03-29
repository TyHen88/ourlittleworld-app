import nodemailer, { type SendMailOptions, type SentMessageInfo, type Transporter } from "nodemailer";

type GlobalEmailState = typeof globalThis & {
    __ourLittleWorldEmailTransporter?: Transporter;
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

function getRequiredEnv(name: "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASSWORD" | "SMTP_FROM") {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return sanitizeEnvValue(value);
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

export async function sendEmail(mailOptions: SendMailOptions, label: string) {
    const transporter = getEmailTransporter();
    const startedAt = Date.now();

    try {
        const info = await transporter.sendMail(mailOptions);
        console.info(`[EMAIL:${label}] sent in ${Date.now() - startedAt}ms`);
        return info;
    } catch (error) {
        const globalEmailState = globalThis as GlobalEmailState;
        globalEmailState.__ourLittleWorldEmailTransporter = undefined;
        const smtpError = error as SmtpErrorLike;
        console.error(`[EMAIL:${label}] failed in ${Date.now() - startedAt}ms`, {
            message: smtpError.message,
            code: smtpError.code,
            command: smtpError.command,
            response: smtpError.response,
            responseCode: smtpError.responseCode,
        });
        throw error;
    }
}

export function getDefaultFromAddress() {
    return getSmtpConfig().from;
}

export async function sendEmailWithDefaultFrom(
    mailOptions: Omit<SendMailOptions, "from"> & { from?: SendMailOptions["from"] },
    label: string,
): Promise<SentMessageInfo> {
    return sendEmail(
        {
            ...mailOptions,
            from: mailOptions.from ?? getDefaultFromAddress(),
        },
        label,
    );
}
