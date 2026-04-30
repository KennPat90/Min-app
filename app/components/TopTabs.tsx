"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/login", "/signup"];

export default function TopTabs() {
  const pathname = usePathname();
  if (!pathname || HIDDEN_PATHS.includes(pathname)) return null;

  const tabs = [
    { href: "/calendar", label: "Kalender" },
    { href: "/calendar/ongoing", label: "IGANGVÆRENDE SAGER" },
    { href: "/customers", label: "Kunder" },
    { href: "/products", label: "Varer" },
    { href: "/admin", label: "Administration" }
  ];

  return (
    <nav className="top-tabs" aria-label="Hovednavigation">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || (tab.href === "/calendar" && pathname.startsWith("/calendar/") && pathname !== "/calendar/ongoing");
        return (
          <Link key={tab.href} href={tab.href} className={`top-tab ${active ? "active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

