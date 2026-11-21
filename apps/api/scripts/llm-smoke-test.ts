/**
 * EduCompass LLM Provider Smoke-Test Script
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 9.2 item 8)
 * 
 * Rules:
 * 1. For each configured provider, sends a trivial test prompt ("ping").
 * 2. Prints ONLY: provider, model, ok/fail, latency_ms, status class.
 * 3. NEVER prints API keys, full responses, or headers.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/api/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface SmokeResult {
  provider: string;
  model: string;
  status: 'OK' | 'FAIL' | 'SKIPPED';
  latencyMs: number;
  statusClass: string;
  errorCategory?: string;
}

async function testGemini(modelName: string): Promise<SmokeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      provider: 'gemini',
      model: modelName,
      status: 'SKIPPED',
      latencyMs: 0,
      statusClass: 'NO_KEY',
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: 'ping' }] }],
    generationConfig: { maxOutputTokens: 5 },
  };

  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const latency = Date.now() - start;
    const statusClass = `${Math.floor(res.status / 100)}xx (${res.status})`;

    return {
      provider: 'gemini',
      model: modelName,
      status: res.ok ? 'OK' : 'FAIL',
      latencyMs: latency,
      statusClass,
      errorCategory: res.ok ? undefined : `HTTP_${res.status}`,
    };
  } catch (err: any) {
    const latency = Date.now() - start;
    return {
      provider: 'gemini',
      model: modelName,
      status: 'FAIL',
      latencyMs: latency,
      statusClass: err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      errorCategory: err.code || err.name,
    };
  }
}

async function testXAI(modelName: string): Promise<SmokeResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      provider: 'xai',
      model: modelName,
      status: 'SKIPPED',
      latencyMs: 0,
      statusClass: 'NO_KEY',
    };
  }

  const endpoint = 'https://api.x.ai/v1/chat/completions';
  const payload = {
    model: modelName,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 5,
  };

  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const latency = Date.now() - start;
    const statusClass = `${Math.floor(res.status / 100)}xx (${res.status})`;

    return {
      provider: 'xai',
      model: modelName,
      status: res.ok ? 'OK' : 'FAIL',
      latencyMs: latency,
      statusClass,
      errorCategory: res.ok ? undefined : `HTTP_${res.status}`,
    };
  } catch (err: any) {
    const latency = Date.now() - start;
    return {
      provider: 'xai',
      model: modelName,
      status: 'FAIL',
      latencyMs: latency,
      statusClass: err.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      errorCategory: err.code || err.name,
    };
  }
}

async function runSmokeTests() {
  console.log('================================================================');
  console.log(' EduCompass LLM Provider Smoke Test (Safe Health Check)        ');
  console.log('================================================================');
  console.log('Provider   | Model               | Status  | Latency  | Status Class');
  console.log('-----------+---------------------+---------+----------+-------------');

  const tests: Promise<SmokeResult>[] = [
    testGemini(process.env.LLM_MODEL || 'gemini-2.0-flash'),
    testGemini(process.env.LLM_MODEL_FALLBACK || 'gemini-1.5-flash'),
    testXAI('grok-beta'),
  ];

  const results = await Promise.all(tests);

  for (const r of results) {
    const pPad = r.provider.padEnd(10);
    const mPad = r.model.padEnd(20);
    const sPad = r.status.padEnd(8);
    const lPad = `${r.latencyMs}ms`.padEnd(9);
    console.log(`${pPad} | ${mPad}| ${sPad}| ${lPad}| ${r.statusClass}`);
  }
  console.log('================================================================');
  console.log('Smoke test complete. Zero secrets or response texts exposed.');
}

runSmokeTests();
