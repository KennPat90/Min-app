import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEconomicOrderDraftForWorkCase } from "@/lib/economic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { caseId?: string; caseNumber?: string };
  const caseId = String(body.caseId ?? "").trim();
  if (!caseId) return NextResponse.json({ error: "missing_case_id" }, { status: 400 });

  try {
    await prisma.workCase.updateMany({
      where: { id: caseId, userId: user.id },
      data: { caseNumber: body.caseNumber?.trim() || null }
    });
    const draft = await createEconomicOrderDraftForWorkCase(user.id, caseId);
    await prisma.workCase.updateMany({
      where: { id: caseId, userId: user.id },
      data: { status: "done" }
    });
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invoice_draft_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
