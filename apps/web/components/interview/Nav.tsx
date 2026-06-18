'use client'

import Link from "next/link";

interface NavProps {
  right?: React.ReactNode;
}

/** Shared top navigation bar used across all interview views. */
export function Nav({ right }: NavProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 28px",
        borderBottom: "1px solid #181818",
      }}
    >
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
      >
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 12px var(--accent-line)",
          }}
        />
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#fafafa",
            letterSpacing: "-0.01em",
          }}
        >
          DevGrill
        </span>
      </Link>
      {right}
    </nav>
  );
}
