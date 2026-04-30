import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 3) return NextResponse.json({ items: [] });

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", q);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("limit", "8");
  nominatimUrl.searchParams.set("countrycodes", "dk");

  const res = await fetch(nominatimUrl.toString(), {
    headers: {
      Accept: "application/json",
      // Nominatim kræver identificerbar User-Agent.
      "User-Agent": "customers-mvp/0.1.0 (internal address autocomplete)"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    return NextResponse.json({ items: [] });
  }

  const data = (await res.json()) as Array<{ display_name?: string }>;
  const items = data
    .map((x) => x.display_name?.trim())
    .filter((x): x is string => Boolean(x))
    .slice(0, 8);

  return NextResponse.json({ items });
}

