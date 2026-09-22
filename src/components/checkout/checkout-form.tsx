"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Banknote,
  Check,
  FileCheck2,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShoppingBag,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const CANADIAN_PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
] as const;

const FLAT_SHIPPING_RATE = 25;

const checkoutSchema = z.object({
  deliveryMethod: z.enum(["SHIPPING", "PICKUP"]),
  email: z.string().email("Enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  affiliateCode: z.string().optional(),
  termsAccepted: z.boolean().refine((value) => value, {
    message: "Please agree to the Terms of Service to continue",
  }),
}).superRefine((values, ctx) => {
  if (values.deliveryMethod !== "SHIPPING") return;
  if (!values.address1?.trim()) ctx.addIssue({ code: "custom", path: ["address1"], message: "Street address is required" });
  if (!values.city?.trim()) ctx.addIssue({ code: "custom", path: ["city"], message: "City is required" });
  if (!CANADIAN_PROVINCES.some((p) => p.value === values.province)) ctx.addIssue({ code: "custom", path: ["province"], message: "Select a province" });
  if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(values.postalCode ?? "")) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Enter a valid Canadian postal code" });
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [affiliateCodeState, setAffiliateCodeState] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");

  const items = useCartStore((s) => s.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const affiliateCode = useCartStore((s) => s.affiliateCode);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.subtotal);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryMethod: "SHIPPING",
      affiliateCode: affiliateCode ?? "",
      termsAccepted: false,
    },
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (affiliateCode) {
      setValue("affiliateCode", affiliateCode);
    }
  }, [affiliateCode, setValue]);

  const enteredAffiliateCode = watch("affiliateCode");
  const deliveryMethod = watch("deliveryMethod");

  useEffect(() => {
    const code = enteredAffiliateCode?.trim();
    if (!code) {
      setAffiliateCodeState("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAffiliateCodeState("checking");
      try {
        const response = await fetch(
          `/api/affiliates/validate?code=${encodeURIComponent(code)}`,
          { signal: controller.signal }
        );
        setAffiliateCodeState(response.ok ? "valid" : "invalid");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAffiliateCodeState("invalid");
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enteredAffiliateCode]);

  const totals = useMemo(() => {
    const cartSubtotal = subtotal();
    const affiliateDiscountAmount =
      affiliateCodeState === "valid"
        ? Math.round(cartSubtotal * 0.05 * 100) / 100
        : 0;
    const shippingAmount = deliveryMethod === "PICKUP" ? 0 : FLAT_SHIPPING_RATE;
    const total = cartSubtotal - affiliateDiscountAmount + shippingAmount;
    return { cartSubtotal, affiliateDiscountAmount, shippingAmount, total };
  }, [affiliateCodeState, deliveryMethod, items, subtotal]);

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!items.length) {
      setSubmitError("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    if (values.affiliateCode?.trim() && affiliateCodeState === "invalid") {
      setSubmitError("Affiliate code not found or inactive.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          deliveryMethod: values.deliveryMethod,
          shippingAddress: {
            firstName: values.firstName,
            lastName: values.lastName,
            address1: values.deliveryMethod === "PICKUP" ? undefined : values.address1,
            address2: values.address2 || undefined,
            city: values.deliveryMethod === "PICKUP" ? undefined : values.city,
            province: values.deliveryMethod === "PICKUP" ? undefined : values.province,
            postalCode: values.deliveryMethod === "PICKUP" ? undefined : values.postalCode?.toUpperCase(),
            country: "CA",
            phone: values.phone || undefined,
          },
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            quantity: item.quantity,
          })),
          discountCode,
          affiliateCode: values.affiliateCode || affiliateCode,
          termsAccepted: values.termsAccepted,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        orderNumber?: string;
        accessToken?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to place order");
      }

      if (!data.orderNumber || !data.accessToken) {
        throw new Error("The order response was incomplete. Please contact support.");
      }

      clearCart();
      router.push(
        `/checkout/confirmation/${data.orderNumber}?token=${encodeURIComponent(
          data.accessToken
        )}`
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to place order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Your cart is empty
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add an available item to your cart before checking out.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/shop")}
            >
              Browse Catalog
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-8 lg:grid-cols-5"
      noValidate
    >
      <div className="lg:col-span-5">
        <ol
          aria-label="Checkout progress"
          className="grid grid-cols-3 overflow-hidden rounded-2xl border border-sky/15 bg-white shadow-sm"
        >
          {[
            { icon: ShoppingBag, label: "Cart", state: "Complete" },
            { icon: MapPin, label: "Details", state: "Current" },
            { icon: PackageCheck, label: "Confirmation", state: "Next" },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.label}
                aria-current={index === 1 ? "step" : undefined}
                className={`relative flex items-center justify-center gap-2 px-3 py-4 text-xs sm:text-sm ${
                  index === 1
                    ? "bg-gradient-to-r from-sky to-cyan font-bold text-white"
                    : index === 0
                      ? "font-semibold text-success"
                      : "text-muted-foreground"
                }`}
              >
                {index === 0 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span>{step.label}</span>
                <span className="sr-only">— {step.state}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-6 lg:col-span-3">
        <Card className="overflow-hidden border-sky/15 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky/10 text-sky">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky">
                  Step 1
                </p>
                <CardTitle>Contact</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-sky/15 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan">
                  Step 2
                </p>
                <CardTitle>Delivery Method</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6" role="group" aria-label="Delivery Method">
              <label className="flex items-center gap-2"><input type="radio" value="SHIPPING" {...register("deliveryMethod")} /> Shipping</label>
              <label className="flex items-center gap-2"><input type="radio" value="PICKUP" {...register("deliveryMethod")} /> Pick Up</label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register("firstName")}
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register("lastName")}
              />
            </div>
            {deliveryMethod === "SHIPPING" && <>
            <Input
              label="Address"
              autoComplete="address-line1"
              error={errors.address1?.message}
              {...register("address1")}
            />
            <Input
              label="Apartment, suite, etc. (optional)"
              autoComplete="address-line2"
              error={errors.address2?.message}
              {...register("address2")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="City"
                autoComplete="address-level2"
                error={errors.city?.message}
                {...register("city")}
              />
              <Select
                label="Province"
                autoComplete="address-level1"
                error={errors.province?.message}
                defaultValue=""
                {...register("province")}
              >
                <option value="" disabled>
                  Select province
                </option>
                {CANADIAN_PROVINCES.map((province) => (
                  <option key={province.value} value={province.value}>
                    {province.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Postal code"
                autoComplete="postal-code"
                placeholder="A1A 1A1"
                error={errors.postalCode?.message}
                {...register("postalCode")}
              />
              <Input
                label="Phone (optional)"
                type="tel"
                autoComplete="tel"
                error={errors.phone?.message}
                {...register("phone")}
              />
            </div>
            </>}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-sky/15 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light/15 text-teal">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal">
                  Step 3
                </p>
                <CardTitle>No Online Payment</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-xl border border-sky/20 bg-gradient-to-br from-sky/5 to-cyan/10 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky shadow-sm">
                <Banknote className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  Submit your order without paying online
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  OVIpeps does not collect card numbers or process payments on
                  this website. Submit your order now and complete any payment
                  separately using the instructions provided afterward.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  No payment information is required to submit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky/15 shadow-sm">
          <CardHeader>
            <CardTitle>Referral Code (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              label="Affiliate / referral code"
              placeholder="Enter code"
              hint={
                affiliateCodeState === "valid"
                  ? "Code applied — you receive 5% off the merchandise subtotal."
                  : affiliateCodeState === "checking"
                    ? "Checking affiliate code…"
                    : affiliateCodeState === "invalid"
                      ? "That affiliate code was not found or is inactive."
                      : "Enter an active affiliate code to receive 5% off your order."
              }
              error={errors.affiliateCode?.message}
              {...register("affiliateCode")}
            />
          </CardContent>
        </Card>

        <Card className="border-sky/20 bg-gradient-to-br from-sky/5 to-cyan/5 shadow-sm">
          <CardContent className="pt-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-sky/40 text-sky focus:ring-sky"
                {...register("termsAccepted")}
              />
              <span className="text-sm leading-relaxed text-foreground">
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-semibold text-sky underline-offset-2 hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-semibold text-sky underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                , and the{" "}
                <Link
                  href="/research-disclaimer"
                  target="_blank"
                  className="font-semibold text-sky underline-offset-2 hover:underline"
                >
                  Research Disclaimer
                </Link>
                .
              </span>
            </label>
            {errors.termsAccepted?.message && (
              <p role="alert" className="mt-2 text-sm text-error">
                {errors.termsAccepted.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="sticky top-28 overflow-hidden border-sky/20 shadow-xl shadow-sky/10">
          <CardHeader className="border-b border-sky/10 bg-gradient-to-r from-sky/10 to-cyan/10">
            <div className="flex items-center justify-between">
              <CardTitle>Order Summary</CardTitle>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-sky shadow-sm">
                {items.reduce((count, item) => count + item.quantity, 0)} items
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.variantId}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-white to-sky/5 p-3 text-sm"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{item.name}</p>
                    <p className="text-muted-foreground">{item.variantName}</p>
                    <p className="text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="shrink-0 font-bold text-navy-deep">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.cartSubtotal)}</span>
              </div>
              {totals.affiliateDiscountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <span>Affiliate discount (5%)</span>
                  <span>-{formatCurrency(totals.affiliateDiscountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {formatCurrency(totals.shippingAmount)}
                </span>
              </div>
              <p className="rounded-xl bg-sky/5 p-3 text-xs font-medium text-sky">
                <Truck className="mr-1.5 inline h-3.5 w-3.5" />
                {deliveryMethod === "PICKUP" ? "Pick Up — no shipping charge" : "$25 CAD flat-rate shipping"}
              </p>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="text-navy">{formatCurrency(totals.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">All prices in CAD</p>
            </div>

            {submitError && (
              <p
                role="alert"
                className="rounded-xl border border-error/15 bg-error/10 px-3 py-2 text-sm text-error"
              >
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Order...
                </>
              ) : (
                "Submit Order"
              )}
            </Button>

            <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
              {[
                { icon: LockKeyhole, label: "Protected form" },
                { icon: MapPin, label: "Ships in Canada" },
                { icon: ShieldCheck, label: "Clear policies" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 text-center text-[10px] font-semibold leading-tight text-muted-foreground"
                >
                  <Icon className="h-4 w-4 text-sky" />
                  {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
