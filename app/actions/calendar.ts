"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function parseDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function createEmployeeAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim();

  if (!name) return redirect("/admin?error=missing_employee_name");
  if (!/^#[0-9A-Fa-f]{6}$/.test(colorHex)) return redirect("/admin?error=invalid_color");

  await prisma.employee.create({
    data: {
      userId: user.id,
      name,
      colorHex
    }
  });

  return redirect("/admin");
}

export async function createWorkCaseAction(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const locationAddress = String(formData.get("locationAddress") ?? "").trim();
  const status = String(formData.get("status") ?? "planned").trim() || "planned";
  const workHoursRaw = String(formData.get("workHours") ?? "").trim();
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").trim();
  const materialsAmountRaw = String(formData.get("materialsAmount") ?? "").trim();
  const invoiceLineText = String(formData.get("invoiceLineText") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const endAtRaw = String(formData.get("endAt") ?? "");

  if (!title) return redirect("/calendar?error=missing_case_title");
  if (!employeeId) return redirect("/calendar?error=missing_employee");

  const startAt = parseDateTimeLocal(startAtRaw);
  const endAt = parseDateTimeLocal(endAtRaw);

  if (!startAt || !endAt) return redirect("/calendar?error=invalid_time");
  if (endAt <= startAt) return redirect("/calendar?error=end_before_start");
  if (!["planned", "in_progress", "done"].includes(status)) return redirect("/calendar?error=invalid_status");

  const workHours = workHoursRaw ? Number(workHoursRaw) : null;
  const hourlyRate = hourlyRateRaw ? Number(hourlyRateRaw) : null;
  const materialsAmount = materialsAmountRaw ? Number(materialsAmountRaw) : null;
  if (workHoursRaw && (Number.isNaN(workHours) || workHours! < 0)) return redirect("/calendar?error=invalid_work_hours");
  if (hourlyRateRaw && (Number.isNaN(hourlyRate) || hourlyRate! < 0)) return redirect("/calendar?error=invalid_hourly_rate");
  if (materialsAmountRaw && (Number.isNaN(materialsAmount) || materialsAmount! < 0)) {
    return redirect("/calendar?error=invalid_materials_amount");
  }

  await prisma.workCase.create({
    data: {
      userId: user.id,
      employeeId,
      customerId: customerId || null,
      title,
      description: description || null,
      locationAddress: locationAddress || null,
      status,
      workHours,
      hourlyRate,
      materialsAmount,
      invoiceLineText: invoiceLineText || null,
      startAt,
      endAt
    }
  });

  return redirect("/calendar");
}

