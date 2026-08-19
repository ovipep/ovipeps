import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { AffiliateDashboard } from "@/components/affiliates/affiliate-dashboard";
import { requireAffiliate } from "@/lib/auth";
import { getAffiliateDashboardData } from "@/lib/affiliate-dashboard";

export const metadata: Metadata = {
  title: "Affiliate Dashboard",
  description: "Track clicks, orders, commissions, and payouts from your OVIpeps partner dashboard.",
};

export default async function AccountAffiliatePage() {
  const session = await requireAffiliate();

  if (!session?.user?.id) {
    redirect("/account/login?callbackUrl=/account/affiliate");
  }

  const data = await getAffiliateDashboardData(session.user.id);

  if (!data) {
    return (
      <>
        <PageHero
          eyebrow="Partner Program"
          title="Affiliate dashboard"
          description="Your affiliate account is not yet active."
        />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center lg:px-6">
          <p className="text-muted-foreground">
            We could not find an active affiliate account linked to your profile.
            If you recently applied, your application may still be under review.
          </p>
          <Link
            href="/affiliates/apply"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-navy-deep"
          >
            Apply to the program
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Partner Program"
        title="Affiliate dashboard"
        description={`Welcome back, ${session.user.name ?? "partner"}. Track your referrals and earnings below.`}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Account", href: "/account" },
            { label: "Affiliate" },
          ]}
          className="mb-10"
        />

        <AffiliateDashboard data={data} />
      </div>
    </>
  );
}
