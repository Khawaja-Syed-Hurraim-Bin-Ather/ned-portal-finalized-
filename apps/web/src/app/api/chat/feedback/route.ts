import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '../../../../lib/supabase/server';

/*
 * POST /api/chat/feedback
 * Stores 👍/👎 feedback for a chatbot answer.
 * Rule #3: We accept only message_id (a generated ID, not PII), rating and optional note.
 * Rule #11: No PII is stored.
 */

const FeedbackSchema = z.object({
  message_id: z.string().max(128),
  rating: z.enum(['up', 'down']),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.', details: [] } },
      { status: 400 }
    );
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid feedback payload.', details: parsed.error.errors } },
      { status: 422 }
    );
  }

  const { message_id, rating, note } = parsed.data;

  // Strip any note that looks like it contains personal data (roll numbers, emails)
  const safeNote = note
    ? note
        .replace(/\b\d{2}-[A-Z]+-\d{3,}\b/gi, '[REDACTED]')   // NED roll number pattern
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]')
    : undefined;

  try {
    const supabase = await createClient();

    // Try inserting to chatbot_feedback table.
    // If the table doesn't exist yet, we silently succeed — the table migration
    // should be applied before launch.
    const { error } = await supabase.from('chatbot_feedback').insert({
      message_id,
      rating,
      note: safeNote ?? null,
    });

    if (error && error.code !== '42P01') {
      // 42P01 = table does not exist — ignore during development
      console.error('[feedback] supabase error:', error.message);
    }
  } catch (err) {
    // Best-effort: don't fail the user experience for feedback errors
    console.error('[feedback] unexpected error:', err);
  }

  return NextResponse.json({ data: { received: true } }, { status: 200 });
}
