'use client';

import { useEffect, useState } from 'react';
import introData from './abdul-intro.json';
import { AbdulAvatar, AbdulState } from './AbdulAvatar';

type Props = {
  /** Auth session id — used to dedupe: refresh must not replay the intro. */
  sessionId: string | null;
  displayName?: string | null;
  landedOnAdmin?: boolean;
  onAsk: (prompt: string) => void;
  onOpen: () => void;
};

const firstWord = (s?: string | null) => (s ? s.trim().split(/\s+/)[0] : '');

const fill = (line: string, name: string) =>
  name
    ? line.replace('{, name}', `, ${name}`).replace('{name}', name)
    : line.replace('{, name}', '').replace('{name}', '').replace(/\s{2,}/g, ' ');

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export function LoginIntro({ sessionId, displayName, landedOnAdmin, onAsk, onOpen }: Props) {
  const [mode, setMode] = useState<'none' | 'first' | 'returning'>('none');
  const [pose, setPose] = useState<AbdulState>('happy');
  const [text, setText] = useState({ en: '', ru: '' });

  useEffect(() => {
    if (!sessionId || landedOnAdmin) return;

    try {
      if (sessionStorage.getItem('abdul_intro_for') === sessionId) return;
      sessionStorage.setItem('abdul_intro_for', sessionId);
    } catch {
      /* storage blocked: still show once per mount */
    }

    const name = firstWord(displayName);
    let met = false;
    try {
      met = localStorage.getItem('abdul_met') === '1';
    } catch {
      /* ignore */
    }

    if (!met) {
      setText({
        en: fill(introData.firstEver.en, name),
        ru: fill(introData.firstEver.ru, name),
      });
      setMode('first');
      try {
        localStorage.setItem('abdul_met', '1');
      } catch {
        /* ignore */
      }
    } else {
      const useRu = Math.random() < 0.5;
      const line = fill(pick(useRu ? introData.returning.ru : introData.returning.en), name);
      setText({ en: line, ru: '' });
      setMode('returning');
    }

    const t1 = setTimeout(() => setPose('idle'), 3000); // happy for 3 s, then idle
    const autoDismissMs = !met
      ? introData.rules.autoDismissMs.firstEver
      : introData.rules.autoDismissMs.returning;
    const t2 = setTimeout(() => setMode('none'), autoDismissMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMode('none');
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  if (mode === 'none') return null;

  return (
    <div className="abdul-intro" role="status" aria-live="polite">
      <AbdulAvatar state={pose} crop="head" size={44} />
      <div className="abdul-intro-body">
        <p>{text.en}</p>
        {text.ru && (
          <p lang="ur-Latn" className="abdul-intro-ru">
            {text.ru}
          </p>
        )}
        {mode === 'first' && (
          <div className="abdul-chips">
            {introData.firstEver.chips.map((c) => (
              <button
                key={c.label}
                className="abdul-chip"
                onClick={() => {
                  setMode('none');
                  onAsk(c.prompt);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        <button
          className="abdul-intro-open"
          onClick={() => {
            setMode('none');
            onOpen();
          }}
        >
          Chat with Abdul
        </button>
      </div>
      <button className="abdul-intro-x" aria-label="Dismiss" onClick={() => setMode('none')}>
        ×
      </button>
    </div>
  );
}

