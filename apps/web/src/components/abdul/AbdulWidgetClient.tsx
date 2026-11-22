'use client';

import dynamic from 'next/dynamic';

export const AbdulWidgetClient = dynamic(
  () => import('./AbdulWidget').then((m) => m.AbdulWidget),
  { ssr: false }
);
