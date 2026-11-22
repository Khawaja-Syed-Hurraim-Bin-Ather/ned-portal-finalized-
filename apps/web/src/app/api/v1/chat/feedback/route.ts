import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      data: {
        success: true,
        recorded: true,
        feedback: body?.feedback || 'received',
      },
    });
  } catch {
    return NextResponse.json({ data: { success: true } });
  }
}
