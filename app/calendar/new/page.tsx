import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createWorkCaseAction } from "@/app/actions/calendar";
import CustomerSearchSelect from "@/app/calendar/CustomerSearchSelect";
import AddressAutocompleteInput from "@/app/components/AddressAutocompleteInput";

function toLocalDateTimeInputValue(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default async function NewCalendarCasePage({
  searchParams
}: {
  searchParams?: { startAt?: string; endAt?: string };
}) {
  const user = await requireUser();

  const [employees, customers] = await Promise.all([
    prisma.employee.findMany({
      where: { userId: user.id, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.customer.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { name: "asc" }
    })
  ]);
  const startDefault = searchParams?.startAt ? new Date(searchParams.startAt) : new Date();
  if (Number.isNaN(startDefault.getTime())) {
    startDefault.setMinutes(0, 0, 0);
    startDefault.setHours(Math.max(8, startDefault.getHours()));
  }
  const endDefault = searchParams?.endAt ? new Date(searchParams.endAt) : new Date(startDefault.getTime() + 60 * 60 * 1000);

  return (
    <div>
      <h1>Opret sag i kalender</h1>

      <div className="card">
        <form action={createWorkCaseAction}>
          <label>
            Titel
            <input name="title" type="text" required />
          </label>

          <label>
            Beskrivelse (valgfri)
            <input name="description" type="text" />
          </label>
          <input name="status" type="hidden" value="planned" />

          <label>
            Adresse (hvor der skal køres hen)
            <AddressAutocompleteInput name="locationAddress" placeholder="Søg adresse..." />
          </label>

          <label>
            Timer (valgfri)
            <input name="workHours" type="number" step="0.25" min="0" />
          </label>

          <label>
            Timepris (valgfri)
            <input name="hourlyRate" type="number" step="0.01" min="0" />
          </label>

          <label>
            Materialer beløb (valgfri)
            <input name="materialsAmount" type="number" step="0.01" min="0" />
          </label>

          <label>
            Fakturalinje tekst (valgfri)
            <input name="invoiceLineText" type="text" />
          </label>

          <label>
            Medarbejder
            <select name="employeeId" required>
              <option value="">Vælg medarbejder</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Kunde (valgfri) - søgbar
            <CustomerSearchSelect
              customers={customers.map((c) => ({
                id: c.id,
                name: c.name,
                economicCustomerNumber: c.economicCustomerNumber
              }))}
            />
          </label>

          <label>
            Start
            <input name="startAt" type="datetime-local" defaultValue={toLocalDateTimeInputValue(startDefault)} required />
          </label>

          <label>
            Slut
            <input name="endAt" type="datetime-local" defaultValue={toLocalDateTimeInputValue(endDefault)} required />
          </label>

          <button className="primary" type="submit">
            Opret sag
          </button>
        </form>
      </div>
    </div>
  );
}

