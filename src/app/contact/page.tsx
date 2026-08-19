import type { Metadata } from "next";
import { Clock, Mail, MapPin } from "lucide-react";
import { PageHero } from "@/components/content/page-hero";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with OVIpeps support for order inquiries, documentation requests, and research product questions.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Support"
        title="Contact Us"
        description="Our Canadian support team is here to help with orders, payments, shipping, and research documentation inquiries."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Contact" },
          ]}
          className="mb-10"
        />

        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-navy-deep">
              Get in touch
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              For the fastest response, include your order number if your inquiry
              relates to an existing purchase. We typically reply within one business
              day.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-cyan text-white shadow-md shadow-sky/25">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <a
                    href="mailto:support@ovipeps.ca"
                    className="mt-0.5 text-sm text-accent hover:text-navy"
                  >
                    support@ovipeps.ca
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-cyan text-white shadow-md shadow-sky/25">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Response time
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Within 1 business day (Mon–Fri)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-cyan text-white shadow-md shadow-sky/25">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Location</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Canada — domestic fulfillment
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-navy-deep">Before you write</p>
              <p className="mt-2">
                Check our{" "}
                <a href="/research/faq" className="text-accent hover:text-navy">
                  FAQ
                </a>{" "}
                for quick answers on payments, shipping, and COA access. For payment
                details, see{" "}
                <a
                  href="/payment-instructions"
                  className="text-accent hover:text-navy"
                >
                  payment instructions
                </a>
                .
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-navy/5 sm:p-8">
              <h2 className="text-lg font-semibold text-navy-deep">
                Send a message
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All fields are required unless noted.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
