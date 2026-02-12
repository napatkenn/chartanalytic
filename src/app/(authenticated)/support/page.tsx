import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SupportForm } from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Support — ChartAnalytic",
  description: "Contact support with your question or feedback.",
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <header className="flex h-14 min-h-[3.5rem] items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <p className="text-sm text-gray-500">Support</p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Dashboard
        </Link>
      </header>

      <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Contact support</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send a message to our team. We&apos;ll reply to your account email.
        </p>

        <div className="mt-6">
          <SupportForm />
        </div>
      </main>
    </>
  );
}
