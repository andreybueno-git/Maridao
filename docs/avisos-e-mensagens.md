# Entrega de avisos e mensagens

Revisão de 24/11/2026. Atende o RNF01.1 (avisos e mensagens entregues em até 30 segundos) com o aplicativo aberto. Não exige migração nem rota nova.

## Como funciona

O aplicativo consulta a API a cada 15 segundos enquanto a tela está aberta e em foco. Como o aviso e a mensagem são gravados no banco na mesma transação da ação que os gera, o pior caso é de 15 segundos mais o tempo da resposta.

| Tela | Arquivo em apps/mobile-sdk57/src | Consulta | O que muda na tela |
| --- | --- | --- | --- |
| Notificações | app/notificacoes.tsx | GET /notifications | Aviso novo entra no topo; a contagem de não lidas acompanha; aviso lido em outro aparelho perde a marca. |
| Conversa do atendimento | app/chat.tsx | GET /requests/:id/messages | Mensagem nova entra no fim, com a animação de chegada, e a tela rola até ela. Se o atendimento foi encerrado, o campo de envio dá lugar ao aviso de leitura. |
| Início (painel) | app/(abas)/minha-conta.tsx e components/customer-dashboard.tsx | GET /notifications | O cartão Notificações mostra "N não lidas" (acima de 99, "99+ não lidas"). Sem aviso pendente, nada aparece. |

## Regras

- A consulta para ao sair da tela e quando o aplicativo vai para segundo plano. Ao voltar ao primeiro plano, consulta na hora e retoma os 15 segundos (hooks/use-polling.ts).
- A consulta é silenciosa: não mostra "Aguarde…", não trava botões nem o campo de mensagem e não mexe no texto que está sendo digitado.
- A resposta é juntada ao que já está na tela (lib/live-updates.ts). Quando nada mudou, a tela não é redesenhada, por isso a lista não pisca. Páginas antigas já carregadas ("Carregar avisos anteriores", "Carregar mensagens anteriores") continuam na tela.
- Falha de rede em uma consulta é ignorada: a tela fica como estava e a próxima consulta tenta de novo. Sessão expirada (401) encerra o acesso, como nas demais telas.
- Uma operação da própria pessoa (enviar mensagem, marcar como lida) descarta a consulta que estava em andamento, para a resposta antiga não sobrescrever o resultado da operação.
- Puxar para atualizar continua disponível.

## Limites

- Com o aplicativo fechado ou em segundo plano nada é entregue: não há push, SMS nem e-mail de aviso. Ver docs/proximas-etapas.md.
- As demais telas (lista de pedidos, propostas, histórico) continuam atualizando ao abrir, ao voltar à tela e ao puxar.
- Não há WebSocket; o intervalo de 15 segundos é fixo (POLL_MS).

## Verificação

Em apps/mobile-sdk57: npm run test:live (junção das respostas, contagem e intervalo), além de npx tsc --noEmit e npm run lint.
