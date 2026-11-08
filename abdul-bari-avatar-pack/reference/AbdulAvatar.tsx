import { useEffect, useRef, useState, useCallback } from 'react';
import cfg from '../abdul-states.json';

export type AbdulState = 'idle' | 'thinking' | 'happy' | 'confused' | 'sorry' | 'sad';
export type AbdulCrop = 'head' | 'full';

const stateMeta = cfg.states as Record<string, { holdMs: number; returnTo: string | null; priority: number; delayShowMs?: number }>;

/** Resolve a state to its image base name (sorry -> confused until a dedicated image exists). */
function fileFor(state: AbdulState): string {
  const alias = (cfg.alias as Record<string, string>)[state];
  const key = alias ?? state;
  return (cfg.files as Record<string, string>)[key];
}

export function abdulSrc(state: AbdulState, crop: AbdulCrop) {
  const base = `${cfg.basePath}/${fileFor(state)}-${crop}`;
  return { src: `${base}.webp`, srcSet: `${base}.webp 1x, ${base}@2x.webp 2x` };
}

/** Preload a state's image so swaps never flash. */
export function preloadAbdul(states: AbdulState[], crop: AbdulCrop) {
  states.forEach((s) => { const i = new Image(); i.src = abdulSrc(s, crop).src; });
}

/** Cross-fading avatar. Width/height are fixed to prevent layout shift. */
export function AbdulAvatar({ state, crop = 'head', size = 64 }: { state: AbdulState; crop?: AbdulCrop; size?: number }) {
  const [shown, setShown] = useState<AbdulState>(state);
  const [prev, setPrev] = useState<AbdulState | null>(null);
  const dims = cfg.crops[crop];
  const h = crop === 'head' ? size : size;                       // size = rendered height in px
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
    <span className="abdul-avatar" style={{ width: w, height: h }}>
      {prev && <img className="abdul-img abdul-out" alt="" aria-hidden="true" width={w} height={h} {...abdulSrc(prev, crop)} />}
      <img className="abdul-img abdul-in" key={shown} alt={label} width={w} height={h} decoding="async" {...abdulSrc(shown, crop)} />
    </span>
  );
}

/**
 * State machine. Higher priority wins, so a "thinking" request can't be
 * overwritten by a late "happy", and errors are never hidden.
 */
export function useAbdulState() {
  const [state, setState] = useState<AbdulState>('idle');
  const current = useRef<AbdulState>('idle');
  const timer = useRef<number | undefined>(undefined);
  const delay = useRef<number | undefined>(undefined);

  const apply = useCallback((s: AbdulState) => { current.current = s; setState(s); }, []);

  const set = useCallback((next: AbdulState) => {
    window.clearTimeout(timer.current);
    window.clearTimeout(delay.current);
    const meta = stateMeta[next];
    const run = () => {
      apply(next);
      if (meta.holdMs && meta.returnTo) timer.current = window.setTimeout(() => apply(meta.returnTo as AbdulState), meta.holdMs);
    };
    // Skip the thinking swap entirely when the answer comes back fast.
    if (meta.delayShowMs) delay.current = window.setTimeout(run, meta.delayShowMs); else run();
  }, [apply]);

  /** Call when the user sends a new message: clears confused/sorry and goes to thinking. */
  const onUserSend = useCallback(() => set('thinking'), [set]);
  /** Map an engine response to a state. layer: 1 | 2 | 3 | 4, or 'error'. */
  const onResponse = useCallback((layer: 1 | 2 | 3 | 4 | 'error') => {
    if (layer === 'error') return set('sorry');
    if (layer === 4) return set('confused');
    set('idle');
  }, [set]);

  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(delay.current); }, []);
  return { state, set, onUserSend, onResponse };
}
