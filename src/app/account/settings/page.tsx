import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account/account-nav";
import { SettingsForm } from "@/components/account/settings-form";
import { PageHero } from "@/components/content/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Update your OVIpeps account profile and contact information.",
};

export default async function SettingsPage() {
  const session = await requireAuth();
  if (!session?.user) {
    redirect("/account/login?callbackUrl=/account/settings");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  if (!user) {
    redirect("/account/login");
  }

  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Settings"
        description="Update your profile and contact information."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-4">
              <AccountNav />
            </div>
          </aside>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsForm
                  email={user.email}
                  defaultValues={{
                    firstName: user.firstName ?? "",
                    lastName: user.lastName ?? "",
                    phone: user.phone ?? "",
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
