import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    caseId?: string;
    newStartAt?: string;
    newEndAt?: string;
  };

  if (!body.caseId || !body.newStartAt || !body.newEndAt) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const newStartAt = new Date(body.newStartAt);
  const newEndAt = new Date(body.newEndAt);
  if (Number.isNaN(newStartAt.getTime()) || Number.isNaN(newEndAt.getTime()) || newEndAt <= newStartAt) {
    return NextResponse.json({ error: "invalid_time" }, { status: 400 });
  }

  const existing = await prisma.workCase.findFirst({
    where: { id: body.caseId, userId: user.id }
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (existing.status !== "in_progress") {
    return NextResponse.json({ error: "only_in_progress_can_be_copied" }, { status: 400 });
  }

  const created = await prisma.workCase.create({
    data: {
      userId: user.id,
      employeeId: existing.employeeId,
      customerId: existing.customerId,
      title: existing.title,
      caseNumber: existing.caseNumber,
      description: existing.description,
      locationAddress: existing.locationAddress,
      workHours: existing.workHours,
      hourlyRate: existing.hourlyRate,
      materialsAmount: existing.materialsAmount,
      invoiceLineText: existing.invoiceLineText,
      startAt: newStartAt,
      endAt: newEndAt,
      status: "in_progress"
    },
    include: {
      employee: true,
      customer: true
    }
  });

  return NextResponse.json({ ok: true, workCase: created });
}
