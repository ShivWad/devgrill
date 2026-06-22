'use client'

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { TechNav } from "./Nav";
import { TECH_RUBRIC_KEYS, TECH_PHASE_FULL, scoreColor } from "./types";
import type { TechRubricScores, TechPhaseFeedback, TechPhase } from "@devgrill/shared";

export interface TechReportProps {
  scores: TechRubricScores;
  phaseFeedback: TechPhaseFeedback[];
  questionTitle: string;
  targetRole: string;
  targetCompany: string;
}

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "22px 24px",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace",
  fontSize: 11,
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
  color: "var(--fg-faint)",
  marginBottom: 14,
  display: "block",
};

function TechPhaseFeedbackCard({ fb }: { fb: TechPhaseFeedback }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>
          {TECH_PHASE_FULL[fb.phase as TechPhase]}
        </span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: scoreColor(fb.score) }}>
          {fb.score}/5
        </span>
      </div>
      {fb.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ ...sectionLabel, marginBottom: 8 }}>Strengths</span>
          {fb.strengths.map((s, i) => (
            <p key={i} style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid var(--border-strong)" }}>
              {s}
            </p>
          ))}
        </div>
      )}
      {fb.gaps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ ...sectionLabel, marginBottom: 8 }}>Gaps</span>
          {fb.gaps.map((g, i) => (
            <p key={i} style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid var(--border-strong)" }}>
              {g}
            </p>
          ))}
        </div>
      )}
      {fb.specificQuotes.length > 0 && (
        <div>
          <span style={{ ...sectionLabel, marginBottom: 8 }}>Evidence</span>
          {fb.specificQuotes.map((q, i) => (
            <p key={i} style={{ fontSize: 12, color: "var(--fg-dim)", fontStyle: "italic", lineHeight: 1.6, marginBottom: 6 }}>
              &ldquo;{q}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function TechReportView({ scores, phaseFeedback, questionTitle, targetRole, targetCompany }: TechReportProps) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <TechNav right={<UserButton />} />
      <div style={{ flex: 1, maxWidth: 780, margin: "0 auto", padding: "48px 24px 80px", width: "100%" }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent-line)" }} />
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)" }}>
              Technical Interview Complete
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 6 }}>
            {questionTitle}
          </h1>
          {(targetRole || targetCompany) && (
            <p style={{ fontSize: 14, color: "var(--fg-dim)" }}>
              {[targetRole, targetCompany].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14, marginBottom: 32 }}>
          <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", color: scoreColor(scores.overall, 100), lineHeight: 1 }}>
              {scores.overall}
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "var(--fg-faint)" }}>/ 100</span>
          </div>
          <div style={card}>
            <div style={{ marginBottom: 16 }}>
              <span style={sectionLabel}>Level Assessment</span>
              <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>{scores.levelAssessment}</p>
            </div>
            <div>
              <span style={sectionLabel}>Role Readiness</span>
              <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>{scores.roleReadiness}</p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <span style={sectionLabel}>Rubric Breakdown</span>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
            {TECH_RUBRIC_KEYS.map(({ key, label }) => {
              const score = scores[key] as number;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 13.5, color: "var(--fg-muted)" }}>{label}</span>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: scoreColor(score) }}>
                      {score}/5
                    </span>
                  </div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${(score / 5) * 100}%`, background: scoreColor(score), borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {phaseFeedback.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <span style={sectionLabel}>Phase Feedback</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {phaseFeedback.map((fb) => (
                <TechPhaseFeedbackCard key={fb.phase} fb={fb} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 40 }}>
          <div>
            <span style={sectionLabel}>Gap Analysis</span>
            <div style={card}>
              <p style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.75, margin: 0 }}>{scores.gapAnalysis}</p>
            </div>
          </div>
          <div>
            <span style={sectionLabel}>Resume Advice</span>
            <div style={card}>
              <p style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.75, margin: 0 }}>{scores.resumeAdvice}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link
            href="/technical"
            style={{
              background: "var(--accent)", color: "var(--accent-ink)",
              fontSize: 14, fontWeight: 600, padding: "12px 28px",
              borderRadius: 10, textDecoration: "none",
            }}
          >
            Start another technical interview →
          </Link>
        </div>
      </div>
    </div>
  );
}
