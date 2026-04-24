-- Per-shop AI provider API key overrides
-- Allows individual shops to supply their own Gemini / Z.AI keys so they
-- do not share the platform-wide free-tier quota.
--
-- Security note: keys are stored in plain text for now. For production
-- hardening, migrate these columns to Supabase Vault (pgsodium.encrypt_text /
-- vault.secrets) so the service-role key never sees plaintext secrets.
-- TODO: move to Supabase Vault before GA launch.

alter table ai_settings
  add column if not exists gemini_api_key text,   -- nullable; null = use GEMINI_API_KEY env
  add column if not exists zai_api_key    text;   -- nullable; null = use ZAI_API_KEY env
