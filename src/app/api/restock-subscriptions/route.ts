import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeToRestocks } from "@/lib/restock-notifications";

const requestSchema = z.object({
  email: z.email("Enter a valid email address"),
  productIds: z.array(z.string().min(1)).max(100),
  allInventory: z.boolean(),
  notificationType: z.enum(["ONE_TIME", "ONGOING"]),
}).refine((value) => value.allInventory || value.productIds.length > 0, {
  message: "Select at least one product",
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form and try again" }, { status: 400 });
  }
  try {
    await subscribeToRestocks(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restock subscription failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "We could not add you to the list" }, { status: 500 });
  }
}
