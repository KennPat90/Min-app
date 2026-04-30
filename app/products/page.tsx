import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { syncEconomicProductsAction } from "@/app/actions/economic";

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const user = await requireUser();
  const q = String(searchParams?.q ?? "").trim();

  const [products, syncState] = await Promise.all([
    prisma.product.findMany({
      where: {
        userId: user.id,
        ...(q
          ? {
              OR: [{ productNumber: { contains: q } }, { name: { contains: q } }, { description: { contains: q } }]
            }
          : {})
      },
      orderBy: [{ barred: "asc" }, { name: "asc" }]
    }),
    prisma.economicSyncState.findUnique({
      where: { userId: user.id }
    })
  ]);

  return (
    <div>
      <h1>Varer</h1>
      <div className="card">
        <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 13 }}>
          Sidst synk:{" "}
          {syncState?.lastProductsSyncAt
            ? `${new Date(syncState.lastProductsSyncAt).toLocaleString("da-DK")} (${syncState.lastProductsSyncCount ?? 0} varer)`
            : "Aldrig"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <form method="get" style={{ flex: 1 }}>
            <label>
              Søg vare (varenr., navn, beskrivelse)
              <input name="q" type="text" defaultValue={q} placeholder="Fx 1000 eller Lås" />
            </label>
            <button type="submit">Søg</button>
          </form>
          <form action={syncEconomicProductsAction}>
            <button type="submit">Synk varekatalog fra e-conomic</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2>Varekatalog</h2>
        {products.length === 0 ? (
          <div style={{ color: "#6b7280" }}>
            {q ? "Ingen varer matcher din søgning." : "Ingen varer endnu. Klik synk-knappen ovenfor."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Varenr.</th>
                <th>Navn</th>
                <th>Enhed</th>
                <th>Netto pris</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.productNumber}</td>
                  <td>
                    <div>{p.name}</div>
                    {p.description ? <div style={{ fontSize: 12, color: "#6b7280" }}>{p.description}</div> : null}
                  </td>
                  <td>{p.unit ?? "-"}</td>
                  <td>{p.unitNetPrice != null ? p.unitNetPrice.toFixed(2) : "-"}</td>
                  <td>{p.barred ? "Spærret" : "Aktiv"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

