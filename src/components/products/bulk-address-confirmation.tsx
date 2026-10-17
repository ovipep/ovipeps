"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: "CA";
  phone?: string;
}
export function BulkAddressConfirmation({
  token,
  version,
  address,
}: {
  token: string;
  version: string;
  address?: Address;
}) {
  const [values, setValues] = useState<Address>(
    address ?? {
      firstName: "",
      lastName: "",
      address1: "",
      address2: "",
      city: "",
      province: "ON",
      postalCode: "",
      country: "CA",
      phone: "",
    },
  );
  const [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [result, setResult] = useState<{
    orderNumber: string;
    emailWarning: boolean;
  } | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bulk-orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          version,
          address: values,
          termsAccepted: accepted,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record order");
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="rounded-xl border bg-emerald-50 p-6">
        <h2 className="text-xl font-bold">
          Order recorded: {result.orderNumber}
        </h2>
        <p className="mt-3">
          Your shipping address is saved. Available stock has been reserved and
          pending items are recorded.
        </p>
        {result.emailWarning && (
          <p role="alert" className="mt-3">
            Your order is recorded, but the email needs to be resent. Contact
            ovipeps@gmail.com.
          </p>
        )}
        <Link
          className="mt-4 inline-block font-bold text-sky underline"
          href={`/account/orders/${result.orderNumber}`}
        >
          View order and payment details
        </Link>
      </section>
    );
  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border p-6">
      <h2 className="text-xl font-bold">Shipping address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            "firstName",
            "lastName",
            "address1",
            "address2",
            "city",
            "postalCode",
            "phone",
          ] as const
        ).map((key) => (
          <label key={key} className="text-sm font-semibold">
            {
              {
                firstName: "First name",
                lastName: "Last name",
                address1: "Street address",
                address2: "Apartment / unit (optional)",
                city: "City",
                postalCode: "Postal code",
                phone: "Phone (optional)",
              }[key]
            }
            <input
              value={values[key] ?? ""}
              required={!["address2", "phone"].includes(key)}
              maxLength={key === "phone" ? 40 : 160}
              disabled={busy}
              autoComplete={
                {
                  firstName: "given-name",
                  lastName: "family-name",
                  address1: "address-line1",
                  address2: "address-line2",
                  city: "address-level2",
                  postalCode: "postal-code",
                  phone: "tel",
                }[key]
              }
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              className="mt-2 w-full rounded-xl border px-3 py-2"
            />
          </label>
        ))}
        <label className="text-sm font-semibold">
          Province / territory
          <select
            value={values.province}
            disabled={busy}
            onChange={(e) => setValues({ ...values, province: e.target.value })}
            className="mt-2 w-full rounded-xl border px-3 py-2"
          >
            {[
              "AB",
              "BC",
              "MB",
              "NB",
              "NL",
              "NS",
              "NT",
              "NU",
              "ON",
              "PE",
              "QC",
              "SK",
              "YT",
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm">Country: Canada</p>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          required
          disabled={busy}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>
          I confirm this order and shipping address and agree to the{" "}
          <Link href="/terms" target="_blank" className="underline">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" target="_blank" className="underline">
            Privacy Policy
          </Link>
          , and{" "}
          <Link
            href="/research-disclaimer"
            target="_blank"
            className="underline"
          >
            research-only disclaimer
          </Link>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <Button disabled={busy || !accepted} type="submit">
        {busy ? "Recording order…" : "Confirm address & record bulk order"}
      </Button>
    </form>
  );
}
