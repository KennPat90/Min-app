import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  await prisma.workCase.updateMany({
    where: { id: body.caseId, userId: user.id },
    data: { startAt: newStartAt, endAt: newEndAt }
  });

  return NextResponse.json({ ok: true });
}

