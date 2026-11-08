'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useEditMode } from '../../context/EditModeContext';
import { AbdulPanel } from '../../components/abdul/AbdulPanel';

/*
 * /chat — full-page chat with Abdul Bari.
 *
 * The AbdulPanel component is shared with the floating widget.
 * The offline toggle and admin controls live inside the panel ⋯ menu.
 * The UnansweredQuestionsDrawer is accessible via the panel ⋯ menu (admin only).
 */

function ChatPageContent() {
  const { isEditMode, viewAsStudent } = useEditMode();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams?.get('q') ?? null;

  return (
    <div className="inner-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PageHeader
        title="AI Academic Assistant"
        badge="Abdul Bari · 4-Layer"
        breadcrumbs={[{ label: 'AI Assistant' }]}
        description="Ask Abdul Bari about degree requirements, prerequisites, FYPs and careers."
        accent="var(--primary)"
      />

      <div
        className="inner-page-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        {/* Full-page panel — takes up all remaining space */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AbdulPanel
            fullPage={true}
            initialPrompt={initialPrompt}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="inner-page"><div className="inner-page-body">Loading…</div></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
