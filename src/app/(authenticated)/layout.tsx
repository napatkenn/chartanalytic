import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getRemainingUploadsToday } from "@/lib/subscription";
import { getOrCreateCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";
import { SubscriptionSuccessTracker } from "@/components/SubscriptionSuccessTracker";
import { TrialOfferPopup } from "@/components/TrialOfferPopup";
import { OutOfCreditsModal } from "@/components/OutOfCreditsModal";

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

  // Lock only when they used their trial and now have 0 credits (new users see trial popup instead)
  const showOutOfCreditsLock =
    !hasSubscription && credits === 0 && user?.trialActivatedAt != null;

  return (
    <div className="min-h-screen bg-white">
      <SubscriptionSuccessTracker />
      <TrialOfferPopup />
      <OutOfCreditsModal show={showOutOfCreditsLock} />
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
