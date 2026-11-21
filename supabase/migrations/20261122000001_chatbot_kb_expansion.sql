-- ==============================================================================
-- Migration: 20261122000001_chatbot_kb_expansion.sql
-- Description: Additive schema updates for EduCompass / Abdul Bari Knowledge Base
-- Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Phase 1)
--
-- NON-NEGOTIABLE SAFETY GUARANTEE:
-- is_active is created with NOT NULL DEFAULT true so that every existing row
-- remains active and 100% operational immediately upon migration.
-- ==============================================================================

-- 1. Add is_active column with default true
ALTER TABLE chatbot_answers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Add language column (en | ru)
ALTER TABLE chatbot_answers
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) NULL DEFAULT 'en';

-- 3. Add intent_id column (e.g. G01, G02, R01, etc.)
ALTER TABLE chatbot_answers
  ADD COLUMN IF NOT EXISTS intent_id VARCHAR(50) NULL;

-- 4. Add tone_hint column (e.g. neutral, motivating, formal)
ALTER TABLE chatbot_answers
  ADD COLUMN IF NOT EXISTS tone_hint VARCHAR(50) NULL;

-- 5. Add unique partial index for idempotency on seeded draft intents
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_answers_intent_lang
  ON chatbot_answers (intent_id, language)
  WHERE intent_id IS NOT NULL;

-- 6. Add comment documenting column purposes
COMMENT ON COLUMN chatbot_answers.is_active IS 'Active flag: false denotes unreviewed draft or disabled intent';
COMMENT ON COLUMN chatbot_answers.language IS 'Language of pattern and answer: en (English) or ru (Roman Urdu)';
COMMENT ON COLUMN chatbot_answers.intent_id IS 'Canonical intent identifier linking EN and RU pairs (e.g. G01)';
