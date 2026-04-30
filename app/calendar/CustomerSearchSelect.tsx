"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CustomerOption = {
  id: string;
  name: string;
  economicCustomerNumber: string | null;
};

function customerLabel(c: CustomerOption) {
  return `${c.economicCustomerNumber ? `${c.economicCustomerNumber} - ` : ""}${c.name}`;
}

export default function CustomerSearchSelect({ customers }: { customers: CustomerOption[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);
    return customers
      .filter((c) => {
        const label = customerLabel(c).toLowerCase();
        return label.includes(q);
      })
      .slice(0, 20);
  }, [customers, query]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input type="hidden" name="customerId" value={selectedId} />
      <input
        type="text"
        value={query}
        placeholder="Søg på kundenr. eller navn"
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
      />

      {open ? (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
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
              setSelectedId("");
              setQuery("");
              setOpen(false);
            }}
          >
            Ingen kunde
          </button>

          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              style={{ display: "block", width: "100%", textAlign: "left", margin: 0, border: 0, borderRadius: 0 }}
              onClick={() => {
                setSelectedId(c.id);
                setQuery(customerLabel(c));
                setOpen(false);
              }}
            >
              {customerLabel(c)}
            </button>
          ))}

          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 14 }}>Ingen kunder matcher din søgning.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

