"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { syncEconomicCustomersForUser, syncEconomicProductsForUser } from "@/lib/economic";
import { prisma } from "@/lib/prisma";

export async function syncEconomicCustomersAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await syncEconomicCustomersForUser(user.id);
  return redirect("/customers");
}

export async function syncEconomicProductsAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await syncEconomicProductsForUser(user.id);
  const syncedCount = result.remoteResults ?? result.created + result.updated;

  await prisma.economicSyncState.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      lastProductsSyncAt: new Date(),
      lastProductsSyncCount: syncedCount
    },
    update: {
      lastProductsSyncAt: new Date(),
      lastProductsSyncCount: syncedCount
    }
  });

  return redirect("/products");
}

