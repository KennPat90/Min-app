import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncEconomicCustomersForUser } from "@/lib/economic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncEconomicCustomersForUser(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

