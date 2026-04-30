import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { createCustomerAction, deleteCustomerAction } from "@/app/actions/customers";
import { syncEconomicCustomersAction } from "@/app/actions/economic";

export default async function CustomersPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const user = await requireUser();
  const q = String(searchParams?.q ?? "").trim();
  const customers = await prisma.customer.findMany({
    where: {
      userId: user.id,
      archivedAt: null,
      ...(q
        ? {
            OR: [
              { economicCustomerNumber: { contains: q } },
              { name: { contains: q } },
              { address: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Kunder</h1>
        <div>
          <div style={{ marginBottom: 8 }}>
            <Link href="/calendar">Til kalender</Link>
          </div>
          <div style={{ fontSize: 14, color: "#374151" }}>Logget ind som {user.email}</div>
          <form action={logoutAction}>
            <button type="submit">Log ud</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2>Opret kunde</h2>
        <form action={createCustomerAction}>
          <label>
            Navn
            <input name="name" type="text" required />
          </label>

          <label>
            Email
            <input name="email" type="email" required />
          </label>

          <label>
            Telefon
            <input name="phone" type="text" required />
          </label>

          <label>
            Kundenr. (e-conomic)
            <input name="economicCustomerNumber" type="text" required />
          </label>

          <label>
            CVR-nummer
            <input name="cvrNumber" type="text" required />
          </label>

          <label>
            Adresse
            <input name="address" type="text" required />
          </label>

          <label>
            Postnummer
            <input name="postalCode" type="text" required />
          </label>

          <label>
            By
            <input name="city" type="text" required />
          </label>

          {/* Land er fast Danmark for nu (til senere internationalisering) */}
          <input type="hidden" name="country" value="Danmark" />

          <label>
            Betalingsbetingelser
            <input name="paymentTerms" type="text" required />
          </label>

          <button className="primary" type="submit">
            Opret kunde
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Liste over kunder</h2>
        <form method="get" style={{ marginTop: 10, marginBottom: 10 }}>
          <label>
            Søg kunde (kundenr., navn, adresse)
            <input name="q" type="text" placeholder="Fx 1001, Jensen, Nørregade" defaultValue={q} />
          </label>
          <button type="submit">Søg</button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            e-conomic: master. Klik for at synkronisere kunder.
          </div>
          <form action={syncEconomicCustomersAction}>
            <button type="submit">Synk fra e-conomic</button>
          </form>
        </div>

        {customers.length === 0 ? (
          <div style={{ marginTop: 8, color: "#374151" }}>
            {q ? "Ingen kunder matcher din søgning." : "Ingen kunder endnu. Opret en ovenfor."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kundenr.</th>
                <th>Navn</th>
                <th>CVR</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Adresse</th>
                <th>Betalingsbetingelser</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.economicCustomerNumber ?? "-"}</td>
                  <td>{c.name}</td>
                  <td>{c.cvrNumber ?? "-"}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>
                    {c.address ?? "-"}
                    {c.postalCode || c.city ? (
                      <span style={{ color: "#6b7280" }}>
                        {" "}
                        {c.postalCode ?? ""} {c.city ?? ""}
                      </span>
                    ) : null}
                  </td>
                  <td>{c.paymentTerms ?? "-"}</td>
                  <td className="row-actions">
                    <form action={deleteCustomerAction}>
                      <input type="hidden" name="customerId" value={c.id} />
                      <button type="submit" style={{ background: "#fef2f2", borderColor: "#fca5a5" }}>
                        Slet
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}>
          Næste trin: senere kan vi tilføje integration til e-conomic API.
        </div>
      </div>
    </div>
  );
}

