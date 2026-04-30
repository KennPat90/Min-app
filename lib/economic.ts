import { prisma } from "@/lib/prisma";

type EconomicCustomersApiCustomer = {
  customerNumber: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  cvrNo?: string | null;
  address1?: string | null;
  address2?: string | null;
  postCode?: string | null;
  city?: string | null;
  country?: string | null;
  paymentDays?: number | null;
  paymentTermId?: number | null;
  isDeleted?: boolean;
};

type EconomicRestProduct = {
  productNumber?: string;
  name?: string;
  description?: string | null;
  unit?: { unitNumber?: string; name?: string } | string | null;
  salesPrice?: number | null;
  unitNetPrice?: number | null;
  barred?: boolean;
};

type EconomicRestCustomer = {
  customerNumber?: number;
  layout?: { layoutNumber?: number } | null;
  paymentTerms?: { paymentTermsNumber?: number } | null;
  vatZone?: { vatZoneNumber?: number } | null;
};

type EconomicRestEmployee = {
  employeeNumber?: number;
  name?: string;
  barred?: boolean;
};

async function fetchFirstNumberFromCollection(
  path: string,
  key: string
): Promise<number | null> {
  const res = await fetch(`${economicRestBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      ...getEconomicAuthHeaders(),
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { collection?: Array<Record<string, unknown>> };
  const first = data.collection?.[0];
  if (!first) return null;
  const value = Number(first[key]);
  return Number.isNaN(value) ? null : value;
}

function formatPaymentTerms(customer: EconomicCustomersApiCustomer) {
  const days = customer.paymentDays ?? 0;
  if (days > 0) return `${days} dage`;
  const termId = customer.paymentTermId ?? 0;
  if (termId > 0) return `Betalingsbetingelser ${termId}`;
  return "";
}

function formatAddress(customer: EconomicCustomersApiCustomer) {
  const parts = [customer.address1, customer.address2].map((v) => (v ?? "").trim()).filter(Boolean);
  return parts.join(" ").slice(0, 500);
}

function economicBaseUrl() {
  const base = process.env.ECONOMIC_BASE_URL ?? "https://apis.e-conomic.com";
  const version = process.env.ECONOMIC_CUSTOMERS_API_VERSION ?? "v3.1.0";
  return `${base}/customersapi/${version}`;
}

function economicRestBaseUrl() {
  return process.env.ECONOMIC_REST_BASE_URL ?? "https://restapi.e-conomic.com";
}

function getEconomicAuthHeaders() {
  const token = process.env.ECONOMIC_APP_SECRET_TOKEN;
  const grantToken = process.env.ECONOMIC_AGREEMENT_GRANT_TOKEN;
  if (!token || !grantToken) {
    throw new Error("Missing e-conomic tokens in environment variables.");
  }
  if (token === "demo" || grantToken === "demo") {
    throw new Error("Demo tokens detected. Set your real ECONOMIC_APP_SECRET_TOKEN and ECONOMIC_AGREEMENT_GRANT_TOKEN.");
  }
  return {
    "X-AppSecretToken": token,
    "X-AgreementGrantToken": grantToken,
    Accept: "application/json"
  };
}

async function fetchEconomicCustomersPage(args: { cursor?: string }) {
  const baseUrl = economicBaseUrl();
  const url = args.cursor ? `${baseUrl}/customers?cursor=${encodeURIComponent(args.cursor)}` : `${baseUrl}/customers`;

  const res = await fetch(url, {
    method: "GET",
    headers: getEconomicAuthHeaders(),
    // Server-side sync: keep it simple.
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`e-conomic customers sync failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = (await res.json()) as { cursor?: string; items?: EconomicCustomersApiCustomer[] };
  return { cursor: data.cursor, items: data.items ?? [] };
}

async function fetchEconomicProductsPage(args: { skippages?: number; pagesize: number; url?: string }) {
  const base = economicRestBaseUrl();
  const url = args.url ?? `${base}/products?pagesize=${args.pagesize}&skippages=${args.skippages ?? 0}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...getEconomicAuthHeaders(),
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`e-conomic products sync failed: ${res.status} ${res.statusText} ${text}`);
  }
  const data = (await res.json()) as
    | {
        collection?: EconomicRestProduct[];
        pagination?: { nextPage?: string | null; lastPage?: string | null; skipPages?: number; results?: number };
      }
    | { items?: EconomicRestProduct[] };
  const items = "collection" in data ? data.collection ?? [] : data.items ?? [];
  const pagination = "pagination" in data ? data.pagination : undefined;
  return { items, pagination };
}

export async function syncEconomicCustomersForUser(userId: string) {
  // Full sync (idempotent upsert) based on cursor-pagination.
  // We only *archive* based on e-conomic isDeleted. Local "archive" is not removed by sync.
  const maxPages = 50;
  let cursor: string | undefined = undefined;
  let page = 0;

  let created = 0;
  let updated = 0;
  let archived = 0;

  while (page < maxPages) {
    page += 1;
    const { cursor: nextCursor, items } = await fetchEconomicCustomersPage({ cursor });

    for (const customer of items) {
      const economicCustomerNumber = String(customer.customerNumber);
      const isDeleted = Boolean(customer.isDeleted);

      const createData = {
        userId,
        name: customer.name ?? "",
        email: (customer.email ?? "").toString(),
        phone: (customer.phone ?? "").toString(),
        economicCustomerNumber,
        cvrNumber: customer.cvrNo ?? undefined,
        address: formatAddress(customer) || undefined,
        postalCode: customer.postCode ?? undefined,
        city: customer.city ?? undefined,
        country: "Danmark",
        paymentTerms: formatPaymentTerms(customer) || undefined,
        archivedAt: isDeleted ? new Date() : null
      };

      const updateData: Parameters<typeof prisma.customer.upsert>[0]["update"] = {
        name: createData.name,
        email: createData.email,
        phone: createData.phone,
        cvrNumber: createData.cvrNumber,
        address: createData.address,
        postalCode: createData.postalCode,
        city: createData.city,
        country: createData.country,
        paymentTerms: createData.paymentTerms
      };

      if (isDeleted) {
        // Arkiver lokalt hvis e-conomic siger kunden er slettet.
        updateData.archivedAt = new Date();
        archived += 1;
      }

      const existing = await prisma.customer.findUnique({
        where: { userId_economicCustomerNumber: { userId, economicCustomerNumber } }
      });

      if (!existing) created += 1;
      else updated += 1;

      await prisma.customer.upsert({
        where: { userId_economicCustomerNumber: { userId, economicCustomerNumber } },
        create: createData,
        update: updateData
      });
    }

    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return { created, updated, archived, pages: page };
}

export async function syncEconomicProductsForUser(userId: string) {
  const pageSize = 1000;
  let nextPageUrl: string | undefined;
  let pages = 0;
  let created = 0;
  let updated = 0;
  let remoteResults: number | null = null;

  while (true) {
    pages += 1;
    const { items, pagination } = await fetchEconomicProductsPage({
      pagesize: pageSize,
      url: nextPageUrl
    });
    if (remoteResults == null && typeof pagination?.results === "number") {
      remoteResults = pagination.results;
    }

    for (const p of items) {
      const productNumber = String(p.productNumber ?? "").trim();
      if (!productNumber) continue;
      const name = String(p.name ?? "").trim() || productNumber;
      const unit =
        typeof p.unit === "string"
          ? p.unit
          : p.unit?.name ?? (p.unit?.unitNumber ? String(p.unit.unitNumber) : undefined);
      const unitNetPrice = p.unitNetPrice ?? p.salesPrice ?? null;
      const existing = await prisma.product.findUnique({
        where: { userId_productNumber: { userId, productNumber } }
      });
      if (existing) updated += 1;
      else created += 1;

      await prisma.product.upsert({
        where: { userId_productNumber: { userId, productNumber } },
        create: {
          userId,
          productNumber,
          name,
          description: p.description ?? null,
          unit: unit ?? null,
          unitNetPrice,
          barred: Boolean(p.barred)
        },
        update: {
          name,
          description: p.description ?? null,
          unit: unit ?? null,
          unitNetPrice,
          barred: Boolean(p.barred)
        }
      });
    }

    nextPageUrl = pagination?.nextPage ?? undefined;
    if (!nextPageUrl) break;
  }

  return { created, updated, pages, remoteResults };
}

export async function createEconomicOrderDraftForWorkCase(userId: string, workCaseId: string) {
  const workCase = await prisma.workCase.findFirst({
    where: { id: workCaseId, userId },
    include: {
      customer: true,
      employee: true,
      materials: {
        include: { product: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!workCase) throw new Error("Work case not found.");
  if (!workCase.customerId || !workCase.customer) throw new Error("Work case has no customer.");
  const customerNumberRaw = workCase.customer.economicCustomerNumber;
  const customerNumber = Number(customerNumberRaw);
  if (!customerNumberRaw || Number.isNaN(customerNumber)) {
    throw new Error("Customer is missing valid e-conomic customer number.");
  }

  const lines: Array<{
    description: string;
    quantity: number;
    unitNetPrice: number;
    product?: { productNumber: string };
  }> = [];

  if (workCase.workHours && workCase.workHours > 0 && workCase.hourlyRate != null && workCase.hourlyRate >= 0) {
    lines.push({
      description: workCase.invoiceLineText?.trim() || `Arbejde: ${workCase.title}`,
      quantity: workCase.workHours,
      unitNetPrice: workCase.hourlyRate
    });
  }

  for (const m of workCase.materials) {
    const qty = m.quantity > 0 ? m.quantity : 1;
    const price = m.unitPrice ?? 0;
    lines.push({
      description: m.lineText?.trim() || m.product.name || `Materiale ${m.product.productNumber}`,
      quantity: qty,
      unitNetPrice: price,
      product: { productNumber: m.product.productNumber }
    });
  }

  if (lines.length === 0) {
    throw new Error("No invoice lines found on work case (hours/materials).");
  }

  const customerRes = await fetch(`${economicRestBaseUrl()}/customers/${customerNumber}`, {
    method: "GET",
    headers: {
      ...getEconomicAuthHeaders(),
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });
  if (!customerRes.ok) {
    const text = await customerRes.text().catch(() => "");
    throw new Error(`e-conomic customer lookup failed: ${customerRes.status} ${customerRes.statusText} ${text}`);
  }
  const customerData = (await customerRes.json()) as EconomicRestCustomer;
  const defaultLayoutNumber = Number(process.env.ECONOMIC_DEFAULT_LAYOUT_NUMBER ?? "");
  const defaultPaymentTermsNumber = Number(process.env.ECONOMIC_DEFAULT_PAYMENT_TERMS_NUMBER ?? "");
  const defaultVatZoneNumber = Number(process.env.ECONOMIC_DEFAULT_VAT_ZONE_NUMBER ?? "");

  const layoutNumber =
    customerData.layout?.layoutNumber ??
    (!Number.isNaN(defaultLayoutNumber) && defaultLayoutNumber > 0 ? defaultLayoutNumber : null) ??
    (await fetchFirstNumberFromCollection("/layouts", "layoutNumber"));
  const paymentTermsNumber =
    customerData.paymentTerms?.paymentTermsNumber ??
    (!Number.isNaN(defaultPaymentTermsNumber) && defaultPaymentTermsNumber > 0 ? defaultPaymentTermsNumber : null) ??
    (await fetchFirstNumberFromCollection("/payment-terms", "paymentTermsNumber"));
  const vatZoneNumber =
    customerData.vatZone?.vatZoneNumber ??
    (!Number.isNaN(defaultVatZoneNumber) && defaultVatZoneNumber > 0 ? defaultVatZoneNumber : null) ??
    (await fetchFirstNumberFromCollection("/vat-zones", "vatZoneNumber"));
  if (!layoutNumber || !paymentTermsNumber || !vatZoneNumber) {
    throw new Error("Customer in e-conomic is missing layout/payment terms/vat zone.");
  }

  let salesPersonEmployeeNumber: number | null = null;
  try {
    const employeesRes = await fetch(`${economicRestBaseUrl()}/employees?pagesize=1000&skippages=0`, {
      method: "GET",
      headers: {
        ...getEconomicAuthHeaders(),
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
    if (employeesRes.ok) {
      const employeesData = (await employeesRes.json()) as { collection?: EconomicRestEmployee[] };
      const employeeName = workCase.employee.name.trim().toLowerCase();
      const matched = (employeesData.collection ?? []).find(
        (emp) => !emp.barred && (emp.name ?? "").trim().toLowerCase() === employeeName
      );
      const num = Number(matched?.employeeNumber);
      if (!Number.isNaN(num) && num > 0) salesPersonEmployeeNumber = num;
    }
  } catch {
    salesPersonEmployeeNumber = null;
  }

  const payload: Record<string, unknown> = {
    date: new Date().toISOString().slice(0, 10),
    currency: "DKK",
    layout: { layoutNumber },
    paymentTerms: { paymentTermsNumber },
    customer: { customerNumber },
    recipient: { name: workCase.customer.name, vatZone: { vatZoneNumber } },
    notes: {
      heading: workCase.title,
      textLine1: workCase.description?.trim() || ""
    },
    lines
  };
  const otherReference = workCase.caseNumber?.trim();
  if (otherReference || salesPersonEmployeeNumber) {
    payload.references = {
      ...(otherReference ? { other: otherReference } : {}),
      ...(salesPersonEmployeeNumber ? { salesPerson: { employeeNumber: salesPersonEmployeeNumber } } : {})
    };
  }

  const res = await fetch(`${economicRestBaseUrl()}/orders/drafts`, {
    method: "POST",
    headers: {
      ...getEconomicAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`e-conomic draft order failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  return data;
}

