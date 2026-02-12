import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { sendSupportEmail } from "@/lib/send-support-email";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!subject || subject.length > 200) {
    return NextResponse.json(
      { error: "Subject is required and must be at most 200 characters" },
      { status: 400 }
    );
  }
  if (!message || message.length > 5000) {
    return NextResponse.json(
      { error: "Message is required and must be at most 5000 characters" },
      { status: 400 }
    );
  }

  try {
    await sendSupportEmail({
      fromEmail: session.user.email ?? "unknown@chartanalytic.user",
      fromName: session.user.name ?? null,
      subject,
      message,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send support email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
