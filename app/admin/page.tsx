import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createEmployeeAction } from "@/app/actions/calendar";
import { createUserByAdminAction } from "@/app/actions/auth";

const errorMessages: Record<string, string> = {
  invalid_email: "Indtast en gyldig email.",
  password_too_short: "Adgangskoden skal være mindst 8 tegn.",
  email_in_use: "Emailen er allerede i brug."
};

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { error?: string; created_user?: string };
}) {
  const user = await requireUser();
  const employees = await prisma.employee.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" }
  });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true
    }
  });
  const error = searchParams?.error ? errorMessages[searchParams.error] ?? searchParams.error : undefined;

  return (
    <div>
      <h1>Administration</h1>

      {error ? (
        <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          Kunne ikke gemme: {error}
        </div>
      ) : null}
      {searchParams?.created_user ? (
        <div className="card" style={{ borderColor: "#86efac", background: "#ecfdf5" }}>
          Bruger oprettet.
        </div>
      ) : null}

      <div className="card">
        <h2>Opret bruger</h2>
        <form action={createUserByAdminAction}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Midlertidig adgangskode
            <input name="password" type="password" minLength={8} required />
          </label>
          <button className="primary" type="submit">
            Opret bruger
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Brugere</h2>
        {users.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Ingen brugere endnu.</div>
        ) : (
          users.map((u) => (
            <div key={u.id} style={{ marginTop: 8 }}>
              {u.email} - oprettet {u.createdAt.toLocaleDateString("da-DK")}
            </div>
          ))
        )}
      </div>

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

