# Publicar a versão web na internet (link fixo)

O link fixo usa dois serviços gratuitos: o banco no **Neon** (PostgreSQL) e, no **Render**, a API (serviço web) e as páginas
(site estático). O código vem de um fork do repositório na conta GitHub de quem publica; o repositório do grupo não é usado.

```
navegador ──► site estático no Render (branch site: a pasta dist pronta)
          └─► API no Render (branch do código, pasta services/api) ──► PostgreSQL no Neon
```

## Limites do plano gratuito

- A API dorme depois de 15 minutos sem uso; a primeira resposta depois disso leva perto de 1 minuto. A tela de carregamento
  espera ("Ligando o servidor…", com a logo quase cheia). Antes de apresentar, abra o link uns 2 minutos antes.
- O site estático não dorme.
- O banco do Neon desliga sozinho depois de 5 minutos parado e volta no primeiro acesso, em menos de 1 segundo.
- Os dados são os fictícios de demonstração. Quem tiver o link e uma senha de demonstração pode mexer neles.
- E-mail: sem SMTP configurado, a recuperação de senha responde que o envio não está disponível (ver docs/envio-de-email.md).

## 1. Banco (Neon)

1. Criar a conta em neon.com (pode entrar com o GitHub) e um projeto: nome `maridao`, região **AWS US East 1 (N. Virginia)**
   (a mesma região da API no Render), PostgreSQL na versão sugerida.
2. Em **Connect**, copiar a "connection string" do usuário dono (começa com `postgresql://`).
3. Em `services/api/.env.publicacao` (fora do Git), colar em `DONO_URL=`. `API_SENHA` já vem preenchida com uma senha
   aleatória para o usuário `maridao_api`.
4. Na pasta `services/api`:

        scripts/publicar-banco.sh estrutura   # usuário maridao_api + migrações 001 a 016
        scripts/publicar-banco.sh dados       # copia os dados de demonstração do banco local
        scripts/publicar-banco.sh variaveis   # escreve .env.render com as variáveis da API

   O script não repete migração em banco já preparado nem copia dados por cima de contas existentes. Detalhes no começo
   do próprio script.

## 2. API (Render, serviço web)

**New → Web Service**, repositório `Maridao` do fork, e:

| Campo | Valor |
| --- | --- |
| Branch | a branch com este código (ex.: `andrey/telas-faltantes`) |
| Region | Virginia (US East) |
| Root Directory | `services/api` |
| Runtime / Language | Node |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path (Advanced) | `/health` |
| Environment Variables | **Add from .env** e colar o conteúdo de `services/api/.env.render` |

O endereço fica `https://<nome>.onrender.com`. `TRUST_PROXY=1` faz o limite de tentativas valer por pessoa (sem ele, todo
mundo divide o mesmo limite de 10 tentativas a cada 15 minutos).

## 3. Páginas (Render, site estático)

A pasta `dist` é gerada no computador, com o endereço da API dentro, e vai para a branch `site` do fork (só os arquivos
gerados):

    cd apps/mobile-sdk57
    EXPO_PUBLIC_API_URL=https://<api>.onrender.com npm run export:web

**New → Static Site**, mesmo repositório, branch `site`, Build Command `true`, Publish Directory `.`. Em
**Redirects/Rewrites**: origem `/*`, destino `/index.html`, ação **Rewrite** (o Render só aplica a regra quando não existe
arquivo no caminho, então os arquivos do app continuam saindo direto).

Por fim, na API, `WEB_ORIGINS` igual ao endereço do site (ex.: `https://maridao.onrender.com`, sem barra no fim).

## Atualizar depois

- Código da API: enviar a branch ao fork; o Render publica sozinho.
- Páginas: gerar a `dist` de novo e enviar à branch `site`.
- Banco: novas migrações rodam com `psql "$DONO_URL" -f migrations/0NN_*.sql` (tirando a linha `\connect maridao`, como o
  script faz).
