'use client'

import Link from "next/link";
import { ThemeToggle } from "../ThemeToggle";

interface NavProps {
  right?: React.ReactNode;
}

export function TechNav({ right }: NavProps) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 28px", borderBottom: "1px solid var(--border)",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{
          width: 9, height: 9, borderRadius: "50%",
          background: "var(--accent)", boxShadow: "0 0 12px var(--accent-line)",
        }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em" }}>
          DevGrill
        </span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ThemeToggle />
        {right}
      </div>
    </nav>
  );
}
