# Abdul Bari Avatar Pack

Ready-to-use clay avatar images for the EduCompass assistant, with rules for when to show each one, how to switch them live, and the login intro.

**Read with:** `ABDUL-BARI-MASTER-SPEC.md` (personality and behaviour) and `NED-COLOR-GUIDE.md` (colour tokens). If this README and the master spec disagree about **images or login intro**, this README wins.

---

## 1. What is in the zip

```
abdul-bari-avatar-pack/
├─ README.md                      this file
├─ abdul-states.json              state → image mapping, timings, triggers, placements
├─ abdul-intro.json               login intro rules and line banks (EN + Roman Urdu)
├─ public/abdul/                  20 transparent WebP files (copy to your web app's public folder)
├─ reference/
│  ├─ AbdulAvatar.tsx             React avatar, cross-fade, state hook
│  ├─ LoginIntro.tsx              login intro bubble / first-time card
│  ├─ abdul-vanilla.js            same switcher for the vanilla app.js client
│  └─ abdul.css                   styles using NED tokens
└─ preview/
   └─ contact-sheet-dark-and-yellow.png   cut-outs checked on dark and yellow backgrounds
```

## 2. The images

All five states share **one canvas, one scale and one baseline**, so swapping states never makes him jump. Backgrounds are removed (transparent WebP) and every file comes in `1x` and `@2x`.

| State | Files (`public/abdul/`) | What it shows | Use it for |
|---|---|---|---|
| `idle` | `abdul-idle-head.webp`, `abdul-idle-full.webp` | Calm smile, hands relaxed | Default, waiting, launcher, avatars |
| `thinking` | `abdul-thinking-head.webp`, `abdul-thinking-full.webp` | Finger on chin, chai cup, "…" dots | Answer is loading |
| `happy` | `abdul-happy-head.webp`, `abdul-happy-full.webp` | Big smile, sparkle on glasses, fist pump | Good answer, 👍, login greeting |
| `confused` | `abdul-confused-head.webp`, `abdul-confused-full.webp` | Hands clasped, sweat drop, worried mouth | Nothing found (Layer 4); also used for `sorry` |
| `sad` | `abdul-sad-head.webp`, `abdul-sad-full.webp` | Tear, droopy tie, gentle smile | 👎 feedback |

Each state has: `-head.webp` (192×192) and `-head@2x.webp` (384×384); `-full.webp` (286×480) and `-full@2x.webp` (572×960). Total weight is about 140 KB at 1x.

**`sorry` has no image of its own yet.** It is mapped to the `confused` image through `"alias": {"sorry": "confused"}` in `abdul-states.json`. When a dedicated sorry pose exists, add it under `files` and delete the alias.

## 3. Install

1. Copy `public/abdul/` to the web app's public folder so files are served at `/abdul/abdul-idle-head.webp` and so on. The base path lives in `abdul-states.json` (`basePath`).
2. Copy `abdul-states.json` and `abdul-intro.json` next to the reference components (or adjust the import paths).
3. Import `abdul.css` once, globally.
4. Use `AbdulAvatar` and `useAbdulState` (React), or `abdul-vanilla.js` (vanilla client).

## 4. Where each image goes

| Place | Crop | State | Notes |
|---|---|---|---|
| Floating launcher (bottom-right, 64 px) | head | `idle`, always | Round badge on `--accent-soft` with `--accent` ring. It does not change while the panel is closed. |
| Panel header | full | live | Follows the state machine. Light header, not maroon. |
| First bubble of an Abdul message group | head | `idle` | 36 px round avatar. Not on every message. |
| "Abdul is thinking" row | head | `thinking` | Shown with the status line. |
| Panel empty state | full | `idle` | With suggestion chips. |
| Login intro | head | `happy` then `idle` | Section 6. |
| Elsewhere in the portal (optional) | head | `confused` | Empty search results, 404 page. At most one Abdul image per screen besides the widget. |

Do not use Abdul as decoration anywhere else.

## 5. Changing the image dynamically

### 5.1 State triggers

| Event | New state |
|---|---|
| User sends a message | `thinking` (swap is delayed 250 ms so fast answers never flicker) |
| Answer from Layer 1, 2 or 3 | `idle` (optionally `happy` for 3 s, at most once per minute) |
| Layer 4 / not found | `confused` (stays until the next user message) |
| API error, timeout, or daily quota reached | `sorry` (shows the `confused` image; stays until the next user message) |
| 👍 on an answer | `happy` for 3 s, then `idle` |
| 👎 on an answer | `sad` for 3 s, then `idle` |
| Panel opened | `idle` |
| Login intro | `happy` for 3 s, then `idle` |

**Priority** (higher wins, so a late `happy` can never hide an error): `sorry` > `confused` > `thinking` > `happy` / `sad` > `idle`.

### 5.2 Wire it to the engine

The persona layer already returns `persona_state` in the response envelope. The client should use it when present, and fall back to the layer number:

```ts
// after the API responds
const state = res.persona_state ?? (res.layer === 4 ? 'confused' : 'idle');
abdul.set(state);
// on failure
catch { abdul.set('sorry'); }
```

### 5.3 React

```tsx
import { AbdulAvatar, useAbdulState, preloadAbdul } from './reference/AbdulAvatar';

const abdul = useAbdulState();

// send
abdul.onUserSend();
const res = await postChat(message);
abdul.onResponse(res.layer);            // 1 | 2 | 3 | 4

// feedback buttons
onThumbsUp:   () => abdul.set('happy');  // auto-returns to idle after 3 s
onThumbsDown: () => abdul.set('sad');

<AbdulAvatar state={abdul.state} crop="full" size={120} />

// once the panel has opened, warm the other states
useEffect(() => { preloadAbdul(['thinking','happy','confused','sad'], 'head'); }, []);
```

### 5.4 Vanilla client

```html
<span class="abdul-avatar" data-abdul="full" style="width:72px;height:120px"></span>
<script src="/abdul/abdul-vanilla.js"></script>
<script>
  Abdul.onUserSend();          // thinking
  Abdul.onResponse(4);         // confused
  Abdul.setState('happy');     // returns to idle after 3 s
  document.addEventListener('abdul:state', e => console.log(e.detail.state));
</script>
```

### 5.5 Loading rules
- Load `idle-head` immediately. Load the other states when the browser is idle, and the full-body images the first time the panel opens.
- Every `<img>` has explicit `width` and `height` (no layout shift), `decoding="async"`, and a 150 ms cross-fade between states.
- Under `prefers-reduced-motion`, swap instantly with no fade and no bob.

## 6. Login intro (every login)

A small, friendly greeting each time someone signs in. It is a bubble or card above the launcher, **never a full-screen modal**.

| Case | What shows |
|---|---|
| First-ever login on this browser (`localStorage abdul_met` not set) | A card with the full introduction (English plus Roman Urdu), the "unofficial" line, and four quick chips: Courses, Prerequisites, FYP ideas, Careers. Auto-hides after 12 s. |
| Every later login | One short line from the bank, picked at random (English or Roman Urdu), auto-hides after 6 s. |
| Guest (not logged in) | One returning-style line per tab session, no name. |
| Login lands on an `/admin` page | No intro. |
| Page refresh within the same login | No replay (`sessionStorage abdul_intro_for` holds the session id). |

- Pose: `happy` for 3 seconds, then `idle`.
- Name: the first word of the display name, if available. If not, drop the name cleanly (the line banks handle `{, name}`).
- Dismiss: ×, Esc, or opening the panel. Clicking "Chat with Abdul" or a chip opens the panel (and sends the chip's prompt).
- Accessibility: `role="status"`, `aria-live="polite"`, never steals focus.
- The name is read from the signed-in profile for display only. It is **never** sent to the LLM (Rule #3). `abdul_met` is a UI flag, not a personal record.
- Lines and rules live in `abdul-intro.json`. Keep them there so they can be edited without touching code.

Integration, after authentication has resolved:

```tsx
<LoginIntro
  sessionId={session?.id ?? null}
  displayName={profile?.displayName}
  landedOnAdmin={pathname.startsWith('/admin')}
  onOpen={() => panel.open()}
  onAsk={(prompt) => { panel.open(); chat.send(prompt); }}
/>
```

## 7. Instructions for the implementing AI (Claude Opus)

**You must:**
1. Use the exact files in `public/abdul/`. Do not redraw, regenerate, recolour, crop or re-export them.
2. Drive the avatar from the state machine in Section 5. The image must always match the current state.
3. Use `abdul-states.json` and `abdul-intro.json` as the single source for mapping, timing and intro lines. Do not hard-code them in components.
4. Keep the launcher on `idle`, inside the round yellow badge.
5. Give every image `alt="Abdul Bari, <state>"` (decorative duplicates `alt=""`), explicit width and height, and respect reduced motion.
6. Show the login intro as specified in Section 6, once per login.

**You must not:**
- Use the original JPG renders or any image with a studio backdrop.
- Show more than one Abdul image on a screen besides the widget.
- Animate him continuously, add sound, badges, or repeat the speech bubble.
- Let the avatar state claim anything the engine did not do (for example `happy` after an error).
- Send the user's name or any profile data to the LLM.

## 8. Acceptance checklist

- [ ] Every state swaps without jumping or flashing; fast answers never show `thinking`.
- [ ] `sorry` shows the confused image; `confused` and `sorry` clear on the next user message.
- [ ] Launcher is always `idle`; panel header follows the state.
- [ ] No beige fringe or holes around him in light and dark mode (test the header and launcher in both).
- [ ] Login intro: first-ever card, later one-liners, nothing on admin landing, no replay on refresh, Esc dismisses.
- [ ] All images have alt text; the chat works with images blocked.
- [ ] Reduced motion: no fades, no animation.
- [ ] Total avatar images loaded on first paint: only `idle-head` (about 8 KB).

## 9. Known limits and next steps

- **Cut-outs were made automatically** from the supplied renders. Edges and the white shirt were cleaned and checked on dark and yellow backgrounds (see `preview/`), but look at the hair edge at 64 px before shipping.
- **No dedicated `sorry` image.** Generate one (head bowed, hands together) when convenient.
- **`sad` has a gentle smile with a tear**, so it reads as "sorry it missed" more than deep sadness. That suits the 👎 moment. Regenerate with a downturned mouth if you want it sadder.
- **Optional later:** a `wave` pose for the first-ever intro and a `sleepy` pose for long idle.
- Keep generating new poses from the idle image as the reference so face, glasses and colours do not drift.
