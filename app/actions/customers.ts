"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();

  const economicCustomerNumber = String(formData.get("economicCustomerNumber") ?? "").trim();
  const cvrNumber = String(formData.get("cvrNumber") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim() || "Danmark";
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim();

  if (!name) return redirect("/customers?error=missing_name");
  if (!email || !email.includes("@")) return redirect("/customers?error=invalid_email");
  if (!phone) return redirect("/customers?error=missing_phone");
  if (!economicCustomerNumber) return redirect("/customers?error=missing_economic_customer_number");
  if (!address) return redirect("/customers?error=missing_address");
  if (!postalCode) return redirect("/customers?error=missing_postal_code");
  if (!city) return redirect("/customers?error=missing_city");
  if (!paymentTerms) return redirect("/customers?error=missing_payment_terms");

  await prisma.customer.create({
    data: {
      userId: user.id,
      name,
      email,
      phone,
      economicCustomerNumber,
      cvrNumber: cvrNumber || undefined,
      address,
      postalCode,
      city,
      country,
      paymentTerms
    }
  });

  return redirect("/customers");
}

export async function deleteCustomerAction(formData: FormData) {
  const user = await requireUser();

  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return redirect("/customers");

  // Soft delete: slet ikke i e-conomic (senere sync skal bare skjule/ignorere den).
  await prisma.customer.updateMany({
    where: { id: customerId, userId: user.id },
    data: { archivedAt: new Date() }
  });

  return redirect("/customers");
}

