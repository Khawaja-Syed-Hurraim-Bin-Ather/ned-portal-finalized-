# EduCompass — Master Configuration & API Keys Reference

**Classification**: Internal Development & Deployment Reference  
**Last Updated**: 2026-11-22  
**Compliance**: Adheres strictly to **AGENTS.md Rule 11** (Zero raw secrets in version control; secrets displayed with first 4 and last 4 characters only).

---

## 1. Cloud & Database Infrastructure (Supabase)

The core persistence tier runs on managed **Supabase PostgreSQL (AWS ap-southeast-2)** with PostgREST, Auth, and Storage enabled.

| Configuration Key | Environment Variable | Value / Pattern | Description & Purpose |
| :--- | :--- | :--- | :--- |
| **Supabase URL** | `NEXT_PUBLIC_SUPABASE_URL` | `https://hrzzxtjuiofivnytqldj.supabase.co` | Public REST/GraphQL and Auth endpoint for browser & client. |
| **Supabase Anon Key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...nM-s` | Public client JWT for anonymous/authenticated row reads with RLS. |
| **Service Role Key** | `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...RTDM` | Server-only administrative key bypassing RLS. Used in API routes. |
| **Direct DB Connection** | `DATABASE_URL` | `post...gres` | IPv4 pooled connection string (Supavisor port 6543, pooler mode). |
| **Project Ref ID** | `SUPABASE_PROJECT_ID` | `hrzzxtjuiofivnytqldj` | Unique identifier in Supabase dashboard. |
| **Region** | — | `ap-southeast-2` (Sydney) | Primary cloud database datacenter. |

---

## 2. Artificial Intelligence & LLM Gateway

All LLM calls and embedding generations are strictly funneled through `apps/api/src/lib/llm-gateway.ts` (**Rule 4**). No other file is permitted to make live AI calls.

| Provider / Parameter | Environment Variable | Value / Setting | Description & Fallback Order |
| :--- | :--- | :--- | :--- |
| **Primary LLM Provider** | `LLM_PROVIDER` | `gemini` | Primary engine: Google Gemini API. |
| **Primary LLM Model** | `LLM_MODEL` | `gemini-2.0-flash` | Ultra-fast reasoning & academic synthesis model. |
| **Gemini API Key** | `GEMINI_API_KEY` | `AQ.A...nQ3w` | Dedicated Google AI Studio key. |
| **Secondary LLM Model** | `LLM_MODEL_FALLBACK` | `gemini-1.5-flash` | Intra-provider fallback if 2.0 experiences quota or latency spikes. |
| **Fallback LLM Provider** | `LLM_PROVIDER_FALLBACK` | `xai` | Provider-level fallback if Gemini endpoint is unreachable. |
| **Fallback LLM Model** | `XAI_MODEL` | `grok-beta` | xAI Grok completions endpoint (`https://api.x.ai/v1/chat/completions`). |
| **xAI API Key** | `XAI_API_KEY` | `xai-...PYca` | Authenticated Bearer token for xAI Grok API. |
| **Tertiary Fallback** | `GROQ_API_KEY` | *(Configured standby)* | Groq ultra-low latency Llama-3.3 fallback slot. |
| **Offline Fallback** | — | Layer 1 / Layer 2 / Layer 4 | Instant deterministic response when LLM is switched off (**Rule 5**). |

### Embedding Configuration

| Parameter | Environment Variable | Value | Description |
| :--- | :--- | :--- | :--- |
| **Embedding Provider** | `EMBEDDING_PROVIDER` | `gemini` | Generates semantic vectors for course & FAQ retrieval. |
| **Embedding Model** | `EMBEDDING_MODEL` | `text-embedding-004` | Google 768-dimensional semantic embedding model. |
| **Vector Dimension** | `EMBEDDING_DIM` | `768` | Matches the `vector(768)` column type in PostgreSQL `pgvector`. |

### Hard Computational & Budget Constraints (SRS NFR-08)

| Guardrail Parameter | Environment Variable | Value | Enforced Rule |
| :--- | :--- | :--- | :--- |
| **Max User Input Chars** | `LLM_MAX_INPUT_CHARS` | `300` | Rejects payloads >300 chars to avoid prompt injection & buffer overflows. |
| **Max Output Tokens** | `LLM_MAX_OUTPUT_TOKENS` | `500` | Strict token ceiling preventing runaway generation costs. |
| **User Daily Quota** | `LLM_USER_DAILY_LIMIT` | `20` | Max 20 LLM queries per registered user per calendar day. |
| **Global Daily Budget** | `LLM_GLOBAL_DAILY_BUDGET` | `100` | Monitored in `llm_usage` table. Drops to Layer 1/2 when exhausted. |

---

## 3. Application Authentication & Security

| Configuration Key | Environment Variable | Value / Pattern | Description & Purpose |
| :--- | :--- | :--- | :--- |
| **NextAuth / Session Secret** | `NEXTAUTH_SECRET` | `Y9Ww...rMU4` | High-entropy HMAC-SHA256 secret for signing auth tokens & cookies. |
| **Public Site URL** | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Base callback origin for Next.js web application. |
| **Admin Seed Identity** | `ADMIN_SEED_EMAIL` | `curs...gmail.com` | Institutional root admin email for seed bootstrap & emergency recovery. |
| **Google OAuth Client** | Supabase Provider Settings | Configurable in Supabase | Supports `@cloud.neduet.edu.pk` single sign-on. |

---

## 4. Academic Engine & Port Architecture

| Component | Port / Setting | Environment Variable | Purpose |
| :--- | :--- | :--- | :--- |
| **Web Frontend (Next.js 15)** | `3000` | `WEB_PORT` | SSR and interactive student client portal. |
| **API Backend (Express 4)** | `4000` | `API_PORT` | REST endpoints `/api/v1/*` (Prereq, Chat, Admin, Planner). |
| **ETL Pipeline (FastAPI)** | `8000` | `PIPELINE_PORT` | Offline data scraping and PDF verification services. |
| **Prerequisite Importance Weights** | `40,25,20,15` | `IMPORTANCE_WEIGHTS` | Weights for: downstream count, credit weight, core status, term depth. |
| **GitHub REST Integration** | `gith...yCe6` | `GITHUB_TOKEN` | 5,000 req/hr token for fetching open-source student FYP repositories. |

---

## 5. Syncing Environment Variables Across Services

To distribute these settings across the monorepo without duplicating values manually:

```bash
# Push root .env to apps/web/.env.local, apps/api/.env.local, and services/pipeline/.env
node scripts/sync-env.js
```
