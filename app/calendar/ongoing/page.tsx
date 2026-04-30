import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function OngoingCasesPage() {
  const user = await requireUser();
  const todayStart = startOfToday();

  const ongoingCases = await prisma.workCase.findMany({
    where: {
      userId: user.id,
      status: { not: "done" },
      startAt: { lt: todayStart }
    },
    include: {
      employee: true,
      customer: true
    },
    orderBy: { startAt: "asc" }
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Igangværende sager</h1>
        <div style={{ color: "#6b7280", fontSize: 14 }}>{ongoingCases.length} sager</div>
      </div>

      <div className="card" style={{ marginTop: 8 }}>
        Sager vises her når de er fra tidligere dage og stadig ikke er færdige/sendt til e-conomic.
      </div>

      {ongoingCases.length === 0 ? (
        <div className="card">Ingen igangværende sager lige nu.</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Start</th>
                <th>Titel</th>
                <th>Medarbejder</th>
                <th>Kunde</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ongoingCases.map((workCase) => (
                <tr key={workCase.id}>
                  <td>{workCase.startAt.toLocaleString("da-DK")}</td>
                  <td>{workCase.title}</td>
                  <td>{workCase.employee.name}</td>
                  <td>{workCase.customer?.name ?? "-"}</td>
                  <td>{workCase.status === "in_progress" ? "IGANG" : "PLANLAGT"}</td>
                  <td>
                    <Link href="/calendar">Åbn i kalender</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
