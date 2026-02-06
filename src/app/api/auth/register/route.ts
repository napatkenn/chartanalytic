import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = RegisterSchema.parse(body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }
    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash, name: name ?? null },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[register]", err.message, err.cause ?? "");
    const isDb =
      err.message.includes("Prisma") ||
      err.message.includes("connect") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("DATABASE") ||
      err.message.includes("SQLite") ||
      err.message.includes("file:");
    const message = isDb
      ? "Database unavailable. On Vercel set DATABASE_URL to a PostgreSQL connection string (SQLite is not supported)."
      : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
