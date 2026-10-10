#!/bin/bash
# Creates one schema and one login role per service. Runs once on first start of an empty data volume.
set -euo pipefail
for svc in identity advisory data ml; do
  pw_var="$(echo "${svc}" | tr a-z A-Z)_DB_PASSWORD"
  pw="${!pw_var:?${pw_var} is required}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE ${svc}_svc LOGIN PASSWORD '${pw}';
CREATE SCHEMA ${svc} AUTHORIZATION ${svc}_svc;
ALTER ROLE ${svc}_svc SET search_path = ${svc};
REVOKE ALL ON SCHEMA public FROM ${svc}_svc;
SQL
done
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "REVOKE ALL ON SCHEMA public FROM PUBLIC;"
