import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getRemainingUploadsToday } from "@/lib/subscription";
import { getOrCreateCredits } from "@/lib/credits";
import { AppSidebar } from "@/components/AppSidebar";
import { TrialOfferPopup } from "@/components/TrialOfferPopup";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [subscription, credits, uploadsToday] = await Promise.all([
    getActiveSubscription(session.user.id),
    getOrCreateCredits(session.user.id),
    getRemainingUploadsToday(session.user.id),
  ]);
  const planTier = subscription?.planTier ?? "Free";
  const hasSubscription = !!subscription;
  const usage =
    hasSubscription && uploadsToday
      ? { remaining: uploadsToday.remaining, limit: uploadsToday.limit }
      : null;

  return (
    <div className="min-h-screen bg-white">
      <TrialOfferPopup />
      <AppSidebar
        user={session.user}
        credits={credits}
        planTier={planTier}
        hasSubscription={hasSubscription}
        usage={usage}
      />
      <div className="pl-56">
        {children}
      </div>
    </div>
  );
}
