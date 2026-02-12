import nodemailer from "nodemailer";

const OTP_EXPIRY_MINUTES = 10;

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  organization?: string;
  subject?: string;
}): Promise<void> {
  const user = process.env.GMAIL_OTP_USER;
  const pass = process.env.GMAIL_OTP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_OTP_USER and GMAIL_OTP_APP_PASSWORD must be set");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  const org = params.organization ?? "ChartAnalytic";
  const subject = params.subject ?? "Verify your email";

  await transporter.sendMail({
    from: `"${org}" <${user}>`,
    to: params.to,
    subject,
    text: `Your verification code is: ${params.code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your verification code is: <strong>${params.code}</strong></p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  });
}

export const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
