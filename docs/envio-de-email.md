# Envio de e-mail

Revisão de 24/11/2026. Atende o RF10.3 (recuperação de senha por e-mail) e serve também à confirmação de e-mail. Não exige migração. Usa a biblioteca nodemailer (dependência da API).

## Modos

A variável MAIL_MODE, no .env da API, escolhe como o código é entregue.

| MAIL_MODE | O que acontece | Onde vale |
| --- | --- | --- |
| local | A mensagem é gravada em services/api/.local-mail/ (ignorada pelo Git). Nenhum e-mail sai do computador. | Só fora de produção. Com NODE_ENV=production conta como não configurado. |
| smtp | A API envia o e-mail pelo servidor SMTP configurado. | Desenvolvimento e produção. |
| ausente, outro valor ou smtp com dados incompletos | Não há envio. POST /auth/recovery e POST /account/verify-email respondem 503 com code MAIL_NOT_CONFIGURED. | — |

## Variáveis do modo smtp

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| SMTP_HOST | Sim | Endereço do servidor. |
| SMTP_PORT | Não | Padrão 587. De 1 a 65535. |
| SMTP_SECURE | Não | true ou false. Sem valor: true na porta 465, false nas demais. |
| SMTP_REQUIRE_TLS | Não | Padrão true: fora da porta 465 o STARTTLS é obrigatório. false só é aceito fora de produção (servidor de teste na própria máquina). |
| SMTP_USER e SMTP_PASSWORD | Os dois ou nenhum | Credenciais do provedor. Ficam só no .env, nunca no Git. |
| MAIL_FROM | Sim | Remetente: "nome <endereco>" ou só o endereço. |

Se alguma variável obrigatória falta ou é inválida, o modo passa a não configurado. npm run db:workflows informa o modo em uso.

## Comportamento

- A mensagem é texto simples em português, sem link: traz o código de 64 caracteres, a validade de 15 minutos e o aviso para ignorar se o pedido não foi da pessoa. O código continua sendo digitado no aplicativo.
- Só o hash do código fica no banco. O código não aparece na resposta da API nem no registro do servidor.
- Recuperação de senha (sem sessão): a resposta é a mesma exista ou não a conta. Se o servidor de e-mail falhar, a API registra a falha (sem destinatário e sem código) e mantém a mesma resposta, para não revelar quais e-mails têm conta.
- Confirmação de e-mail (com sessão): se o envio falhar, a API responde 502 com code MAIL_DELIVERY_FAILED e a pessoa pode pedir de novo.
- GET /auth/recovery, sem sessão, devolve só {mailMode}. GET /account devolve o mesmo campo. As telas Recuperar senha e Configurações usam esse valor: no modo smtp dizem que o código vai para o e-mail da conta; no modo local avisam que é teste; sem envio configurado, a tela Recuperar senha explica e desativa o botão.

## Limites

- Nenhum provedor de e-mail foi contratado nem configurado: o repositório traz só o código, o .env.example e esta documentação. O envio para uma caixa de e-mail real não foi conferido.
- Na recuperação, o envio é aguardado antes da resposta; o tempo de resposta pode ser maior quando a conta existe.
- Não há fila nem nova tentativa automática. Se o envio falhar, a pessoa solicita outro código.
- O limite de pedidos é o mesmo das demais rotas de cadastro (registrationLimit).

## Verificação

Em services/api: tests/mail.test.ts (parte de npm run test:unit) confere os modos, a leitura das variáveis, o texto da mensagem, o envio e a falha de envio com transporte falso, sem rede. npm run test:team:db continua cobrindo o fluxo completo no banco em modo local. Em apps/mobile-sdk57: npm run test:mail confere os textos das telas.
