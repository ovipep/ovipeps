"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetForm() {
  const token = useSearchParams().get("token") ?? ""; const [status, setStatus] = useState<"idle" | "success" | "error">("idle"); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password")); const confirm = String(form.get("confirm")); if (password !== confirm) { setError("Passwords do not match"); setStatus("error"); return; } const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }); const body = await response.json(); if (!response.ok) { setError(body.error); setStatus("error"); } else setStatus("success"); }
  return <Card><CardHeader><CardTitle>Choose a new password</CardTitle></CardHeader><CardContent>{status === "success" ? <p className="text-sm">Password updated. <Link href="/account/login" className="font-semibold text-sky hover:underline">Sign in</Link>.</p> : <form onSubmit={submit} className="space-y-4"><Input name="password" label="New password" type="password" minLength={8} required /><Input name="confirm" label="Confirm password" type="password" minLength={8} required />{status === "error" && <p className="text-sm text-error">{error}</p>}<Button type="submit" className="w-full">Update password</Button></form>}</CardContent></Card>;
}
export default function ResetPasswordPage() { return <div className="mx-auto max-w-md px-4 py-16"><Suspense><ResetForm /></Suspense></div>; }
