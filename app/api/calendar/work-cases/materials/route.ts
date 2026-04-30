import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const caseId = String(searchParams.get("caseId") ?? searchParams.get("workCaseId") ?? "").trim();
  const q = String(searchParams.get("q") ?? "").trim();
  const canSearchProducts = q.length >= 2;

  const productSearchWhere = {
    userId: user.id,
    barred: false,
    OR: [{ productNumber: { contains: q } }, { name: { contains: q } }, { description: { contains: q } }]
  };

  const workCase = caseId
    ? await prisma.workCase.findFirst({
        where: { id: caseId, userId: user.id },
        include: { customer: true }
      })
    : null;

  const candidateProducts = canSearchProducts
    ? await prisma.product.findMany({
        where: productSearchWhere,
        orderBy: { name: "asc" },
        take: 200
      })
    : [];

  const candidateIds = candidateProducts.map((p) => p.id);
  const usageRows =
    candidateIds.length > 0
      ? await prisma.workCaseMaterial.groupBy({
          by: ["productId"],
          where: {
            userId: user.id,
            productId: { in: candidateIds }
          },
          _count: { productId: true }
        })
      : [];
  const usageByProductId = new Map(usageRows.map((r) => [r.productId, r._count.productId]));

  let statsByProductId = new Map<string, { selectedCount: number; lastSelectedAt: number }>();
  if (candidateIds.length > 0) {
    try {
      const stats = await prisma.productSelectionStat.findMany({
        where: {
          userId: user.id,
          productId: { in: candidateIds }
        },
        select: {
          productId: true,
          selectedCount: true,
          lastSelectedAt: true
        }
      });
      statsByProductId = new Map(
        stats.map((s) => [
          s.productId,
          {
            selectedCount: s.selectedCount,
            lastSelectedAt: s.lastSelectedAt.getTime()
          }
        ])
      );
    } catch {
      statsByProductId = new Map();
    }
  }

  const rankedProducts = candidateProducts
    .map((p) => {
      const stat = statsByProductId.get(p.id);
      const selectedCount = stat?.selectedCount ?? usageByProductId.get(p.id) ?? 0;
      const lastSelectedAt = stat?.lastSelectedAt ?? 0;
      return { ...p, selectedCount, lastSelectedAt };
    })
    .sort((a, b) => {
      if (b.selectedCount !== a.selectedCount) return b.selectedCount - a.selectedCount;
      if (b.lastSelectedAt !== a.lastSelectedAt) return b.lastSelectedAt - a.lastSelectedAt;
      return a.name.localeCompare(b.name, "da");
    })
    .slice(0, 50);

  const existing = workCase
    ? await prisma.workCaseMaterial.findMany({
        where: { userId: user.id, workCaseId: caseId },
        include: { product: true },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return NextResponse.json({
    caseFound: Boolean(workCase),
    caseTitle: workCase?.title ?? null,
    customerName: workCase?.customer?.name ?? null,
    canSearchProducts,
    products: rankedProducts.map((p) => ({
      id: p.id,
      productNumber: p.productNumber,
      name: p.name,
      unitNetPrice: p.unitNetPrice
    })),
    existing: existing.map((m) => ({
      id: m.id,
      quantity: m.quantity,
      unitPrice: m.unitPrice,
      productNumber: m.product.productNumber,
      productName: m.product.name
    }))
  });
}
