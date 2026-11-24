#!/bin/zsh
# Põe em services/api/.env.publicacao (DONO_URL) a connection string copiada do Neon, lendo a área de transferência do Mac.
# Rode primeiro e copie depois: o comando espera até 10 minutos por uma connection string na área de transferência.
# Aceita a linha pura (postgresql://...) ou o comando que o Neon mostra (psql 'postgresql://...'). Não mostra a senha.
set -euo pipefail
cd "${0:A:h}/.."
python3 - <<'PY'
import pathlib, re, subprocess, sys, time
padrao = re.compile(r"postgres(?:ql)?://[^\s'\"]+")
def colado():
    return padrao.search(subprocess.run(["pbpaste"], capture_output=True, text=True).stdout)
achado = colado()
if not achado:
    print("Agora copie a connection string no Neon (Connect → botão de copiar). Estou esperando…", flush=True)
    limite = time.time() + 600
    while not achado and time.time() < limite:
        time.sleep(1); achado = colado()
if not achado:
    sys.exit("Passaram 10 minutos sem uma connection string (postgresql://...) na área de transferência. Rode de novo.")
if "****" in achado.group(0):
    sys.exit("A connection string copiada está com a senha escondida (****). No Neon, use o botão de copiar ou 'Show password'.")
arquivo = pathlib.Path(".env.publicacao")
arquivo.write_text(re.sub(r"(?m)^DONO_URL=.*$", lambda _: "DONO_URL='" + achado.group(0) + "'", arquivo.read_text()))
subprocess.run(["pbcopy"], input="", text=True)  # tira a senha da área de transferência
endereco = re.sub(r"^[a-z]+://[^@]+@", "", achado.group(0)).split("/")[0]
print("Connection string guardada em services/api/.env.publicacao (servidor " + endereco + "). Pode voltar para a conversa.")
PY
