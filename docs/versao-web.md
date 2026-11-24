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

## Diferenças em relação ao aplicativo no iPhone

- A gosma da troca de tema e a gota líquida do aviso usam o Skia, que no navegador exigiria carregar o CanvasKit
  (WebAssembly de ~7 MB) antes de qualquer tela e quebra a geração das páginas. No navegador a troca de tema usa a revelação
  circular (`theme-goo.web.tsx` desliga a gosma) e o aviso cai e abre com o mesmo movimento, sem a fusão das formas
  (`toast-drop.web.tsx`).
- As telas que no iPhone sobem como folha abrem como tela inteira.
- A sessão continua só na memória: recarregar a página sai da conta.

## Rodar no computador

1. No `.env` da API, acrescente `WEB_ORIGINS=http://localhost:8081` (o endereço onde a versão web abre). Sem essa variável a
   API não responde ao navegador (CORS); o aplicativo nativo não precisa dela. Reinicie a API.
2. Na pasta `apps/mobile-sdk57`: `npx expo start --web`. Com `EXPO_PUBLIC_API_URL=http://localhost:3000` no `.env` do aplicativo.
3. Abrir `http://localhost:8081` no navegador (em tela cheia no projetor: F11 ou ⌃⌘F).

## Gerar os arquivos para publicar

    npx expo export -p web

Gera a pasta `dist` (cerca de 5 MB, uma página por tela; não precisa de regra de redirecionamento). O endereço da API entra
nos arquivos na hora do build: rode com `EXPO_PUBLIC_API_URL=https://endereco-da-api` definido. Fora do modo de
desenvolvimento o aplicativo exige HTTPS para a API.

Para funcionar na internet são necessários:

- os arquivos de `dist` num serviço de hospedagem de páginas (EAS Hosting, Netlify, Vercel, GitHub Pages, Cloudflare Pages…);
- a API num servidor com HTTPS, com `WEB_ORIGINS` igual ao endereço onde as páginas ficaram (sem barra no fim);
- o banco PostgreSQL acessível só pela API, com as migrações aplicadas e dados fictícios para a demonstração.

## API: CORS

`services/api/src/cors.ts`. Só as origens listadas em `WEB_ORIGINS` (separadas por vírgula, sem curinga nem caminho) recebem
`Access-Control-Allow-Origin`. A consulta prévia do navegador (`OPTIONS`) é respondida antes da trava de sessão, com os
métodos e os cabeçalhos `Authorization` e `Content-Type`. Não há cookies: o token segue no cabeçalho `Authorization`.
Testes em `tests/cors.test.ts` (no `npm run test:unit`).
