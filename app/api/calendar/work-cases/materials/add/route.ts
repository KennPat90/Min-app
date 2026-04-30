import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    workCaseId?: string;
    productId?: string;
    quantity?: number;
  };

  const workCaseId = String(body.workCaseId ?? "").trim();
  const productId = String(body.productId ?? "").trim();
  const quantity = Math.floor(Number(body.quantity ?? 1));

  if (!workCaseId || !productId || Number.isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const workCase = await prisma.workCase.findFirst({
    where: { id: workCaseId, userId: user.id }
  });
  if (!workCase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id }
  });
  if (!product) return NextResponse.json({ error: "product_not_found" }, { status: 404 });

  await prisma.workCaseMaterial.create({
    data: {
      userId: user.id,
      workCaseId,
      productId,
      quantity,
      unitPrice: product.unitNetPrice,
      lineText: product.name
    }
  });

  try {
    await prisma.productSelectionStat.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId
        }
      },
      create: {
        userId: user.id,
        productId,
        selectedCount: 1,
        lastSelectedAt: new Date()
      },
      update: {
        selectedCount: { increment: 1 },
        lastSelectedAt: new Date()
      }
    });
  } catch {
    // Keep add-material action working even if ranking table/client is not ready in dev server memory.
  }

  return NextResponse.json({ ok: true });
}
