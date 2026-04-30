import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createEmployeeAction } from "@/app/actions/calendar";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const user = await requireUser();
  const employees = await prisma.employee.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" }
  });

  return (
    <div>
      <h1>Administration</h1>

      {searchParams?.error ? (
        <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          Kunne ikke gemme: {searchParams.error}
        </div>
      ) : null}

      <div className="card">
        <h2>Opret medarbejder</h2>
        <form action={createEmployeeAction}>
          <label>
            Navn
            <input name="name" type="text" required />
          </label>
          <label>
            Farve
            <input name="colorHex" type="color" defaultValue="#2563eb" required />
          </label>
          <button className="primary" type="submit">
            Opret medarbejder
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Medarbejdere</h2>
        {employees.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Ingen medarbejdere endnu.</div>
        ) : (
          employees.map((e) => (
            <div key={e.id} style={{ marginTop: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  background: e.colorHex,
                  borderRadius: 999,
                  marginRight: 8
                }}
              />
              {e.name} {!e.active ? "(inaktiv)" : ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

