import nodemailer, { type SendMailOptions, type SentMessageInfo, type Transporter } from "nodemailer";

type GlobalEmailState = typeof globalThis & {
    __ourLittleWorldEmailTransporter?: Transporter;
};

function getRequiredEnv(name: "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASSWORD" | "SMTP_FROM") {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}

function buildSmtpTransporter() {
    const host = getRequiredEnv("SMTP_HOST");
    const port = Number(getRequiredEnv("SMTP_PORT"));

    return nodemailer.createTransport({
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        host,
        port,
        secure: port === 465,
        auth: {
            user: getRequiredEnv("SMTP_USER"),
            pass: getRequiredEnv("SMTP_PASSWORD"),
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        tls: {
            servername: host,
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
        console.error(`[EMAIL:${label}] failed in ${Date.now() - startedAt}ms`, error);
        throw error;
    }
}

export function getDefaultFromAddress() {
    return getRequiredEnv("SMTP_FROM");
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
