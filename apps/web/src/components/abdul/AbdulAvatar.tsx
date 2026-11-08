'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import cfg from './abdul-states.json';

export type AbdulState = 'idle' | 'thinking' | 'happy' | 'confused' | 'sorry' | 'sad';
export type AbdulCrop = 'head' | 'full';

const stateMeta = cfg.states as Record<
  string,
  { holdMs: number; returnTo: string | null; priority: number; delayShowMs?: number }
>;

/** Resolve state to its image base name (sorry → confused until a dedicated image exists). */
function fileFor(state: AbdulState): string {
  const alias = (cfg.alias as Record<string, string>)[state];
  const key = alias ?? state;
  return (cfg.files as Record<string, string>)[key];
}

export function abdulSrc(state: AbdulState, crop: AbdulCrop) {
  const base = `${cfg.basePath}/${fileFor(state)}-${crop}`;
  return { src: `${base}.webp`, srcSet: `${base}.webp 1x, ${base}@2x.webp 2x` };
}

/** Preload a state's images so swaps never flash. */
export function preloadAbdul(states: AbdulState[], crop: AbdulCrop) {
  states.forEach((s) => {
    const img = new Image();
    img.src = abdulSrc(s, crop).src;
  });
}

/**
 * Cross-fading avatar image. Width/height are fixed to prevent layout shift.
 * Respects prefers-reduced-motion via CSS (.abdul-in / .abdul-out animations
 * are disabled in that case — the CSS handles it).
 */
export function AbdulAvatar({
  state,
  crop = 'head',
  size = 64,
  className = '',
}: {
  state: AbdulState;
  crop?: AbdulCrop;
  size?: number;
  className?: string;
}) {
  const [shown, setShown] = useState<AbdulState>(state);
  const [prev, setPrev] = useState<AbdulState | null>(null);
  const dims = cfg.crops[crop] as { width: number; height: number };
  const h = size;
  const w = Math.round((dims.width / dims.height) * h);

  useEffect(() => {
    if (state === shown) return;
    setPrev(shown);
    setShown(state);
    const t = setTimeout(() => setPrev(null), 170);
    return () => clearTimeout(t);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = `Abdul Bari, ${state}`;
  return (
    <span className={`abdul-avatar${className ? ` ${className}` : ''}`} style={{ width: w, height: h }}>
      {prev && (
        <img
          className="abdul-img abdul-out"
          alt=""
          aria-hidden="true"
          width={w}
          height={h}
          {...abdulSrc(prev, crop)}
        />
      )}
      <img
        className="abdul-img abdul-in"
        key={shown}
        alt={label}
        width={w}
        height={h}
        decoding="async"
        {...abdulSrc(shown, crop)}
      />
    </span>
  );
}

/**
 * State machine hook.
 * Priority: sorry(4) > confused(3) > thinking(2) > happy/sad(1) > idle(0)
 * Higher priority wins, so a late "happy" can never hide an error.
 */
export function useAbdulState() {
  const [state, setState] = useState<AbdulState>('idle');
  const current = useRef<AbdulState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const apply = useCallback((s: AbdulState) => {
    current.current = s;
    setState(s);
  }, []);

  const set = useCallback(
    (next: AbdulState) => {
      clearTimeout(timer.current);
      clearTimeout(delay.current);
      const meta = stateMeta[next];
      const run = () => {
        apply(next);
        if (meta.holdMs && meta.returnTo) {
          timer.current = setTimeout(() => apply(meta.returnTo as AbdulState), meta.holdMs);
        }
      };
      // Delay thinking so fast answers never show it
      if (meta.delayShowMs) {
        delay.current = setTimeout(run, meta.delayShowMs);
      } else {
        run();
      }
    },
    [apply]
  );

  /** Call when the user sends a new message: clears confused/sorry and goes to thinking. */
  const onUserSend = useCallback(() => set('thinking'), [set]);

  /** Map an engine response layer to a state. */
  const onResponse = useCallback(
    (layer: 1 | 2 | 3 | 4 | 'error') => {
      if (layer === 'error') return set('sorry');
      if (layer === 4) return set('confused');
      set('idle');
    },
    [set]
  );

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(delay.current);
    },
    []
  );

  return { state, set, onUserSend, onResponse };
}

