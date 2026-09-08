-- ============================================================================
-- MIGRATION SÉCURITÉ & INTÉGRITÉ — CML Fuel Management System Pro
-- À exécuter UNE SEULE FOIS contre la base pointée par DATABASE_URL (cml_fuel).
-- Idempotent : chaque instruction est protégée par IF NOT EXISTS / IF EXISTS.
-- ============================================================================

-- 1. Authentification : hash de mot de passe (scrypt) sur les comptes
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Les comptes existants n'ont pas de hash : provisionnez-en un via
-- l'endpoint POST /api/auth/bootstrap (AUTH_BOOTSTRAP_TOKEN) AVANT la 1re
-- connexion, puis SUPPRIMEZ ce token du .env une fois le provisionnement fini.

-- 2. Journal d'audit : suppression de l'IP par défaut falsifiée (192.168.1.104)
--    Désormais l'IP réelle est renseignée par le serveur à chaque écriture.
ALTER TABLE audit_logs ALTER COLUMN ip_address DROP DEFAULT;

-- 3. Garanties d'unicité métier (no-op si déjà présentes via Drizzle)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS engines_code_unique ON engines (code);
CREATE UNIQUE INDEX IF NOT EXISTS drivers_matricule_unique ON drivers (matricule);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name_unique ON suppliers (name);
CREATE UNIQUE INDEX IF NOT EXISTS tanks_code_unique ON tanks (code);
CREATE UNIQUE INDEX IF NOT EXISTS refuelings_refueling_code_unique ON refuelings (refueling_code);
CREATE UNIQUE INDEX IF NOT EXISTS archive_requests_request_code_unique ON archive_requests (request_code);
CREATE UNIQUE INDEX IF NOT EXISTS data_archives_archive_code_unique ON data_archives (archive_code);

-- 4. Garde-fous d'intégrité sur les volumes (empêche tout stock négatif en base)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tanks_level_positive'
  ) THEN
    ALTER TABLE tanks ADD CONSTRAINT tanks_level_positive CHECK (current_level >= 0);
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRATION
-- ============================================================================
