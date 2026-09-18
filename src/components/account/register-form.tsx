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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
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
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        if (body?.code === "OWNER_ACCOUNT_EXISTS") {
          setShowOwnerReset(true);
        }
        throw new Error(body?.error ?? "Unable to create account. Please try again.");
      }

      router.push("/account/login?registered=1");
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
        <Link href="/account/login" className="font-medium text-accent hover:text-navy">
          Sign in
        </Link>
      </p>
    </form>
  );
}
