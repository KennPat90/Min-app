"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function addMaterialToWorkCaseAction(formData: FormData) {
  const user = await requireUser();
  const workCaseId = String(formData.get("workCaseId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const quantityRaw = String(formData.get("quantity") ?? "1").trim();

  const quantity = Number(quantityRaw || "1");
  if (!workCaseId || !productId || Number.isNaN(quantity) || quantity <= 0) {
    return redirect("/calendar?error=invalid_material_input");
  }

  const workCase = await prisma.workCase.findFirst({
    where: { id: workCaseId, userId: user.id }
  });
  if (!workCase) return redirect("/calendar?error=case_not_found");

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id }
  });
  if (!product) return redirect(`/calendar/cases/${workCaseId}/materials?error=product_not_found`);

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

  return redirect(`/calendar/cases/${workCaseId}/materials`);
}

