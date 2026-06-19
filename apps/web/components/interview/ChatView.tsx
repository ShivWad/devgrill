'use client'

import { UserButton } from "@clerk/nextjs";
import { Nav } from "./Nav";
import { PHASES, PHASE_LABEL, GLOBAL_STYLES, type Msg } from "./types";
import type { Phase } from "@devgrill/shared";

export interface ChatProps {
  msgs: Msg[];
  phase: Phase;
  sending: boolean;
  autoLoading: boolean;
  input: string;
  error: string | null;
  isComplete: boolean;
  questionText: string | null;
  questionOpen: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInput: (v: string) => void;
  onSend: () => void;
  onAutoAnswer: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onToggleQuestion: () => void;
}

/** The main chat interface shown during an active interview. */
export function ChatView(p: ChatProps) {
  const phaseIdx = PHASES.indexOf(p.phase);
  const isDisabled = p.sending || p.autoLoading;

  return (
    <div style={{ height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_STYLES}</style>

      <Nav
        right={
          <div className="chat-nav-right" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {p.questionText && (
              <button
                className="question-nav-btn"
                onClick={p.onToggleQuestion}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: p.questionOpen ? "var(--accent-soft)" : "#111",
                  border: `1px solid ${p.questionOpen ? "var(--accent-line)" : "#2a2a2a"}`,
                  color: p.questionOpen ? "var(--accent)" : "#777",
                  cursor: "pointer",
                  marginRight: 6,
                  transition: "all 0.15s",
                }}
              >
                Question ↗
              </button>
            )}
            {PHASES.map((ph, i) => (
              <div
                key={ph}
                className={`phase-pip${i !== phaseIdx ? " phase-pip--hidden-mobile" : ""}`}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: i === phaseIdx ? "var(--accent-soft)" : "transparent",
                  border: `1px solid ${i === phaseIdx ? "var(--accent-line)" : "transparent"}`,
                  color: i === phaseIdx ? "var(--accent)" : i < phaseIdx ? "#4a4a4a" : "#555",
                  fontWeight: i === phaseIdx ? 600 : 400,
                  transition: "all 0.2s",
                }}
              >
                {i < phaseIdx ? "✓ " : ""}
                {PHASE_LABEL[ph]}
              </div>
            ))}
            <div style={{ marginLeft: 4 }}>
              <UserButton />
            </div>
          </div>
        }
      />

      {/* Message list */}
      <div ref={p.scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <div
          className="chat-messages-inner"
          style={{ maxWidth: 740, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}
        >
          {p.msgs.map((m, i) => {
            const you = m.role === "candidate";
            // First interviewer message is displayed as "Question" with distinct styling
            const isQuestion = i === 0 && m.role === "interviewer";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: you ? "flex-end" : "flex-start",
                  gap: 4,
                  animation: "fadeUp .3s ease both",
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 10,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: you ? "var(--accent)" : isQuestion ? "var(--accent)" : "#4e4e4e",
                    padding: "0 4px",
                  }}
                >
                  {you ? "You" : isQuestion ? "Question" : "Mr. Grill"}
                </span>
                <div
                  style={{
                    maxWidth: isQuestion ? "100%" : "min(680px, 88%)",
                    width: isQuestion ? "100%" : undefined,
                    padding: isQuestion ? "18px 22px" : "13px 17px",
                    fontSize: 14.5,
                    lineHeight: 1.7,
                    borderRadius: you ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
                    background: isQuestion
                      ? "rgba(var(--accent-rgb, 100,200,150), 0.04)"
                      : you
                        ? "var(--accent)"
                        : "#141414",
                    color: you ? "#0a0a0a" : "#dcdcdc",
                    border: isQuestion
                      ? "1px solid var(--accent-line)"
                      : you
                        ? "none"
                        : "1px solid #222",
                    fontWeight: you ? 500 : 400,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {p.sending && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, animation: "fadeUp .3s ease both" }}>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#4e4e4e", padding: "0 4px" }}>
                Mr. Grill
              </span>
              <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "14px 18px", borderRadius: 16, background: "#141414", border: "1px solid #222" }}>
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#666", display: "inline-block", animation: `dotPulse 1.1s infinite ${delay}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {p.isComplete && (
            <div style={{ padding: "12px 4px", animation: "fadeUp .4s ease both" }}>
              <p style={{ fontSize: 13, color: "#555", textAlign: "center" }}>
                Interview complete — loading your report…
              </p>
            </div>
          )}

          <div style={{ height: 1 }} />
        </div>
      </div>

      {/* Error banner */}
      {p.error && (
        <div style={{ maxWidth: 740, margin: "0 auto", width: "100%", padding: "0 24px 8px" }}>
          <div style={{ padding: "9px 14px", borderRadius: 9, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13 }}>
            {p.error}
          </div>
        </div>
      )}

      {/* Input bar */}
      {!p.isComplete && (
        <div className="chat-input-bar" style={{ borderTop: "1px solid #181818", padding: "14px 24px", background: "#0a0a0a" }}>
          <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={p.inputRef}
              rows={1}
              style={{
                flex: 1,
                background: "#111",
                border: "1px solid #252525",
                borderRadius: 11,
                padding: "11px 14px",
                fontSize: 14.5,
                color: "#e8e8e8",
                fontFamily: "inherit",
                outline: "none",
                resize: "none",
                lineHeight: 1.55,
                maxHeight: 160,
                overflowY: "auto",
              }}
              placeholder="Your answer… (Enter to send, Shift+Enter for newline)"
              value={p.input}
              onChange={(e) => {
                p.onInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={p.onKeyDown}
              disabled={isDisabled}
            />
<button
              onClick={p.onSend}
              disabled={isDisabled || !p.input.trim()}
              style={{
                background: isDisabled || !p.input.trim() ? "#1e1e1e" : "var(--accent)",
                color: isDisabled || !p.input.trim() ? "#444" : "#0a0a0a",
                border: "none",
                borderRadius: 11,
                padding: "11px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: isDisabled || !p.input.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {p.sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
