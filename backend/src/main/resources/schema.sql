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
