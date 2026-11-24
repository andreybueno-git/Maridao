# Versão web (o aplicativo no navegador, dentro de um celular)

Para apresentar o Maridão em sala sem simulador: o mesmo aplicativo roda no navegador e, em tela de computador, aparece
dentro de um iPhone desenhado, com a marca ao lado. É o código do aplicativo, não um vídeo nem imagens: dá para entrar,
pedir serviço, trocar o tema e navegar como no celular, usando a mesma API e o mesmo banco.

## Como aparece

| Onde abre | O que mostra |
| --- | --- |
| Tela larga (700 px ou mais: computador, projetor) | Página escura com o iPhone no centro e o aplicativo dentro dele. A partir de 1100 px de largura, a marca, a frase e "Palmas · TO" aparecem à esquerda. O celular cresce ou encolhe para caber na altura da tela. |
| Tela estreita (celular de verdade) | O aplicativo em tela cheia, sem moldura. |
| Qualquer tela com `?sem-moldura` no endereço | O aplicativo em tela cheia. |

Dentro da moldura o aplicativo enxerga uma janela de 402 × 874 (o tamanho da tela do iPhone 17 Pro), recebe a área segura do
aparelho (54 em cima, 34 embaixo) e desenha a barra de status (9:41), a ilha e o indicador de início, que acompanham o tema.
O cursor vira um círculo (o "dedo"), as barras de rolagem somem e arrastar não seleciona texto. A roda do mouse rola.

Código: `src/components/web-frame.web.tsx` (no aparelho, `web-frame.tsx` não faz nada) e o `_layout.tsx` raiz.

## Tela de carregamento

Antes do aplicativo aparece o símbolo do Maridão enchendo de verde, como líquido, com uma onda na superfície, e
"Carregando · 42%" embaixo. Ela já vem no HTML da página (aparece antes de qualquer JavaScript, subindo sozinha até um terço)
e, quando o aplicativo assume, passa a seguir o download do Skia (abaixo). Cheia, a logo dá um pulo e some; o aplicativo
nasce por baixo e a abertura dele começa com o símbolo no mesmo lugar e tamanho. No computador ela aparece dentro do celular.
A silhueta do símbolo vem embutida na página (`src/components/loader-symbol.ts`), para aparecer já no primeiro quadro.

## Gosma da troca de tema e gota do aviso (Skia no navegador)

São os mesmos desenhos do iPhone (`theme-goo-skia.tsx` e `toast-drop-skia.tsx`). No navegador o Skia roda sobre o CanvasKit,
um WebAssembly de ~8 MB (`public/canvaskit.wasm`, copiado de `node_modules` pelo `setup-skia-web` nos comandos `web`,
`export:web` e `apresentar`; fica fora do Git). `src/lib/skia-web.ts` baixa esse arquivo com progresso durante a tela de
carregamento, inicia o CanvasKit e só então importa os dois desenhos: o pacote do Skia cria o objeto `Skia` a partir do
CanvasKit no momento em que é importado, então nada o importa de forma estática no navegador (`theme-goo.web.tsx` e
`toast-drop.web.tsx` escolhem a versão na hora). Se o download falhar ou passar de 40 s, o aplicativo abre assim mesmo: a
troca de tema fica direta e o aviso cai sem a fusão das formas.

## Diferenças em relação ao aplicativo no iPhone

- As telas que no iPhone sobem como folha abrem como tela inteira.
- A sessão continua só na memória: recarregar a página sai da conta.

## A barrinha "Bundling…" embaixo da tela

Com `npx expo start --web` (modo de desenvolvimento), o próprio Expo mostra uma barrinha no rodapé quando compila uma parte
nova do código, recarrega depois de uma mudança ou carrega o Skia. Ela é da ferramenta de desenvolvimento, não do aplicativo,
e não existe na versão gerada por `export`. Para apresentar, use `npm run apresentar` (abaixo).

## Apresentar do notebook

1. Banco e API ligados (`npm run dev` em `services/api`), com `WEB_ORIGINS=http://localhost:8086` (ou a lista com as
   outras portas) no `.env` da API. Sem essa variável a API não responde ao navegador (CORS); o aplicativo nativo não precisa dela.
2. Em `apps/mobile-sdk57`: `npm run apresentar`. Gera a versão final (cerca de 1 minuto) e a serve em `http://localhost:8086`.
3. Abrir `http://localhost:8086` no navegador e pôr em tela cheia (F11 no Windows, ⌃⌘F no Mac).

Na versão final o aplicativo exige HTTPS para a API, com uma exceção: a API no próprio computador (`http://localhost` ou
`http://127.0.0.1`), em que nada passa pela rede.

Para mexer no código vendo o resultado: `npm run web` (modo de desenvolvimento, com a barrinha do Expo), na porta 8081.

## Gerar os arquivos para publicar

    npm run export:web

Gera a pasta `dist` (cerca de 13 MB com o CanvasKit, uma página por tela; não precisa de regra de redirecionamento). O endereço da API entra
nos arquivos na hora do build: rode com `EXPO_PUBLIC_API_URL=https://endereco-da-api` definido. Fora do modo de
desenvolvimento o aplicativo exige HTTPS para a API.

Passo a passo com Neon e Render (plano grátis): docs/publicar-na-internet.md. Em geral, para funcionar na internet são necessários:

- os arquivos de `dist` num serviço de hospedagem de páginas (EAS Hosting, Netlify, Vercel, GitHub Pages, Cloudflare Pages…);
- a API num servidor com HTTPS, com `WEB_ORIGINS` igual ao endereço onde as páginas ficaram (sem barra no fim);
- o banco PostgreSQL acessível só pela API, com as migrações aplicadas e dados fictícios para a demonstração.

## API: CORS

`services/api/src/cors.ts`. Só as origens listadas em `WEB_ORIGINS` (separadas por vírgula, sem curinga nem caminho) recebem
`Access-Control-Allow-Origin`. A consulta prévia do navegador (`OPTIONS`) é respondida antes da trava de sessão, com os
métodos e os cabeçalhos `Authorization` e `Content-Type`. Não há cookies: o token segue no cabeçalho `Authorization`.
Testes em `tests/cors.test.ts` (no `npm run test:unit`).
