-- Runs BEFORE Hibernate DDL (spring.sql.init.mode=always).
-- 1. Create the finance_app schema so Hibernate can create tables in it.
-- 2. Drop legacy columns that ddl-auto=update never removes.
-- IF EXISTS guards make every statement safe on fresh databases.
CREATE SCHEMA IF NOT EXISTS finance_app;
ALTER TABLE IF EXISTS finance_app.bank_accounts DROP COLUMN IF EXISTS currency_code;
ALTER TABLE IF EXISTS finance_app.users DROP COLUMN IF EXISTS currency;
