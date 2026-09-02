import { NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribeRestock } from "@/lib/restock-notifications";

const schema = z.object({ token: z.string().min(32), productId: z.string().min(1).optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid management request" }, { status: 400 });
  try {
    await unsubscribeRestock(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "We could not update your notifications" }, { status: 400 });
  }
}
