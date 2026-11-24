#!/bin/zsh
# Prepara um PostgreSQL hospedado (ex.: Neon) para a versão publicada do Maridão. Ver docs/publicar-na-internet.md.
#
#   scripts/publicar-banco.sh estrutura   cria o usuário maridao_api e aplica as migrações 001 a 016
#   scripts/publicar-banco.sh dados       copia os dados do banco local (dados fictícios de demonstração) para o hospedado
#   scripts/publicar-banco.sh variaveis   escreve .env.render: as variáveis da API para colar no Render
#
# Lê services/api/.env.publicacao (fora do Git), com:
#   DONO_URL=postgresql://dono:senha@endereco/banco?sslmode=require   (a "connection string" do Neon, do usuário dono)
#   API_SENHA=...                                                      (senha do usuário maridao_api; o script não a mostra)
#
# Diferenças em relação à instalação local (README): lá as migrações rodam como postgres, no banco maridao. Num banco
# hospedado não existe o usuário postgres e o banco tem outro nome; então a linha "\connect maridao" é ignorada e o
# esquema fica com o dono do banco (AUTHORIZATION CURRENT_USER). O resto das migrações é o mesmo arquivo.
# Na cópia dos dados os gatilhos de aviso ficam desligados (senão os avisos já existentes seriam criados de novo); o dono
# das tabelas pode fazer isso sem ser administrador do servidor. Sessões não são copiadas.
set -euo pipefail
cd "${0:A:h}/.."
arquivo=${PUBLICACAO:-.env.publicacao}   # PUBLICACAO=outro-arquivo para testar contra outro banco
[[ -f $arquivo ]] || { print -u2 "Falta services/api/$arquivo (veja o começo deste arquivo)."; exit 1; }
source $arquivo
[[ -n "${DONO_URL:-}" && -n "${API_SENHA:-}" ]] || { print -u2 "Preencha DONO_URL e API_SENHA em .env.publicacao."; exit 1; }
LOCAL=(-h "${LOCAL_HOST:-127.0.0.1}" -U "${LOCAL_USUARIO:-postgres}" -d "${LOCAL_BANCO:-maridao}")
remoto() { psql "$DONO_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

case "${1:-}" in
  estrutura)
    remoto -v senha="$API_SENHA" <<'SQL'
SELECT 'CREATE ROLE maridao_api LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'maridao_api')
\gexec
ALTER ROLE maridao_api LOGIN PASSWORD :'senha';
SQL
    if [[ -n "$(remoto -Atc "SELECT 1 FROM pg_namespace WHERE nspname = 'maridao'")" ]]; then
      print -u2 "O esquema maridao já existe neste banco: as migrações 001 a 008 não podem ser repetidas. Nada foi feito."; exit 1
    fi
    for arquivo in migrations/0[01][0-9]_*.sql; do
      print "aplicando ${arquivo:t}"
      sed -e '/^\\connect /d' -e 's/AUTHORIZATION postgres/AUTHORIZATION CURRENT_USER/' "$arquivo" | remoto -f -
    done
    print "Estrutura pronta: $(remoto -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'maridao'") tabelas no esquema maridao."
    ;;
  dados)
    [[ "$(remoto -Atc 'SELECT count(*) FROM maridao.accounts')" == 0 ]] || { print -u2 "O banco hospedado já tem contas. Nada foi copiado."; exit 1; }
    gatilhos=(maridao.provider_profiles maridao.service_requests maridao.proposals maridao.request_events maridao.chat_messages)
    # pedidos e propostas apontam um para o outro: as chaves estrangeiras saem durante a cópia e voltam no fim (e aí o banco
    # confere todas as linhas de novo)
    {
      print 'BEGIN;'
      print "CREATE TEMP TABLE chaves AS SELECT conrelid::regclass::text AS tabela, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE contype = 'f' AND connamespace = 'maridao'::regnamespace;"
      print "SELECT format('ALTER TABLE %s DROP CONSTRAINT %I', tabela, conname) FROM pg_temp.chaves"; print '\\gexec'
      for t in $gatilhos; do print "ALTER TABLE $t DISABLE TRIGGER USER;"; done
      pg_dump $LOCAL --data-only --schema=maridao --exclude-table-data=maridao.sessions --no-owner --no-privileges
      for t in $gatilhos; do print "ALTER TABLE $t ENABLE TRIGGER USER;"; done
      print "SELECT format('ALTER TABLE %s ADD CONSTRAINT %I %s', tabela, conname, def) FROM pg_temp.chaves"; print '\\gexec'
      print 'COMMIT;'
    } | remoto -f -
    remoto -Atc "SELECT 'contas: ' || (SELECT count(*) FROM maridao.accounts) || ', pedidos: ' || (SELECT count(*) FROM maridao.service_requests) || ', propostas: ' || (SELECT count(*) FROM maridao.proposals) || ', avisos: ' || (SELECT count(*) FROM maridao.notifications)"
    ;;
  variaveis)
    # endereço e banco saem da DONO_URL; as chaves vêm do .env local (os dados copiados foram cifrados com elas)
    host=$(print -r -- "$DONO_URL" | sed -E 's#^[a-z]+://[^@]+@([^/:?]+).*#\1#')
    banco=$(print -r -- "$DONO_URL" | sed -E 's#^[a-z]+://[^/]+/([^?]+).*#\1#')
    chave() { grep -E "^$1=" .env | head -1; }
    {
      print "NODE_VERSION=24"
      print "HOST=0.0.0.0"
      print "TRUST_PROXY=1"
      print "PGSSLMODE=require"
      print "PGHOST=$host"
      print "PGPORT=5432"
      print "PGDATABASE=$banco"
      print "PGUSER=maridao_api"
      print "PGPASSWORD=$API_SENHA"
      chave DOCUMENT_ENCRYPTION_KEY; chave DOCUMENT_INDEX_KEY; chave CHAT_ENCRYPTION_KEY
      print "WEB_ORIGINS=${SITE:-https://maridao.onrender.com}"
    } > .env.render
    chmod 600 .env.render
    print "Escrito services/api/.env.render ($(grep -c '' .env.render) variáveis). Fica fora do Git."
    ;;
  *) print -u2 "Uso: scripts/publicar-banco.sh estrutura|dados|variaveis"; exit 1 ;;
esac
