import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { addMaterialToWorkCaseAction } from "@/app/actions/materials";

export default async function CaseMaterialsPage({
  params,
  searchParams
}: {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ q?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { caseId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = String(resolvedSearchParams.q ?? "").trim();

  const workCase = await prisma.workCase.findFirst({
    where: { id: caseId, userId: user.id },
    include: { customer: true }
  });
  if (!workCase) {
    return <div className="card">Sagen findes ikke.</div>;
  }

  const [products, existing] = await Promise.all([
    prisma.product.findMany({
      where: {
        userId: user.id,
        barred: false,
        ...(q
          ? {
              OR: [{ productNumber: { contains: q } }, { name: { contains: q } }, { description: { contains: q } }]
            }
          : {})
      },
      orderBy: { name: "asc" },
      take: 50
    }),
    prisma.workCaseMaterial.findMany({
      where: { userId: user.id, workCaseId: caseId },
      include: { product: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div>
      <h1>Tilføj materialer til sag</h1>
      <div style={{ color: "#6b7280", fontSize: 14 }}>
        Sag: {workCase.title}
        {workCase.customer ? ` | Kunde: ${workCase.customer.name}` : ""}
      </div>

      {resolvedSearchParams.error ? (
        <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          Fejl: {resolvedSearchParams.error}
        </div>
      ) : null}

      <div className="card">
        <form method="get">
          <label>
            Søg i varer
            <input name="q" type="text" defaultValue={q} placeholder="Søg varenr. eller navn" />
          </label>
          <button type="submit">Søg</button>
        </form>
      </div>

      <div className="card">
        <h2>Varekatalog (max 50)</h2>
        {products.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Ingen varer matcher søgningen.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Varenr.</th>
                <th>Navn</th>
                <th>Pris</th>
                <th>Antal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.productNumber}</td>
                  <td>{p.name}</td>
                  <td>{p.unitNetPrice != null ? p.unitNetPrice.toFixed(2) : "-"}</td>
                  <td>
                    <form action={addMaterialToWorkCaseAction}>
                      <input type="hidden" name="workCaseId" value={caseId} />
                      <input type="hidden" name="productId" value={p.id} />
                      <input name="quantity" type="number" step="0.01" min="0.01" defaultValue="1" />
                      <button type="submit">Tilføj</button>
                    </form>
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Tilføjede materialer</h2>
        {existing.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Ingen materialer tilføjet endnu.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Varenr.</th>
                <th>Navn</th>
                <th>Antal</th>
                <th>Pris</th>
                <th>Linje subtotal</th>
              </tr>
            </thead>
            <tbody>
              {existing.map((m) => {
                const subtotal = (m.unitPrice ?? 0) * m.quantity;
                return (
                  <tr key={m.id}>
                    <td>{m.product.productNumber}</td>
                    <td>{m.product.name}</td>
                    <td>{m.quantity}</td>
                    <td>{m.unitPrice != null ? m.unitPrice.toFixed(2) : "-"}</td>
                    <td>{subtotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

