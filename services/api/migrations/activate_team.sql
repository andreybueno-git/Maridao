\encoding UTF8
\set ON_ERROR_STOP on
-- Run with psql -U postgres -d maridao -f migrations/activate_team.sql
\ir 009_proposal_management.sql
\ir 010_customer_confirmation.sql
\ir 011_team_workflows.sql
\echo 'Atualizações aplicadas. Reinicie a API e o Expo.'
