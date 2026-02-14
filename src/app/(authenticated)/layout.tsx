import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getRemainingUploadsToday } from "@/lib/subscription";
import { getOrCreateCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";
import { SubscriptionSuccessTracker } from "@/components/SubscriptionSuccessTracker";
import { TrialOfferPopup } from "@/components/TrialOfferPopup";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [subscription, credits, uploadsToday, user] = await Promise.all([
    getActiveSubscription(session.user.id),
    getOrCreateCredits(session.user.id),
    getRemainingUploadsToday(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trialActivatedAt: true },
    }),
  ]);
  const planTier = subscription?.planTier ?? "Free";
  const hasSubscription = !!subscription;
  const usage =
    hasSubscription && uploadsToday
      ? { remaining: uploadsToday.remaining, limit: uploadsToday.limit }
      : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SubscriptionSuccessTracker />
      <TrialOfferPopup />
      <DashboardShell
        user={session.user}
        credits={credits}
        planTier={planTier}
        hasSubscription={hasSubscription}
        usage={usage}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
