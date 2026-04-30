"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AddressAutocompleteInput from "@/app/components/AddressAutocompleteInput";

type CalendarCase = {
  id: string;
  title: string;
  caseNumber?: string | null;
  startAt: string;
  endAt: string;
  employeeId: string;
  employeeName: string;
  employeeColorHex: string;
  customerId?: string | null;
  status?: string;
  description?: string | null;
  locationAddress?: string | null;
  customerLabel?: string | null;
};

type MaterialProduct = {
  id: string;
  productNumber: string;
  name: string;
  unitNetPrice: number | null;
};

type ExistingMaterial = {
  id: string;
  quantity: number;
  unitPrice: number | null;
  productNumber: string;
  productName: string;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `rgba(37, 99, 235, ${alpha})`;
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getStatusLabel(status: string | undefined) {
  if (status === "in_progress") return "IGANG";
  if (status === "done") return "FÆRDIG";
  return null;
}

export default function WeekCalendarGrid({
  weekStartIso,
  employees,
  customers,
  items
}: {
  weekStartIso: string;
  employees: { id: string; name: string; colorHex: string }[];
  customers: { id: string; label: string }[];
  items: CalendarCase[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [materialsCaseId, setMaterialsCaseId] = useState<string | null>(null);
  const [materialsQuery, setMaterialsQuery] = useState("");
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [canSearchProducts, setCanSearchProducts] = useState(false);
  const [caseTitle, setCaseTitle] = useState("");
  const [caseCustomerName, setCaseCustomerName] = useState<string | null>(null);
  const [materialsProducts, setMaterialsProducts] = useState<MaterialProduct[]>([]);
  const [existingMaterials, setExistingMaterials] = useState<ExistingMaterial[]>([]);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isInvoicing, setIsInvoicing] = useState(false);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [copyStartAt, setCopyStartAt] = useState("");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isCopyingCase, setIsCopyingCase] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    caseNumber: string;
    description: string;
    locationAddress: string;
    status: string;
    employeeId: string;
    customerId: string;
    startAt: string;
    endAt: string;
  } | null>(null);

  const weekStart = useMemo(() => new Date(weekStartIso), [weekStartIso]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const dayNames = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const selectedCase = selectedCaseId ? localItems.find((i) => i.id === selectedCaseId) ?? null : null;

  useEffect(() => {
    if (!selectedCase) {
      setEditForm(null);
      return;
    }
    const toInput = (iso: string) => {
      const d = new Date(iso);
      const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
      return shifted.toISOString().slice(0, 16);
    };
    setEditForm({
      title: selectedCase.title,
      caseNumber: selectedCase.caseNumber ?? "",
      description: selectedCase.description ?? "",
      locationAddress: selectedCase.locationAddress ?? "",
      status: selectedCase.status ?? "planned",
      employeeId: selectedCase.employeeId,
      customerId: selectedCase.customerId ?? "",
      startAt: toInput(selectedCase.startAt),
      endAt: toInput(selectedCase.endAt)
    });
    const currentStart = new Date(selectedCase.startAt);
    const shiftedToNextDay = new Date(currentStart.getTime());
    shiftedToNextDay.setDate(shiftedToNextDay.getDate() + 1);
    const shifted = new Date(shiftedToNextDay.getTime() - shiftedToNextDay.getTimezoneOffset() * 60 * 1000);
    setCopyStartAt(shifted.toISOString().slice(0, 16));
    setShowCopyPicker(false);
    setCopyError(null);
    setInvoiceError(null);
    const selectedLabel =
      selectedCase.customerId && customers.find((c) => c.id === selectedCase.customerId)?.label
        ? customers.find((c) => c.id === selectedCase.customerId)?.label
        : "";
    setCustomerSearch(selectedLabel ?? "");
    setCustomerDropdownOpen(false);
  }, [selectedCase]);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (!customerDropdownRef.current) return;
      if (!customerDropdownRef.current.contains(event.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    return () => {
      if (zxingControlsRef.current) {
        zxingControlsRef.current.stop();
        zxingControlsRef.current = null;
      }
      if (scannerStreamRef.current) {
        scannerStreamRef.current.getTracks().forEach((track) => track.stop());
        scannerStreamRef.current = null;
      }
    };
  }, []);

  async function loadMaterials(caseId: string, query: string) {
    setMaterialsLoading(true);
    setMaterialsError(null);
    try {
      const res = await fetch(
        `/api/calendar/work-cases/materials?workCaseId=${encodeURIComponent(caseId)}&q=${encodeURIComponent(query)}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setMaterialsError(`Kunne ikke hente materialer${text ? ` (${text})` : ""}.`);
        return;
      }
      const data = (await res.json()) as {
        caseFound: boolean;
        caseTitle: string | null;
        customerName: string | null;
        canSearchProducts: boolean;
        products: MaterialProduct[];
        existing: ExistingMaterial[];
      };
      setCaseTitle(data.caseTitle ?? "");
      setCaseCustomerName(data.customerName);
      setCanSearchProducts(data.canSearchProducts);
      setMaterialsProducts(data.products);
      setExistingMaterials(data.existing);
      if (!data.caseFound) {
        setMaterialsError("Sagen blev ikke fundet. Viser kun varekatalog.");
      }
    } catch {
      setMaterialsError("Kunne ikke hente materialer.");
    } finally {
      setMaterialsLoading(false);
    }
  }

  async function closeScanner() {
    setScannerOpen(false);
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }
    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
  }

  async function openScanner() {
    setScannerError(null);
    setScannerSupported(true);

    const applyScannedCode = async (code: string) => {
      const cleaned = code.trim();
      if (!cleaned) return;
      setMaterialsQuery(cleaned);
      if (materialsCaseId) {
        await loadMaterials(materialsCaseId, cleaned);
      }
      await closeScanner();
    };

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (BarcodeDetectorClass) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }
        });
        scannerStreamRef.current = stream;
        setScannerOpen(true);

        requestAnimationFrame(async () => {
          const video = scannerVideoRef.current;
          if (!video) return;
          video.srcObject = stream;
          await video.play().catch(() => undefined);

          const detector = new BarcodeDetectorClass({
            formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e"]
          });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) return;

          let active = true;
          const scanLoop = async () => {
            if (!active) return;
            if (video.readyState >= 2) {
              canvas.width = video.videoWidth || 1280;
              canvas.height = video.videoHeight || 720;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              try {
                const codes = await detector.detect(canvas);
                if (codes.length > 0 && codes[0].rawValue) {
                  active = false;
                  await applyScannedCode(String(codes[0].rawValue));
                  return;
                }
              } catch {
                // ignore temporary detector errors
              }
            }
            requestAnimationFrame(scanLoop);
          };
          requestAnimationFrame(scanLoop);
        });
        return;
      } catch {
        // Fall through to ZXing fallback.
      }
    }

    try {
      setScannerSupported(true);
      setScannerOpen(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const video = scannerVideoRef.current;
      if (!video) return;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        video,
        async (result) => {
          if (!result) return;
          zxingControlsRef.current?.stop();
          zxingControlsRef.current = null;
          await applyScannedCode(result.getText());
        }
      );
      zxingControlsRef.current = controls;
    } catch {
      setScannerSupported(false);
      setScannerError("Scanner er ikke understoettet i denne browser.");
      await closeScanner();
    }
  }

  return (
    <div className="calendar-grid-wrap">
      <div className="week-calendar">
        <div className="week-calendar-header">
          <div className="time-header" />
          {weekDays.map((day, i) => (
            <div key={day.toISOString()} className="calendar-header">
              <div style={{ fontWeight: 600 }}>{dayNames[i]}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {day.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit" })}
              </div>
            </div>
          ))}
        </div>

        <div className="week-calendar-body">
          <div className="time-column">
            {hours.map((hour) => (
              <div key={`h-${hour}`} className="time-cell">
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => {
            const dayStart = new Date(day);
            const dayEnd = addDays(dayStart, 1);
            const dayItems = localItems.filter((wc) => {
              const start = new Date(wc.startAt);
              return start >= dayStart && start < dayEnd;
            });

            return (
              <div key={`col-${day.toISOString()}`} className="day-column">
                {hours.map((hour) => {
                  const key = `${dayIndex}-${hour}`;
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={`slot-cell ${dragOverKey === key ? "drag-over" : ""}`}
                      onClick={() => {
                        const newStart = addDays(weekStart, dayIndex);
                        newStart.setHours(hour, 0, 0, 0);
                        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
                        router.push(
                          `/calendar/new?startAt=${encodeURIComponent(newStart.toISOString())}&endAt=${encodeURIComponent(
                            newEnd.toISOString()
                          )}`
                        );
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverKey(key);
                      }}
                      onDragLeave={() => setDragOverKey((curr) => (curr === key ? null : curr))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverKey(null);
                        const caseId = e.dataTransfer.getData("text/case-id");
                        if (!caseId) return;

                        const current = localItems.find((x) => x.id === caseId);
                        if (!current) return;

                        const oldStart = new Date(current.startAt);
                        const oldEnd = new Date(current.endAt);
                        const durationMs = oldEnd.getTime() - oldStart.getTime();

                        const newStart = addDays(weekStart, dayIndex);
                        newStart.setHours(hour, 0, 0, 0);
                        const newEnd = new Date(newStart.getTime() + durationMs);

                        setLocalItems((prev) =>
                          prev.map((x) =>
                            x.id === caseId
                              ? { ...x, startAt: newStart.toISOString(), endAt: newEnd.toISOString() }
                              : x
                          )
                        );

                        startTransition(async () => {
                          const res = await fetch("/api/calendar/work-cases/move", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              caseId,
                              newStartAt: newStart.toISOString(),
                              newEndAt: newEnd.toISOString()
                            })
                          });
                          if (!res.ok) {
                            router.refresh();
                            return;
                          }
                          router.refresh();
                        });
                      }}
                    />
                  );
                })}

                {dayItems.map((wc) => {
                  const start = new Date(wc.startAt);
                  const end = new Date(wc.endAt);
                  const startHour = start.getHours() + start.getMinutes() / 60;
                  const endHour = end.getHours() + end.getMinutes() / 60;
                  const top = Math.max(0, startHour * 42);
                  const height = Math.max(28, (endHour - startHour) * 42);
                  const statusLabel = getStatusLabel(wc.status);

                  return (
                    <div
                      key={wc.id}
                      className="case-event draggable"
                      draggable
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCaseId(wc.id);
                    }}
                      onDragStart={(e) => e.dataTransfer.setData("text/case-id", wc.id)}
                      style={{
                        top,
                        height,
                        background: hexToRgba(wc.employeeColorHex, 0.1),
                        borderColor: hexToRgba(wc.employeeColorHex, 0.4)
                      }}
                      title="Træk og slip for at flytte"
                    >
                      <div className="case-event-accent" style={{ background: wc.employeeColorHex }} />
                      <div className="case-event-content">
                        {statusLabel ? (
                          <div className={`case-event-status ${wc.status === "done" ? "done" : "in-progress"}`}>
                            {statusLabel}
                          </div>
                        ) : null}
                        <div className="case-event-title">{wc.title}</div>
                        <div className="case-event-meta">
                          {start.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}-
                          {end.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="case-event-meta">{wc.employeeName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {isPending ? (
        <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>Gemmer flytning...</div>
      ) : null}

      {selectedCase ? (
        <div className="modal-backdrop" onClick={() => setSelectedCaseId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Sag detaljer</h3>
              <button type="button" onClick={() => setSelectedCaseId(null)}>
                Luk
              </button>
            </div>

            {editForm ? (
              <form
                style={{ marginTop: 10, fontSize: 14 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    const start = new Date(editForm.startAt);
                    const end = new Date(editForm.endAt);
                    const res = await fetch("/api/calendar/work-cases/update", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        caseId: selectedCase.id,
                        title: editForm.title,
                        caseNumber: editForm.caseNumber,
                        description: editForm.description,
                        locationAddress: editForm.locationAddress,
                        status: editForm.status,
                        employeeId: editForm.employeeId,
                        customerId: editForm.customerId || null,
                        startAt: start.toISOString(),
                        endAt: end.toISOString()
                      })
                    });
                    if (!res.ok) return;
                    setLocalItems((prev) =>
                      prev.map((x) =>
                        x.id === selectedCase.id
                          ? {
                              ...x,
                              title: editForm.title,
                              caseNumber: editForm.caseNumber || null,
                              description: editForm.description || null,
                              locationAddress: editForm.locationAddress || null,
                              status: editForm.status,
                              employeeId: editForm.employeeId,
                              employeeName: employees.find((emp) => emp.id === editForm.employeeId)?.name ?? x.employeeName,
                              employeeColorHex:
                                employees.find((emp) => emp.id === editForm.employeeId)?.colorHex ?? x.employeeColorHex,
                              customerId: editForm.customerId || null,
                              customerLabel: editForm.customerId
                                ? customers.find((c) => c.id === editForm.customerId)?.label ?? null
                                : null,
                              startAt: start.toISOString(),
                              endAt: end.toISOString()
                            }
                          : x
                      )
                    );
                    router.refresh();
                    setSelectedCaseId(null);
                  });
                }}
              >
                <label>
                  Titel
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, title: e.target.value } : curr))}
                    required
                  />
                </label>
                <label>
                  Sags nr.
                  <input
                    value={editForm.caseNumber}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, caseNumber: e.target.value } : curr))}
                    placeholder="Fx SAG-10024"
                  />
                </label>
                <label>
                  Medarbejder
                  <select
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, employeeId: e.target.value } : curr))}
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, status: e.target.value } : curr))}
                  >
                    <option value="planned">Planlagt</option>
                    <option value="in_progress">Igang</option>
                    <option value="done">Færdig</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setEditForm((curr) => (curr ? { ...curr, status: "done" } : curr))}
                  style={{ marginTop: 8 }}
                >
                  Marker som udført
                </button>
                <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563" }}>
                  Kunde:{" "}
                  {editForm.customerId
                    ? customers.find((c) => c.id === editForm.customerId)?.label ?? "Ingen kunde"
                    : "Ingen kunde"}
                </div>
                <label>
                  Kunde
                  <div ref={customerDropdownRef} style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={customerSearch}
                      onFocus={() => setCustomerDropdownOpen(true)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomerSearch(value);
                        setEditForm((curr) => (curr ? { ...curr, customerId: "" } : curr));
                        setCustomerDropdownOpen(true);
                      }}
                      placeholder="Søg kunde..."
                    />
                    {customerDropdownOpen ? (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 30,
                          width: "100%",
                          marginTop: 4,
                          background: "#fff",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          maxHeight: 220,
                          overflowY: "auto"
                        }}
                      >
                        <button
                          type="button"
                          style={{ display: "block", width: "100%", textAlign: "left", margin: 0, border: 0, borderRadius: 0 }}
                          onClick={() => {
                            setEditForm((curr) => (curr ? { ...curr, customerId: "" } : curr));
                            setCustomerSearch("");
                            setCustomerDropdownOpen(false);
                          }}
                        >
                          Ingen kunde
                        </button>
                        {customers
                          .filter((c) => c.label.toLowerCase().includes(customerSearch.trim().toLowerCase()))
                          .slice(0, 20)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                margin: 0,
                                border: 0,
                                borderRadius: 0
                              }}
                              onClick={() => {
                                setEditForm((curr) => (curr ? { ...curr, customerId: c.id } : curr));
                                setCustomerSearch(c.label);
                                setCustomerDropdownOpen(false);
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </label>
                <label>
                  Start
                  <input
                    type="datetime-local"
                    value={editForm.startAt}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, startAt: e.target.value } : curr))}
                    required
                  />
                </label>
                <label>
                  Slut
                  <input
                    type="datetime-local"
                    value={editForm.endAt}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, endAt: e.target.value } : curr))}
                    required
                  />
                </label>
                <label>
                  Beskrivelse
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((curr) => (curr ? { ...curr, description: e.target.value } : curr))}
                    rows={4}
                    style={{
                      width: "100%",
                      minHeight: 96,
                      padding: "10px 12px",
                      marginTop: 6,
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      resize: "vertical"
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMaterialsCaseId(selectedCase.id);
                    setMaterialsQuery("");
                    setCaseTitle(selectedCase.title);
                    setCaseCustomerName(selectedCase.customerLabel ?? null);
                    setCanSearchProducts(false);
                    void loadMaterials(selectedCase.id, "");
                  }}
                  style={{ marginTop: 8 }}
                >
                  Tilføj materialer til sag
                </button>
                {(editForm?.status ?? selectedCase.status ?? "planned") === "in_progress" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyError(null);
                        setShowCopyPicker((curr) => !curr);
                      }}
                      style={{ marginTop: 8 }}
                    >
                      Kopier til ny dag
                    </button>
                    {showCopyPicker ? (
                      <>
                        <label>
                          Vælg ny dag og tidspunkt
                          <input
                            type="datetime-local"
                            value={copyStartAt}
                            onChange={(e) => setCopyStartAt(e.target.value)}
                            required
                          />
                        </label>
                        <button
                          type="button"
                          disabled={isCopyingCase || !copyStartAt}
                          onClick={async () => {
                            const sourceStart = new Date(selectedCase.startAt);
                            const sourceEnd = new Date(selectedCase.endAt);
                            const durationMs = sourceEnd.getTime() - sourceStart.getTime();
                            const newStart = new Date(copyStartAt);
                            if (Number.isNaN(newStart.getTime()) || durationMs <= 0) {
                              setCopyError("Ugyldigt tidspunkt for kopi.");
                              return;
                            }
                            const newEnd = new Date(newStart.getTime() + durationMs);

                            setCopyError(null);
                            setIsCopyingCase(true);
                            const res = await fetch("/api/calendar/work-cases/copy", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                caseId: selectedCase.id,
                                newStartAt: newStart.toISOString(),
                                newEndAt: newEnd.toISOString()
                              })
                            });
                            setIsCopyingCase(false);

                            if (!res.ok) {
                              const body = (await res.json().catch(() => ({}))) as { error?: string };
                              setCopyError(body.error ?? "Kunne ikke kopiere sag.");
                              return;
                            }

                            router.refresh();
                            setSelectedCaseId(null);
                          }}
                          style={{ marginTop: 8 }}
                        >
                          {isCopyingCase ? "Kopierer..." : "Gem kopi"}
                        </button>
                      </>
                    ) : null}
                    {copyError ? <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{copyError}</div> : null}
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    if ((editForm?.status ?? selectedCase.status ?? "planned") === "done") {
                      const shouldResend = window.confirm(
                        "Du har allerede afsluttet sagen, er du sikker på du vil sende igen?"
                      );
                      if (!shouldResend) return;
                    }
                    setInvoiceError(null);
                    setIsInvoicing(true);
                    const res = await fetch("/api/calendar/work-cases/invoice-draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ caseId: selectedCase.id, caseNumber: editForm.caseNumber })
                    });
                    setIsInvoicing(false);
                    if (!res.ok) {
                      const body = (await res.json().catch(() => ({}))) as { error?: string };
                      setInvoiceError(body.error ?? "Kunne ikke sende til e-conomic ordrekladde.");
                      return;
                    }
                    setEditForm((curr) => (curr ? { ...curr, status: "done" } : curr));
                    setLocalItems((prev) =>
                      prev.map((x) =>
                        x.id === selectedCase.id ? { ...x, status: "done", caseNumber: editForm.caseNumber || null } : x
                      )
                    );
                    router.refresh();
                  }}
                  style={{
                    marginTop: 8,
                    background: (editForm?.status ?? selectedCase.status ?? "planned") === "done" ? "#dc2626" : "#f9fafb",
                    color: (editForm?.status ?? selectedCase.status ?? "planned") === "done" ? "#ffffff" : "#111827",
                    borderColor: (editForm?.status ?? selectedCase.status ?? "planned") === "done" ? "#dc2626" : "#d1d5db"
                  }}
                >
                  {isInvoicing
                    ? "Sender..."
                    : (editForm?.status ?? selectedCase.status ?? "planned") === "done"
                    ? "Send igen til e-conomic ordrekladde"
                    : "Send til e-conomic ordrekladde"}
                </button>
                {invoiceError ? <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{invoiceError}</div> : null}
                <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>
                  Adresse: {editForm.locationAddress.trim() ? editForm.locationAddress : "Ingen adresse"}
                </div>
                <label>
                  Adresse
                  <AddressAutocompleteInput
                    name="locationAddressReadonly"
                    value={editForm.locationAddress}
                    onChange={(value) => setEditForm((curr) => (curr ? { ...curr, locationAddress: value } : curr))}
                    placeholder="Søg adresse..."
                  />
                </label>
                {editForm.locationAddress.trim() ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editForm.locationAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-block", marginTop: 8 }}
                  >
                    Åbn i navigation
                  </a>
                ) : null}
                <button className="primary" type="submit">
                  Gem ændringer
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {materialsCaseId ? (
        <div className="modal-backdrop">
          <div className="modal-card materials-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Tilføj materialer til sag</h3>
              <button type="button" onClick={() => setMaterialsCaseId(null)}>
                Luk
              </button>
            </div>
            <div style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>
              Sag: {caseTitle || "-"}
              {caseCustomerName ? ` | Kunde: ${caseCustomerName}` : ""}
            </div>
            <div className="materials-modal-scroll">
              <div className="card materials-search-sticky" style={{ marginTop: 10 }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!materialsCaseId) return;
                    void loadMaterials(materialsCaseId, materialsQuery);
                  }}
                >
                  <label>
                    Søg i varer
                    <input
                      type="text"
                      value={materialsQuery}
                      onChange={(e) => setMaterialsQuery(e.target.value)}
                      placeholder="Søg varenr. eller navn"
                    />
                  </label>
                  <button type="button" onClick={() => void openScanner()}>
                    📷 Scan varenr
                  </button>
                  <button type="submit">Søg</button>
                </form>
                {scannerError ? <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{scannerError}</div> : null}
                {!scannerSupported ? (
                  <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
                    Scanner virker bedst i HTTPS/PWA eller paa localhost.
                  </div>
                ) : null}
              </div>

              {materialsError ? (
                <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
                  {materialsError}
                </div>
              ) : null}
              {materialsLoading ? <div style={{ color: "#6b7280" }}>Henter materialer...</div> : null}

              <div className="card">
                <h4 style={{ marginTop: 0 }}>Varekatalog (max 50)</h4>
                {!canSearchProducts ? (
                  <div style={{ color: "#6b7280" }}>Skriv mindst 2 tegn i søgefeltet for at finde varer.</div>
                ) : materialsProducts.length === 0 ? (
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
                      {materialsProducts.map((p) => (
                        <tr key={p.id}>
                          <td>{p.productNumber}</td>
                          <td>{p.name}</td>
                          <td>{p.unitNetPrice != null ? p.unitNetPrice.toFixed(2) : "-"}</td>
                          <td>1</td>
                          <td>
                            <button
                              type="button"
                              disabled={addingProductId === p.id || !materialsCaseId}
                              onClick={async () => {
                                if (!materialsCaseId) return;
                                const quantity = 1;
                                setAddingProductId(p.id);
                                setMaterialsError(null);
                                const res = await fetch("/api/calendar/work-cases/materials/add", {
                                  method: "POST",
                                  credentials: "same-origin",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    workCaseId: materialsCaseId,
                                    productId: p.id,
                                    quantity
                                  })
                                });
                                setAddingProductId(null);
                                if (!res.ok) {
                                  const text = await res.text().catch(() => "");
                                  setMaterialsError(`Kunne ikke tilføje materiale${text ? ` (${text})` : ""}.`);
                                  return;
                                }
                                await loadMaterials(materialsCaseId, materialsQuery);
                              }}
                            >
                              {addingProductId === p.id ? "Tilføjer..." : "Tilføj"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card">
                <h4 style={{ marginTop: 0 }}>Tilføjede materialer</h4>
                {existingMaterials.length === 0 ? (
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
                      {existingMaterials.map((m) => {
                        const subtotal = (m.unitPrice ?? 0) * m.quantity;
                        return (
                          <tr key={m.id}>
                            <td>{m.productNumber}</td>
                            <td>{m.productName}</td>
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
          </div>
        </div>
      ) : null}
      {scannerOpen ? (
        <div className="modal-backdrop" onClick={() => void closeScanner()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Scan varenummer</h3>
              <button type="button" onClick={() => void closeScanner()}>
                Luk
              </button>
            </div>
            <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
              Hold kameraet over stregkoden. Varenummer udfyldes automatisk.
            </div>
            <video
              ref={scannerVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", marginTop: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

