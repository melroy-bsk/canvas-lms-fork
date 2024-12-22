#!/bin/bash

set -x -o errexit -o errtrace -o nounset -o pipefail

# setup extensions on template1 so future databases
# all get the same extensions
psql -v ON_ERROR_STOP=1 --username postgres -d template1 <<SQL
  CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;
SQL

# Create the canvas role with a password
psql -v ON_ERROR_STOP=1 --username postgres <<SQL
  CREATE ROLE canvas WITH LOGIN PASSWORD 'your_password';
SQL

for environment in test development production; do
  psql -v ON_ERROR_STOP=1 --username postgres <<SQL
    CREATE DATABASE canvas_${environment};
SQL
done

# Grant privileges to the canvas_production database
psql -v ON_ERROR_STOP=1 --username postgres <<SQL
  GRANT ALL PRIVILEGES ON DATABASE canvas_production TO canvas;
SQL
