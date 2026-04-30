import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    caseId?: string;
    title?: string;
    caseNumber?: string;
    description?: string;
    locationAddress?: string;
    status?: string;
    employeeId?: string;
    customerId?: string | null;
    startAt?: string;
    endAt?: string;
  };

  if (!body.caseId || !body.title || !body.employeeId || !body.startAt || !body.endAt) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return NextResponse.json({ error: "invalid_time" }, { status: 400 });
  }
  if (body.status && !["planned", "in_progress", "done"].includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  await prisma.workCase.updateMany({
    where: { id: body.caseId, userId: user.id },
    data: {
      title: body.title.trim(),
      caseNumber: body.caseNumber?.trim() || null,
      description: body.description?.trim() || null,
      locationAddress: body.locationAddress?.trim() || null,
      status: body.status ?? "planned",
      employeeId: body.employeeId,
      customerId: body.customerId || null,
      startAt,
      endAt
    }
  });

  return NextResponse.json({ ok: true });
}

