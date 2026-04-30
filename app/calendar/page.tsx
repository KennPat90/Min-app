import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import WeekCalendarGrid from "@/app/calendar/WeekCalendarGrid";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // mandag start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const user = await requireUser();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const prismaWithOptionalDelegates = prisma as typeof prisma & {
    employee?: { findMany: (...args: unknown[]) => Promise<any[]> };
    customer?: { findMany: (...args: unknown[]) => Promise<any[]> };
    workCase?: { findMany: (...args: unknown[]) => Promise<any[]> };
  };
  const missingPrismaModels: string[] = [];
  if (!prismaWithOptionalDelegates.employee?.findMany) missingPrismaModels.push("Employee");
  if (!prismaWithOptionalDelegates.customer?.findMany) missingPrismaModels.push("Customer");
  if (!prismaWithOptionalDelegates.workCase?.findMany) missingPrismaModels.push("WorkCase");

  const [employees, customers, workCases] = missingPrismaModels.length
    ? [[], [], []]
    : await Promise.all([
    prismaWithOptionalDelegates.employee!.findMany({
      where: { userId: user.id, active: true },
      orderBy: { name: "asc" }
    }),
    prismaWithOptionalDelegates.customer!.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { name: "asc" }
    }),
    prismaWithOptionalDelegates.workCase!.findMany({
      where: {
        userId: user.id,
        startAt: { gte: weekStart, lt: weekEnd }
      },
      include: {
        employee: true,
        customer: true
      },
      orderBy: { startAt: "asc" }
    })
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Kalender</h1>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Ugevisning</div>
      </div>

      {searchParams?.error ? (
        <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          Kunne ikke gemme: {searchParams.error}
        </div>
      ) : null}
      {missingPrismaModels.length ? (
        <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          Prisma client mangler model/delegate: {missingPrismaModels.join(", ")}. Kør <code>npm run prisma:generate</code> og genstart <code>npm run dev</code>.
        </div>
      ) : null}

      {employees.length === 0 ? (
        <div className="card">
          Ingen aktive medarbejdere endnu. Opret medarbejdere under <Link href="/admin">Administration</Link> først.
        </div>
      ) : null}

      <div className="card">
        <h2>Ugekalender</h2>
        <div style={{ marginBottom: 10, color: "#6b7280", fontSize: 13 }}>
          Klik på et ledigt tidspunkt for at oprette en ny sag. Træk en sag for at flytte den.
        </div>
        <WeekCalendarGrid
          weekStartIso={weekStart.toISOString()}
          employees={employees.map((e) => ({ id: e.id, name: e.name, colorHex: e.colorHex }))}
          customers={customers.map((c) => ({
              id: c.id,
              label: `${c.economicCustomerNumber ? `${c.economicCustomerNumber} - ` : ""}${c.name}`
            }))}
          items={workCases.map((wc) => ({
            id: wc.id,
            title: wc.title,
            caseNumber: wc.caseNumber,
            startAt: wc.startAt.toISOString(),
            endAt: wc.endAt.toISOString(),
            employeeId: wc.employeeId,
            employeeName: wc.employee.name,
            employeeColorHex: wc.employee.colorHex,
            customerId: wc.customerId,
            status: wc.status,
            description: wc.description,
            locationAddress: wc.locationAddress,
            customerLabel: wc.customer
              ? `${wc.customer.economicCustomerNumber ? `${wc.customer.economicCustomerNumber} - ` : ""}${wc.customer.name}`
              : null
          }))}
        />
      </div>
    </div>
  );
}

