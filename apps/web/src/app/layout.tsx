import type { Metadata, Viewport } from 'next';
import './globals.css';
import { EditModeProvider } from '../context/EditModeContext';
import dynamic from 'next/dynamic';

// AbdulWidget is lazy-loaded after idle so it doesn't block first paint.
// ssr:false because it uses localStorage/sessionStorage for login intro state.
const AbdulWidget = dynamic(
  () => import('../components/abdul/AbdulWidget').then((m) => m.AbdulWidget),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'EduCompass — NED University CISE Student Portal',
  description:
    'Official academic planning and guidance platform for the Department of Computer & Information Systems Engineering, NED University of Engineering & Technology, Karachi.',
};

export const viewport: Viewport = {
  themeColor: '#511030',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/*
         * BIS_SKIN_CHECKED HYDRATION FIX
         * Browser extensions (Honey, BIS Scanner, etc.) inject
         * `bis_skin_checked="1"` onto every DOM element BEFORE React hydrates,
         * causing a hydration mismatch. This inline script:
         *   1. Overrides Element.prototype.setAttribute to block the injection.
         *   2. Strips any copies already injected before this script ran.
         *   3. Watches via MutationObserver for future injections.
         *   4. Silences the React dev-overlay error card for this noise only.
         *   5. Initialises the dark/light theme flag flash-free.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var _origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (name === 'bis_skin_checked') return;
      return _origSetAttr.apply(this, arguments);
    };
    (function _strip() {
      try {
        var els = document.querySelectorAll('[bis_skin_checked]');
        for (var i = 0; i < els.length; i++) els[i].removeAttribute('bis_skin_checked');
      } catch(e2) {}
    })();
    var _obs = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
          try { m.target.removeAttribute('bis_skin_checked'); } catch(e3) {}
        }
      }
    });
    _obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
    var _origError = console.error;
    var _BIS = /bis_skin_checked/i;
    var _HYD = /hydrat|did not match|tree hydrated/i;
    console.error = function() {
      var args = Array.prototype.slice.call(arguments);
      var hasBis = args.some(function(a) { return typeof a === 'string' && _BIS.test(a); });
      if (hasBis) return;
      var hasHyd = args.some(function(a) { return typeof a === 'string' && _HYD.test(a); });
      if (hasHyd && hasBis) return;
      return _origError.apply(console, args);
    };
    try {
      var _t = localStorage.getItem('educompass-theme');
      if (!_t) _t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', _t);
    } catch(e4) {}
  } catch(e) {}
})();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-page text-text font-sans antialiased" suppressHydrationWarning>
        <EditModeProvider>
          {children}
        </EditModeProvider>

        {/* Abdul Bari widget — mounted once, appears on every student page */}
        <AbdulWidget />

        <div id="toast-region" className="toast-region" aria-live="polite" aria-atomic="true" suppressHydrationWarning />
        <div id="modal-root" suppressHydrationWarning />
      </body>
    </html>
  );
}
