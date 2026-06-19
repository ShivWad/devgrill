'use client'

import { UserButton } from "@clerk/nextjs";
import { Nav } from "./Nav";
import { GLOBAL_STYLES } from "./types";

export interface SetupProps {
  resumeText: string;
  jdText: string;
  targetRole: string;
  targetCompany: string;
  error: string | null;
  onResumeText: (v: string) => void;
  onJdText: (v: string) => void;
  onTargetRole: (v: string) => void;
  onTargetCompany: (v: string) => void;
  onStart: () => void;
}

const field: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-input)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 14,
  color: "var(--fg-2)",
  fontFamily: "inherit",
  outline: "none",
  resize: "vertical",
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--fg-muted)",
  marginBottom: 8,
  display: "block",
};

/** Setup form where the user pastes resume/JD and kicks off the interview. */
export function SetupView(p: SetupProps) {

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_STYLES}</style>
      <Nav right={<UserButton />} />
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "48px 24px 80px" }}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--fg)", marginBottom: 6 }}>
            Set up your interview
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-muted)", marginBottom: 36, lineHeight: 1.5 }}>
            Your resume and JD are never stored — they&apos;re used only to generate your question.
          </p>

          {/* Resume section */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...label, margin: 0 }}>
                Resume <span style={{ color: "#f97316" }}>*</span>
              </label>
            </div>

            <textarea
              style={{ ...field, minHeight: 160 }}
              placeholder="Paste your resume text here…"
              value={p.resumeText}
              onChange={(e) => p.onResumeText(e.target.value)}
            />
          </div>

          {/* Job description */}
          <div style={{ marginBottom: 22 }}>
            <label style={label}>
              Job Description <span style={{ color: "#f97316" }}>*</span>
            </label>
            <textarea
              style={{ ...field, minHeight: 130 }}
              placeholder="Paste the job description here…"
              value={p.jdText}
              onChange={(e) => p.onJdText(e.target.value)}
            />
          </div>

          {/* Role + Company */}
          <div
            className="setup-role-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}
          >
            <div>
              <label style={label}>
                Target role <span style={{ color: "var(--fg-dim)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                style={{ ...field, resize: "none" } as React.CSSProperties}
                placeholder="e.g. Senior Software Engineer"
                value={p.targetRole}
                onChange={(e) => p.onTargetRole(e.target.value)}
              />
            </div>
            <div>
              <label style={label}>
                Target company <span style={{ color: "var(--fg-dim)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                style={{ ...field, resize: "none" } as React.CSSProperties}
                placeholder="e.g. Stripe"
                value={p.targetCompany}
                onChange={(e) => p.onTargetCompany(e.target.value)}
              />
            </div>
          </div>

          {p.error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 9,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              {p.error}
            </div>
          )}

          <button
            onClick={p.onStart}
            style={{
              width: "100%",
              background: "var(--accent)",
              color: "#0a0a0a",
              fontSize: 15,
              fontWeight: 600,
              padding: "14px",
              borderRadius: 11,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 28px -10px var(--accent-line)",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Start Interview →
          </button>
        </div>
      </div>
    </div>
  );
}
