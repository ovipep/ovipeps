"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const applySchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  socialChannel: z.string().optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  audienceSize: z.string().optional(),
  primaryPlatform: z.string().min(1, "Please select your primary platform"),
  promotionPlan: z
    .string()
    .min(20, "Please describe how you plan to promote OVIpeps"),
});

type ApplyFormData = z.infer<typeof applySchema>;

const PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "X / Twitter" },
  { value: "blog", label: "Blog / Website" },
  { value: "podcast", label: "Podcast" },
  { value: "newsletter", label: "Newsletter" },
  { value: "other", label: "Other" },
];

const AUDIENCE_OPTIONS = [
  { value: "under-1k", label: "Under 1,000" },
  { value: "1k-10k", label: "1,000 – 10,000" },
  { value: "10k-50k", label: "10,000 – 50,000" },
  { value: "50k-100k", label: "50,000 – 100,000" },
  { value: "100k-plus", label: "100,000+" },
];

interface AffiliateApplyFormProps {
  defaultEmail?: string;
  defaultName?: string;
}

export function AffiliateApplyForm({
  defaultEmail = "",
  defaultName = "",
}: AffiliateApplyFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplyFormData>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      socialChannel: "",
      website: "",
      audienceSize: "",
      primaryPlatform: "",
      promotionPlan: "",
    },
  });

  async function onSubmit(data: ApplyFormData) {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/affiliates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? "Unable to submit your application. Please try again."
        );
      }

      setStatus("success");
      reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-success/20 bg-success/5 p-8 text-center">
        <h3 className="text-lg font-semibold text-navy-deep">
          Application received
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thank you for applying to the OVIpeps Partner Program. Our team reviews
          applications within 3–5 business days and will contact you by email with
          next steps.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setStatus("idle")}
        >
          Submit another application
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Full name"
          placeholder="Your name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Social channel"
          placeholder="@handle or channel name"
          hint="Primary social profile where you promote"
          error={errors.socialChannel?.message}
          {...register("socialChannel")}
        />
        <Input
          label="Website"
          type="url"
          placeholder="https://yoursite.com"
          hint="Optional"
          error={errors.website?.message}
          {...register("website")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Audience size"
          error={errors.audienceSize?.message}
          defaultValue=""
          {...register("audienceSize")}
        >
          <option value="" disabled>
            Select audience size
          </option>
          {AUDIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          label="Primary platform"
          error={errors.primaryPlatform?.message}
          defaultValue=""
          {...register("primaryPlatform")}
        >
          <option value="" disabled>
            Select platform
          </option>
          {PLATFORM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Textarea
        label="Promotion plan"
        placeholder="Describe your audience, content style, and how you plan to introduce OVIpeps to qualified researchers..."
        rows={6}
        error={errors.promotionPlan?.message}
        {...register("promotionPlan")}
      />

      {status === "error" && errorMessage ? (
        <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          By submitting this application, you agree to our{" "}
          <a href="/affiliates/terms" className="text-accent hover:text-navy">
            Affiliate Program Terms
          </a>
          . OVIpeps reviews all applications and reserves the right to approve or
          decline partners at our discretion.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={status === "loading"}>
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit application
          </>
        )}
      </Button>
    </form>
  );
}
