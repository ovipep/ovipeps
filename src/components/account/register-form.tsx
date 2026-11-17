"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    email: z.string().trim().email("Please enter a valid email address").max(254),
    password: z.string().min(12, "Password must be at least 12 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    billingAddress1: z.string().trim().min(1, "Billing street address is required").max(160),
    billingAddress2: z.string().trim().max(160).optional(),
    billingCity: z.string().trim().min(1, "Billing city is required").max(100),
    billingProvince: z.string().trim().min(1, "Billing province is required").max(80),
    billingPostalCode: z.string().trim().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, "Enter a valid Canadian postal code"),
    billingPhone: z.string().trim().max(40).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm({ callbackUrl = "/account/orders" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showOwnerReset, setShowOwnerReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    setError("");
    setShowOwnerReset(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          billingAddress: {
            address1: data.billingAddress1,
            address2: data.billingAddress2,
            city: data.billingCity,
            province: data.billingProvince,
            postalCode: data.billingPostalCode,
            phone: data.billingPhone,
          },
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        if (body?.code === "OWNER_ACCOUNT_EXISTS") {
          setShowOwnerReset(true);
        }
        throw new Error(body?.error ?? "Unable to create account. Please try again.");
      }

      router.push(`/account/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="First name"
          autoComplete="given-name"
          placeholder="Jane"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last name"
          autoComplete="family-name"
          placeholder="Researcher"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@institution.ca"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="space-y-4 rounded-xl border border-border p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Billing Information</h2>
          <p className="mt-1 text-xs text-muted-foreground">Required to place orders and saved to your account.</p>
        </div>
        <Input
          label="Street address"
          autoComplete="billing address-line1"
          error={errors.billingAddress1?.message}
          {...register("billingAddress1")}
        />
        <Input
          label="Apartment, suite, etc. (optional)"
          autoComplete="billing address-line2"
          error={errors.billingAddress2?.message}
          {...register("billingAddress2")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="City"
            autoComplete="billing address-level2"
            error={errors.billingCity?.message}
            {...register("billingCity")}
          />
          <Input
            label="Province"
            autoComplete="billing address-level1"
            error={errors.billingProvince?.message}
            {...register("billingProvince")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Postal code"
            autoComplete="billing postal-code"
            placeholder="A1A 1A1"
            error={errors.billingPostalCode?.message}
            {...register("billingPostalCode")}
          />
          <Input
            label="Phone (optional)"
            type="tel"
            autoComplete="billing tel"
            error={errors.billingPhone?.message}
            {...register("billingPhone")}
          />
        </div>
      </div>

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 12 characters"
        error={errors.password?.message}
        {...register("password")}
      />

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {error ? (
        <div className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
          <p>{error}</p>
          {showOwnerReset ? (
            <Link
              href="/account/forgot-password"
              className="mt-2 inline-block font-semibold underline underline-offset-2"
            >
              Reset the administrator password
            </Link>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create account
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/account/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-accent hover:text-navy">
          Sign in
        </Link>
      </p>
    </form>
  );
}
