import nodemailer from "nodemailer";

const SUPPORT_INBOX = process.env.SUPPORT_EMAIL ?? "chartanalyticai@gmail.com";

export async function sendSupportEmail(params: {
  fromEmail: string;
  fromName?: string | null;
  subject: string;
  message: string;
}): Promise<void> {
  const user = process.env.GMAIL_OTP_USER;
  const pass = process.env.GMAIL_OTP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_OTP_USER and GMAIL_OTP_APP_PASSWORD must be set to send support emails");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  const replyTo = params.fromName
    ? `"${params.fromName}" <${params.fromEmail}>`
    : params.fromEmail;
  const body =
    "Message from ChartAnalytic Support form\n\nFrom: " +
    params.fromEmail +
    (params.fromName ? " (" + params.fromName + ")" : "") +
    "\n\nSubject: " +
    params.subject +
    "\n\n---\n\n" +
    params.message;

  await transporter.sendMail({
    from: `"ChartAnalytic Support" <${user}>`,
    to: SUPPORT_INBOX,
    replyTo,
    subject: "[Support] " + params.subject,
    text: body,
    html:
      "<p>Message from ChartAnalytic Support form</p><p><strong>From:</strong> " +
      params.fromEmail +
      (params.fromName ? " (" + params.fromName + ")" : "") +
      "</p><p><strong>Subject:</strong> " +
      params.subject +
      "</p><hr><pre style=\"white-space:pre-wrap;font-family:inherit;\">" +
      params.message.replace(/</g, "&lt;") +
      "</pre>",
  });
}
