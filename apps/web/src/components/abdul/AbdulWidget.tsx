'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AbdulAvatar } from './AbdulAvatar';
import { AbdulPanel } from './AbdulPanel';
import { LoginIntro } from './LoginIntro';
import { createClient } from '../../lib/supabase/client';

/**
 * AbdulWidget — mounted once in the root layout (lazy, after idle).
 * Contains the launcher button, the floating panel, and the login intro.
 * The launcher always shows the full-body standing character.
 * The panel follows the live state machine.
 *
 * Session lifecycle:
 * - On SIGNED_IN: show intro bubble, capture displayName.
 * - On SIGNED_OUT: clear sessionId so the next sign-in triggers a fresh intro.
 *   We do NOT wipe localStorage `abdul_met` — that only tracks "first ever" UX.
 */
export function AbdulWidget() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [externalSend, setExternalSend] = useState<{ prompt: string; nonce: number } | null>(null);
  const nonce = useRef(0);

  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // Fetch auth session for login intro + react to sign-in / sign-out
  useEffect(() => {
    const sb = createClient();
    // Initial session check
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionId(data.session.access_token.slice(-16));
        setDisplayName(data.session.user?.user_metadata?.full_name ?? null);
      }
    });

    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSessionId(session.access_token.slice(-16));
        setDisplayName(session.user?.user_metadata?.full_name ?? null);
      } else if (event === 'SIGNED_OUT') {
        // Clear session so next sign-in triggers a fresh intro
        setSessionId(null);
        setDisplayName(null);
        setPanelOpen(false);
        // Clear sessionStorage dedupe key so the next login shows the intro
        try { sessionStorage.removeItem('abdul_intro_for'); } catch { /* ignore */ }
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleOpen = useCallback(() => { setPanelOpen(true); }, []);
  const handleClose = useCallback(() => { setPanelOpen(false); }, []);

  const handleAsk = useCallback((prompt: string) => {
    nonce.current += 1;
    setExternalSend({ prompt, nonce: nonce.current });
    setPanelOpen(true);
  }, []);

  return (
    <>
      {/* Login intro bubble — full-body Abdul with greeting */}
      {!isAdmin && (
        <LoginIntro
          sessionId={sessionId}
          displayName={displayName}
          landedOnAdmin={isAdmin}
          onOpen={handleOpen}
          onAsk={handleAsk}
        />
      )}

      {/* Floating chat panel */}
      {panelOpen && (
        <AbdulPanel
          onClose={handleClose}
          externalSendTrigger={externalSend}
        />
      )}

      {/* Launcher — full standing companion character, always idle */}
      <button
        className={`abdul-launcher${isAdmin ? ' abdul-launcher-admin' : ''}`}
        aria-label="Chat with Abdul Bari"
        aria-expanded={panelOpen}
        aria-controls="abdul-panel"
        onClick={() => setPanelOpen((x) => !x)}
      >
        <AbdulAvatar state="idle" crop="full" size={116} />
        <span className="abdul-launcher-pill">Abdul Bari</span>
      </button>
    </>
  );
}
