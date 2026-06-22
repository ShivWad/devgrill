'use client'

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { UserButton } from "@clerk/nextjs";
import { TechNav } from "./Nav";
import { TECH_PHASES, TECH_PHASE_LABEL, TECH_GLOBAL_STYLES, type TechMsg } from "./types";
import type { TechPhase } from "@devgrill/shared";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const CODE_LANGUAGES = ["javascript", "typescript", "python", "java", "go", "rust", "cpp", "csharp", "sql"] as const;
type CodeLang = (typeof CODE_LANGUAGES)[number];

export interface TechChatProps {
  msgs: TechMsg[];
  phase: TechPhase;
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
  onSend: (combined?: string) => void;
  onAutoAnswer: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onToggleQuestion: () => void;
}

export function TechChatView(p: TechChatProps) {
  const phaseIdx = TECH_PHASES.indexOf(p.phase);
  const isDisabled = p.sending || p.autoLoading;

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeLang, setCodeLang] = useState<CodeLang>("javascript");

  function buildCombined(): string {
    const text = p.input.trim();
    const trimmedCode = code.trim();
    if (!trimmedCode) return text;
    return `${text}\n\n\`\`\`${codeLang}\n${trimmedCode}\n\`\`\``;
  }

  function handleSend() {
    const combined = buildCombined();
    if (!combined || isDisabled) return;
    p.onSend(combined);
    setCode("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function renderMessageContent(content: string) {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
      }
      parts.push(
        <pre key={key++} style={{
          background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "12px 14px",
          margin: "8px 0", fontSize: 12.5, lineHeight: 1.6, overflowX: "auto",
          fontFamily: "'Geist Mono', monospace", whiteSpace: "pre",
        }}>
          <code>{match[2]}</code>
        </pre>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? content : parts;
  }

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style>{TECH_GLOBAL_STYLES}</style>

      <TechNav
        right={
          <div className="chat-nav-right" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {p.questionText && (
              <button
                className="question-nav-btn"
                onClick={p.onToggleQuestion}
                style={{
                  fontFamily: "'Geist Mono', monospace", fontSize: 11,
                  padding: "4px 10px", borderRadius: 6,
                  background: p.questionOpen ? "var(--accent-soft)" : "var(--bg-input)",
                  border: `1px solid ${p.questionOpen ? "var(--accent-line)" : "var(--border-strong)"}`,
                  color: p.questionOpen ? "var(--accent)" : "var(--fg-muted)",
                  cursor: "pointer", marginRight: 6, transition: "all 0.15s",
                }}
              >
                Topic ↗
              </button>
            )}
            {TECH_PHASES.map((ph, i) => (
              <div
                key={ph}
                className={`phase-pip${i !== phaseIdx ? " phase-pip--hidden-mobile" : ""}`}
                style={{
                  fontFamily: "'Geist Mono', monospace", fontSize: 11,
                  padding: "4px 10px", borderRadius: 6,
                  background: i === phaseIdx ? "var(--accent-soft)" : "transparent",
                  border: `1px solid ${i === phaseIdx ? "var(--accent-line)" : "transparent"}`,
                  color: i === phaseIdx ? "var(--accent)" : i < phaseIdx ? "var(--fg-faint)" : "var(--fg-dim)",
                  fontWeight: i === phaseIdx ? 600 : 400, transition: "all 0.2s",
                }}
              >
                {i < phaseIdx ? "✓ " : ""}
                {TECH_PHASE_LABEL[ph]}
              </div>
            ))}
            <div style={{ marginLeft: 4 }}><UserButton /></div>
          </div>
        }
      />

      {/* Message list */}
      <div ref={p.scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <div className="chat-messages-inner" style={{ maxWidth: 740, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {p.msgs.map((m, i) => {
            const you = m.role === "candidate";
            const isQuestion = i === 0 && m.role === "interviewer";
            return (
              <div key={i} style={{
                display: "flex", flexDirection: "column",
                alignItems: you ? "flex-end" : "flex-start",
                gap: 4, animation: "fadeUp .3s ease both", maxWidth: "100%",
              }}>
                <span style={{
                  fontFamily: "'Geist Mono', monospace", fontSize: 10,
                  letterSpacing: ".12em", textTransform: "uppercase",
                  color: you ? "var(--accent)" : isQuestion ? "var(--accent)" : "var(--fg-faint)",
                  padding: "0 4px",
                }}>
                  {you ? "You" : isQuestion ? "Topic" : "Mr. Grill"}
                </span>
                <div style={{
                  maxWidth: isQuestion ? "100%" : "min(680px, 88%)",
                  width: isQuestion ? "100%" : undefined,
                  padding: isQuestion ? "18px 22px" : "13px 17px",
                  fontSize: 14.5, lineHeight: 1.7,
                  borderRadius: you ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
                  background: isQuestion ? "var(--accent-soft)" : you ? "var(--accent)" : "var(--bg-card)",
                  color: you ? "var(--accent-ink)" : "var(--fg-2)",
                  border: isQuestion ? "1px solid var(--accent-line)" : you ? "none" : "1px solid var(--border)",
                  fontWeight: you ? 500 : 400, whiteSpace: "pre-wrap",
                }}>
                  {renderMessageContent(m.content)}
                </div>
              </div>
            );
          })}

          {p.sending && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, animation: "fadeUp .3s ease both" }}>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--fg-faint)", padding: "0 4px" }}>
                Mr. Grill
              </span>
              <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "14px 18px", borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fg-dim)", display: "inline-block", animation: `dotPulse 1.1s infinite ${delay}s` }} />
                ))}
              </div>
            </div>
          )}

          {p.isComplete && (
            <div style={{ padding: "12px 4px", animation: "fadeUp .4s ease both" }}>
              <p style={{ fontSize: 13, color: "var(--fg-dim)", textAlign: "center" }}>Interview complete — loading your report…</p>
            </div>
          )}

          <div style={{ height: 1 }} />
        </div>
      </div>

      {p.error && (
        <div style={{ maxWidth: 740, margin: "0 auto", width: "100%", padding: "0 24px 8px" }}>
          <div style={{ padding: "9px 14px", borderRadius: 9, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13 }}>
            {p.error}
          </div>
        </div>
      )}

      {/* Input area */}
      {!p.isComplete && (
        <div className="chat-input-bar" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          {/* Monaco code panel */}
          {codeOpen && (
            <div className="tech-editor-panel" style={{ borderBottom: "1px solid var(--border)", padding: "10px 24px 10px" }}>
              <div style={{ maxWidth: 740, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", letterSpacing: ".1em" }}>Code</span>
                    <select
                      value={codeLang}
                      onChange={(e) => setCodeLang(e.target.value as CodeLang)}
                      style={{
                        background: "var(--bg-input)", border: "1px solid var(--border-strong)",
                        borderRadius: 6, padding: "2px 6px", fontSize: 11,
                        color: "var(--fg-muted)", fontFamily: "'Geist Mono', monospace", cursor: "pointer",
                      }}
                    >
                      {CODE_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => { setCodeOpen(false); setCode(""); }}
                    style={{ background: "none", border: "none", color: "var(--fg-dim)", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)", height: 200 }}>
                  <MonacoEditor
                    height="200px"
                    language={codeLang}
                    theme="vs-dark"
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "off",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      padding: { top: 8, bottom: 8 },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: "14px 24px" }}>
            <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  ref={p.inputRef}
                  rows={1}
                  style={{
                    width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-strong)",
                    borderRadius: 11, padding: "11px 14px", fontSize: 14.5, color: "var(--fg-2)",
                    fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.55,
                    maxHeight: 160, overflowY: "auto",
                  }}
                  placeholder="Your answer… (Enter to send, Shift+Enter for newline)"
                  value={p.input}
                  onChange={(e) => {
                    p.onInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isDisabled}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setCodeOpen(o => !o)}
                    style={{
                      background: codeOpen ? "var(--accent-soft)" : "var(--bg-input)",
                      border: `1px solid ${codeOpen ? "var(--accent-line)" : "var(--border-strong)"}`,
                      color: codeOpen ? "var(--accent)" : "var(--fg-dim)",
                      borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer",
                      fontFamily: "'Geist Mono', monospace", transition: "all 0.15s",
                    }}
                  >
                    {codeOpen ? "— Code" : "+ Code"}
                  </button>
                  <button
                    onClick={p.onAutoAnswer}
                    disabled={isDisabled}
                    style={{
                      background: "var(--bg-input)", border: "1px solid var(--border-strong)",
                      color: isDisabled ? "var(--fg-faint)" : "var(--fg-dim)",
                      borderRadius: 7, padding: "5px 10px", fontSize: 12,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    {p.autoLoading ? "…" : "Auto"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={isDisabled || (!p.input.trim() && !code.trim())}
                style={{
                  background: (isDisabled || (!p.input.trim() && !code.trim())) ? "var(--bg-elevated)" : "var(--accent)",
                  color: (isDisabled || (!p.input.trim() && !code.trim())) ? "var(--fg-faint)" : "var(--accent-ink)",
                  border: "none", borderRadius: 11, padding: "11px 18px",
                  fontSize: 14, fontWeight: 600,
                  cursor: (isDisabled || (!p.input.trim() && !code.trim())) ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", transition: "background 0.15s, color 0.15s", alignSelf: "flex-start",
                }}
              >
                {p.sending ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
