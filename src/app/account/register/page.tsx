import type { Metadata } from "next";
import { RegisterForm } from "@/components/account/register-form";
import { PageHero } from "@/components/content/page-hero";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create an OVIpeps account to track orders and manage your research profile.",
};

export default function RegisterPage() {
  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Create Account"
        description="Register to track orders, save shipping details, and access your order history."
      />

      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-navy/5 sm:p-8">
          <RegisterForm />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          For research professionals only. Products are sold for laboratory research
          purposes and are not for human consumption.
        </p>
      </div>
    </>
  );
}
