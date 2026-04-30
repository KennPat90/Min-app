"use client";

import { useEffect, useId, useMemo, useState } from "react";

export default function AddressAutocompleteInput({
  name,
  value,
  defaultValue,
  onChange,
  placeholder
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const listId = useId();

  const inputValue = value ?? internalValue;

  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/address/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { items?: string[] };
        setSuggestions(data.items ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const hasSuggestions = useMemo(() => suggestions.length > 0, [suggestions]);

  return (
    <div style={{ position: "relative" }}>
      <input
        name={name}
        type="text"
        value={inputValue}
        placeholder={placeholder ?? "Søg adresse..."}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          const next = e.target.value;
          if (onChange) onChange(next);
          else setInternalValue(next);
          setOpen(true);
        }}
      />

      {open && (hasSuggestions || loading) ? (
        <div id={listId} className="address-autocomplete-list">
          {loading ? <div className="address-autocomplete-item muted">Søger adresser...</div> : null}
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="address-autocomplete-item"
              onMouseDown={(e) => {
                e.preventDefault();
                if (onChange) onChange(item);
                else setInternalValue(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

