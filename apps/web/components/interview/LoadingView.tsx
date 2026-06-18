'use client'

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Nav } from "./Nav";
import { LOADING_MSGS, GLOBAL_STYLES } from "./types";

interface LoadingViewProps {
  /** When true, shows a "restoring session" message instead of cycling tips. */
  resuming?: boolean;
}

/** Full-screen loading state shown during question generation or session restore. */
export function LoadingView({ resuming = false }: LoadingViewProps) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (resuming) return;
    let fadeOut: ReturnType<typeof setTimeout>;
    const tick = setInterval(() => {
      setVisible(false);
      fadeOut = setTimeout(() => {
        setIdx((i) => (i + 1) % LOADING_MSGS.length);
        setVisible(true);
      }, 350);
    }, 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(fadeOut);
    };
  }, [resuming]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{GLOBAL_STYLES}</style>
      <Nav right={<UserButton />} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "40px 24px",
        }}
      >
        {/* Breathing orb animation */}
        <div
          style={{
            position: "relative",
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              animation: "breathe 2.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              animation: "breathe 2.4s ease-in-out infinite 0.4s",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 20px 4px var(--accent-line)",
              animation: "breatheCore 2.4s ease-in-out infinite",
            }}
          />
        </div>

        <div style={{ textAlign: "center", maxWidth: 360 }}>
          {resuming ? (
            <>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#e0e0e0", lineHeight: 1.5 }}>
                Calling Mr. Grill back…
              </p>
              <p style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
                Restoring your session.
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#e0e0e0",
                  lineHeight: 1.5,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.35s ease, transform 0.35s ease",
                }}
              >
                {LOADING_MSGS[idx]}
              </p>
              <p style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
                Question generation usually takes 20–40 s.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
