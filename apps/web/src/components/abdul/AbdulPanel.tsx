'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AbdulAvatar, useAbdulState, preloadAbdul, AbdulState } from './AbdulAvatar';
import { usePersona } from './usePersona';
import { useEditMode } from '../../context/EditModeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RetrievalSource {
  title: string;
  type: string;
  detail: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  layer?: 1 | 2 | 3 | 4;
  sourceType?: string;
  sources?: RetrievalSource[];
  timestamp: string;
  feedbackSent?: 'up' | 'down';
  personaLine?: string;
}

// ── Source chips (replaces layer badges) ─────────────────────────────────────

const SOURCE_CHIP: Record<number, { label: string; cls: string }> = {
  1: { label: 'Verified rule',             cls: 'source-chip-1' },
  2: { label: 'Department records',        cls: 'source-chip-2' },
  3: { label: 'AI-assisted, please verify', cls: 'source-chip-3' },
  4: { label: 'Not found',                 cls: 'source-chip-4' },
};

const DEFAULT_SUGGESTIONS = [
  'What is the minimum CGPA to graduate from NED?',
  'When does the Final Year Project start?',
  'What happens if I fail a prerequisite course?',
  'What is the standard credit hour limit per semester?',
  'How do I reach out to a professor for supervision?',
  'What is the passing grade scale at NED?',
];

// ── Happy animation: at most once per minute ──────────────────────────────────
let lastHappyAt = 0;
function canShowHappy() {
  const now = Date.now();
  if (now - lastHappyAt > 60_000) { lastHappyAt = now; return true; }
  return false;
}

// ── Feedback API (Rule #9 — no PII) ─────────────────────────────────────────
async function sendFeedback(messageId: string, rating: 'up' | 'down', note?: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    await fetch(`${apiUrl}/api/v1/chat/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, rating, note }),
    });
  } catch { /* silently ignore — feedback is best-effort */ }
}

// ── StatusLine ────────────────────────────────────────────────────────────────
function StatusLine({ line }: { line: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="abdul-status-line">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="abdul-status-text">{line}</span>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface AbdulPanelProps {
  fullPage?: boolean;
  onClose?: () => void;
  initialPrompt?: string | null;
  externalSendTrigger?: { prompt: string; nonce: number } | null;
}

export function AbdulPanel({ fullPage, onClose, initialPrompt, externalSendTrigger }: AbdulPanelProps) {
  const { isEditMode, viewAsStudent, can } = useEditMode();
  const canEdit = isEditMode && !viewAsStudent && can('chat', 'edit');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isUnansweredOpen, setIsUnansweredOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState<{ id: string; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const abdul = useAbdulState();
  const persona = usePersona();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Preload other states once panel opens
  useEffect(() => {
    preloadAbdul(['thinking', 'happy', 'confused', 'sad'], 'head');
    preloadAbdul(['thinking', 'happy', 'confused', 'sad'], 'full');
    composerRef.current?.focus();
  }, []);

  // Handle externalSendTrigger (from chips in LoginIntro or elsewhere)
  useEffect(() => {
    if (externalSendTrigger?.prompt) {
      handleSend(externalSendTrigger.prompt);
    }
  }, [externalSendTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle initialPrompt
  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes (floating panel only)
  useEffect(() => {
    if (fullPage) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [fullPage, onClose]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;
    if (query.length > 300) return;

    setInput('');
    setMenuOpen(false);

    const lang = persona.detectLanguage(query);
    const intent = persona.detectIntent(query);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Persona intent — answer without hitting the API
    if (intent) {
      const personaReply = persona.getPersonaReply(intent, lang);
      if (personaReply) {
        const isSad = intent === 'S-RUDE';
        const nextState: AbdulState = intent === 'DISTRESS' ? 'confused'
          : intent === 'S-PRAISE' ? 'happy'
          : isSad ? 'sad'
          : 'idle';
        abdul.set(nextState);
        const asstMsg: Message = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: personaReply,
          layer: 1,
          sourceType: 'persona',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, asstMsg]);
        return;
      }
    }

    // Normal engine call
    abdul.onUserSend();
    const thinkingLine = persona.getThinkingLine(null, lang);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, preferOffline: offlineMode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Engine error');

      const layer = data.data.layer as 1 | 2 | 3 | 4;
      if (layer === 4) {
        abdul.set('confused');
      } else if (canShowHappy()) {
        abdul.set('happy');
      } else {
        abdul.set('idle');
      }

      const stateLang = persona.detectLanguage(query);
      const oneLiner = layer !== 4
        ? persona.getStateOneLiner('happy', null, stateLang)
        : persona.getStateOneLiner('confused', null, stateLang);

      const asstMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.data.answer,
        layer,
        sourceType: data.data.source,
        sources: data.data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        personaLine: layer !== 4 ? oneLiner : undefined,
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch {
      abdul.set('sorry');
      const errLine = persona.getStateOneLiner('sorry', 'error', lang);
      const asstMsg: Message = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: errLine || 'Something went wrong. Please try again.',
        layer: 4,
        sourceType: 'error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, offlineMode, abdul, persona]);

  // ── Render ────────────────────────────────────────────────────────────────

  const panelClass = fullPage ? 'abdul-panel-fullpage' : 'abdul-panel';

  const isEmpty = messages.length === 0;

  return (
    <div
      ref={panelRef}
      className={panelClass}
      role="dialog"
      aria-label="Chat with Abdul Bari"
      aria-modal="true"
    >
      {/* ── Header ── */}
      <div className="abdul-panel-header">
        <div className="abdul-panel-header-avatar" aria-hidden="true">
          <AbdulAvatar state={abdul.state} crop="full" size={116} />
        </div>
        <div className="abdul-panel-header-info">
          <div className="abdul-panel-header-name">Abdul Bari</div>
          <div className="abdul-panel-header-sub">Resident senior, NEDUET &nbsp;·&nbsp; Semester 7 · forever</div>
          <span className="abdul-unofficial-chip">Unofficial student guide</span>
        </div>
        <div className="abdul-panel-header-actions">
          {/* ⋯ menu */}
          <div className="relative">
            <button
              className="abdul-icon-btn"
              aria-label="Panel menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((x) => !x)}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="abdul-dropdown">
                <label className="abdul-dropdown-item">
                  <input
                    type="checkbox"
                    checked={offlineMode}
                    onChange={(e) => setOfflineMode(e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Offline mode
                </label>
                {canEdit && (
                  <button className="abdul-dropdown-item" onClick={() => { setIsUnansweredOpen(true); setMenuOpen(false); }}>
                    Unanswered questions
                  </button>
                )}
                <button className="abdul-dropdown-item text-muted" onClick={() => { onClose?.(); }}>
                  Hide Abdul until reload
                </button>
              </div>
            )}
          </div>
          {!fullPage && (
            <button className="abdul-icon-btn" aria-label="Close chat" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {/* Disclaimer (Rule #13) */}
      <div className="abdul-disclaimer">
        <span>Guidance estimates, not official university decisions.</span>
        <Link href="/terms" className="abdul-terms-link">Terms</Link>
      </div>

      {/* ── Message list ── */}
      <div className="abdul-messages" aria-live="polite" aria-atomic="false">
        {isEmpty ? (
          /* Empty state */
          <div className="abdul-empty-state">
            <div className="abdul-empty-avatar">
              <AbdulAvatar state="idle" crop="full" size={120} />
            </div>
            <p className="abdul-empty-text">
              Ask me about courses, prerequisites, FYPs, supervisors or careers.
            </p>
            <div className="abdul-chips">
              {DEFAULT_SUGGESTIONS.map((q) => (
                <button key={q} className="abdul-chip" onClick={() => handleSend(q)} disabled={loading}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isFirst = idx === 0 || messages[idx - 1].sender !== msg.sender;
            return (
              <div key={msg.id} className={`abdul-row ${msg.sender === 'user' ? 'abdul-row-user' : 'abdul-row-assistant'}`}>
                {/* Abdul's avatar — first bubble of a group only */}
                {msg.sender === 'assistant' && isFirst && (
                  <div className="abdul-chat-avatar">
                    <AbdulAvatar state="idle" crop="head" size={36} />
                  </div>
                )}
                {msg.sender === 'assistant' && !isFirst && (
                  <div style={{ width: 36 }} aria-hidden="true" />
                )}

                <div className="abdul-bubble-wrap">
                  {/* Persona one-liner before the fact block */}
                  {msg.sender === 'assistant' && msg.personaLine && (
                    <div className="abdul-persona-line">{msg.personaLine}</div>
                  )}

                  <div className={`abdul-bubble ${msg.sender === 'user' ? 'abdul-bubble-user' : 'abdul-bubble-assistant'}`}>
                    {/* Source chip */}
                    {msg.sender === 'assistant' && msg.layer && SOURCE_CHIP[msg.layer] && (
                      <div className={`source-chip ${SOURCE_CHIP[msg.layer].cls}`}>
                        {SOURCE_CHIP[msg.layer].label}
                        <span className="source-chip-time">{msg.timestamp}</span>
                      </div>
                    )}

                    {/* Message body */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="chat-sources">
                        <span className="chat-source-label">Referenced records:</span>
                        {msg.sources.map((src, i) => (
                          <div key={i} className="chat-source-item">
                            <span className="chat-source-num">#{i + 1}</span>
                            <div>
                              <div className="chat-source-title">{src.title}</div>
                              <div className="chat-source-detail">{src.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User timestamp */}
                    {msg.sender === 'user' && (
                      <div className="chat-time" style={{ textAlign: 'right', marginTop: 4 }}>{msg.timestamp}</div>
                    )}

                    {/* 👍 👎 feedback (assistant messages only) */}
                    {msg.sender === 'assistant' && msg.layer && msg.layer <= 3 && !msg.feedbackSent && (
                      <div className="abdul-feedback-row">
                        <button
                          className="abdul-feedback-btn"
                          aria-label="Helpful"
                          onClick={() => {
                            sendFeedback(msg.id, 'up');
                            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, feedbackSent: 'up' } : m));
                            abdul.set('happy');
                          }}
                        >
                          👍
                        </button>
                        <button
                          className="abdul-feedback-btn"
                          aria-label="Not helpful"
                          onClick={() => {
                            setFeedbackNote({ id: msg.id, text: '' });
                            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, feedbackSent: 'down' } : m));
                            abdul.set('sad');
                          }}
                        >
                          👎
                        </button>
                      </div>
                    )}
                    {msg.feedbackSent === 'up' && <span className="abdul-feedback-sent">Thanks! 👍</span>}
                    {msg.feedbackSent === 'down' && <span className="abdul-feedback-sent">Noted. 👎</span>}

                    {/* Admin: edit verified answer */}
                    {msg.sender === 'assistant' && (msg.layer === 1 || msg.layer === 2) && canEdit && (
                      <div className="chat-edit-row">
                        <button className="chat-edit-btn">✎ Edit Verified Answer</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Thinking indicator */}
        {loading && (
          <div className="abdul-row abdul-row-assistant">
            <div className="abdul-chat-avatar">
              <AbdulAvatar state="thinking" crop="head" size={36} />
            </div>
            <div className="abdul-bubble-wrap">
              <div className="abdul-bubble abdul-bubble-assistant">
                <StatusLine line={persona.getThinkingLine(null, 'en')} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 👎 note box ── */}
      {feedbackNote && (
        <div className="abdul-feedback-note-box">
          <input
            type="text"
            placeholder="What were you looking for? (optional)"
            value={feedbackNote.text}
            onChange={(e) => setFeedbackNote({ ...feedbackNote, text: e.target.value })}
            className="abdul-feedback-note-input"
            maxLength={200}
          />
          <button
            className="button button-primary"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => {
              sendFeedback(feedbackNote.id, 'down', feedbackNote.text || undefined);
              setFeedbackNote(null);
            }}
          >
            Send
          </button>
          <button className="abdul-icon-btn" onClick={() => setFeedbackNote(null)}>✕</button>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="abdul-composer-wrap">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="abdul-composer">
          <textarea
            ref={composerRef}
            value={input}
            maxLength={300}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask about courses, prerequisites, FYPs… (max 300 chars)"
            className="abdul-composer-input"
            disabled={loading}
            aria-label="Message Abdul Bari"
          />
          <button
            type="submit"
            className="button button-primary"
            disabled={loading || input.trim().length === 0}
            aria-label="Send message"
          >
            {loading ? '…' : '→'}
          </button>
        </form>
        <div className="abdul-composer-meta">
          <span className="abdul-rule3">Never enter personal info (roll number, phone, name)</span>
          <span className={`char-counter${input.length >= 280 ? ' char-warning' : ''}`}>
            {input.length}/300
          </span>
        </div>
      </div>

      {/* ── Footer disclaimer (EN + RU) ── */}
      <div className="abdul-panel-footer">
        <span>I can be wrong. Check the CISE notice board for anything important.</span>
        <span className="abdul-footer-ru"> · Main ghalat bhi ho sakta hoon.</span>
      </div>

      {/* Unanswered Questions Drawer (admin only) */}
      {isUnansweredOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div className="bg-black/50 absolute inset-0" onClick={() => setIsUnansweredOpen(false)} />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-t-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold mb-3">Unanswered Questions (👎 feedback)</h3>
            <p className="text-xs text-muted">Connect the feedback API to populate this list.</p>
            <button className="mt-4 button button-secondary text-xs" onClick={() => setIsUnansweredOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

