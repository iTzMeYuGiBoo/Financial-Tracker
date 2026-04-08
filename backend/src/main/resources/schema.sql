-- Runs AFTER Hibernate DDL (spring.jpa.defer-datasource-initialization=true).
-- Drop legacy columns that Hibernate ddl-auto=update will never remove on its own.
-- IF EXISTS prevents errors on fresh databases where these columns never existed.
ALTER TABLE bank_accounts DROP COLUMN IF EXISTS currency_code;
ALTER TABLE users DROP COLUMN IF EXISTS currency;
