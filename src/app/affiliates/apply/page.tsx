import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { AffiliateApplyForm } from "@/components/affiliates/apply-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Apply — Partner Program",
  description:
    "Apply to join the OVIpeps Partner Program and earn commission on referred research orders.",
};

export default async function AffiliateApplyPage() {
  const session = await auth();
  const defaultName = session?.user?.name ?? "";
  const defaultEmail = session?.user?.email ?? "";

  return (
    <>
      <PageHero
        eyebrow="Partner Program"
        title="Apply to become a partner"
        description="Tell us about your audience and promotion plans. We review applications within 3–5 business days."
      />

      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6 lg:py-16">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Partner Program", href: "/affiliates" },
            { label: "Apply" },
          ]}
          className="mb-10"
        />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-navy/5 sm:p-8">
          <h2 className="text-lg font-semibold text-navy-deep">
            Partner application
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All fields are required unless noted. Already approved?{" "}
            <Link href="/account/affiliate" className="text-accent hover:text-navy">
              Go to your dashboard
            </Link>
            .
          </p>
          <div className="mt-6">
            <AffiliateApplyForm
              defaultName={defaultName}
              defaultEmail={defaultEmail}
            />
          </div>
        </div>
      </div>
    </>
  );
}
