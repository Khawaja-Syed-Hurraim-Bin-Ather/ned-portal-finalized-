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
 * The launcher always shows idle-head. The panel follows the live state.
 */
export function AbdulWidget() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [externalSend, setExternalSend] = useState<{ prompt: string; nonce: number } | null>(null);
  const nonce = useRef(0);

  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // Fetch auth session for login intro
  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionId(data.session.access_token.slice(-16)); // last 16 chars — not PII, just a session key
        setDisplayName(data.session.user?.user_metadata?.full_name ?? null);
      }
    });
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      setSessionId(session ? session.access_token.slice(-16) : null);
      setDisplayName(session?.user?.user_metadata?.full_name ?? null);
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
      {/* Login intro bubble */}
      {!isAdmin && (
        <LoginIntro
          sessionId={sessionId}
          displayName={displayName}
          landedOnAdmin={isAdmin}
          onOpen={handleOpen}
          onAsk={handleAsk}
        />
      )}

      {/* Floating panel */}
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

