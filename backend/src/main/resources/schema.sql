-- Runs BEFORE Hibernate DDL (spring.sql.init.mode=always).
-- 1. Create the finance_app schema so Hibernate can create tables in it.
-- 2. Drop ALL legacy currency columns that Hibernate ddl-auto=update never removes.
-- IF EXISTS guards make every statement safe on any database state.
CREATE SCHEMA IF NOT EXISTS finance_app;

-- Legacy direct-currency columns on bank_accounts (replaced by currency_id FK)
ALTER TABLE IF EXISTS finance_app.bank_accounts DROP COLUMN IF EXISTS currency_code;
ALTER TABLE IF EXISTS finance_app.bank_accounts DROP COLUMN IF EXISTS currency_symbol;
ALTER TABLE IF EXISTS finance_app.bank_accounts DROP COLUMN IF EXISTS currency_name;
ALTER TABLE IF EXISTS finance_app.bank_accounts DROP COLUMN IF EXISTS currency_flag;

-- Legacy currency column on users (currency selection removed from signup)
ALTER TABLE IF EXISTS finance_app.users DROP COLUMN IF EXISTS currency;

-- Drop old unique-on-code constraint and replace with composite (code, country)
-- so that multiple Eurozone countries can each have their own EUR row.
-- We must find the constraint by inspecting pg_constraint because Hibernate may have
-- generated it with a random name (e.g. uk_5r2dfx1im7vus47ma8y05sflt) rather than
-- the predictable 'currencies_code_key'. We drop every single-column unique on 'code'.
DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'finance_app' AND table_name = 'currencies') THEN
    -- Drop ALL unique constraints that cover ONLY the 'code' column
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'finance_app'
        AND t.relname = 'currencies'
        AND c.contype = 'u'
        AND array_length(c.conkey, 1) = 1
        AND c.conkey[1] = (
          SELECT a.attnum FROM pg_attribute a
          WHERE a.attrelid = t.oid AND a.attname = 'code'
        )
    LOOP
      EXECUTE 'ALTER TABLE finance_app.currencies DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
      RAISE NOTICE 'Dropped single-column unique constraint on currencies.code: %', r.conname;
    END LOOP;

    -- Also drop the composite constraint if it exists (will be re-added below cleanly)
    ALTER TABLE finance_app.currencies DROP CONSTRAINT IF EXISTS uq_currency_code_country;

    -- Add the correct composite unique constraint
    ALTER TABLE finance_app.currencies
      ADD CONSTRAINT uq_currency_code_country UNIQUE (code, country);
  END IF;
END$$;
-- Remove the generic 'Eurozone' EUR entry (replaced by per-country entries added by CurrencySeeder)
DELETE FROM finance_app.currencies WHERE code = 'EUR' AND country = 'Eurozone';
