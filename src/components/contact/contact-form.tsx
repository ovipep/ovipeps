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

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().min(10, "Please provide at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const SUBJECT_OPTIONS = [
  { value: "order", label: "Order inquiry" },
  { value: "payment", label: "Payment question" },
  { value: "shipping", label: "Shipping & delivery" },
  { value: "coa", label: "COA / documentation" },
  { value: "affiliate", label: "Affiliate program" },
  { value: "other", label: "Other" },
];

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: "",
    },
  });

  async function onSubmit(data: ContactFormData) {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to send your message. Please try again.");
      }

      setStatus("success");
      reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-success/20 bg-success/5 p-8 text-center">
        <h3 className="text-lg font-semibold text-navy-deep">Message sent</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thank you for contacting OVIpeps. Our support team typically responds within
          one business day.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Name"
          placeholder="Your full name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@institution.ca"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <Select
        label="Subject"
        error={errors.subject?.message}
        defaultValue=""
        {...register("subject")}
      >
        <option value="" disabled>
          Select a topic
        </option>
        {SUBJECT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Textarea
        label="Message"
        placeholder="How can we help with your research order or inquiry?"
        rows={6}
        error={errors.message?.message}
        {...register("message")}
      />

      {status === "error" && errorMessage ? (
        <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          For research-use-only products. OVIpeps does not provide medical advice.
          Include your order number if your inquiry relates to an existing purchase.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={status === "loading"}>
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
