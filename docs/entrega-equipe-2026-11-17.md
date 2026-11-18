# Entrega das funções da equipe do Maridão

Revisão de 17 de novembro de 2026. A usuária autorizou implementar também as partes originalmente divididas entre os integrantes. O código foi ampliado; ativação no banco principal e teste no iPhone permanecem etapas separadas.

## Cobertura da entrega acadêmica

| Função | Requisitos e casos de uso | Implementação atual |
|---|---|---|
| Cadastro e acesso de cliente e prestador | RF01, RF02 e RF10 | Cadastro, login e saída já existentes; sessões agora recusam conta encerrada e troca de senha concorrente. |
| Menu e configurações | UC01.2, UC02.2, UC01.3 e UC02.3 | Edição de nome, telefone e local; prestador também edita categorias, especialidades e disponibilidade. Exige senha atual. |
| Encerramento voluntário da conta | UC01.3 e UC02.3 | Revoga sessões e retira a conta das buscas; preserva registros. Impede encerramento com serviço aceito ou em andamento. Cancela pedidos abertos e retira propostas pendentes em transação, com eventos. Não equivale a apagar todos os dados pessoais. |
| Recuperação de senha e confirmação do e-mail | UC10.3 e RNF de autenticação | Caixa de saída local, token de 256 bits, resumo no banco, 15 minutos, cinco tentativas e uso único. Redefinição revoga sessões. Resposta neutra para e-mail desconhecido. Envio externo não configurado. |
| Busca e perfil profissional | RF03 e RF12 | Informações profissionais, média real e total de avaliações; comentários paginados. Sem CPF, telefone ou e-mail público. |
| Solicitações e substituição | RF04 | Novo pedido cancela somente Abertos da mesma categoria e cliente, sem proposta aceita. Histórico e evento preservados. |
| Propostas | RF05 e RF06 | Enviar, editar, retirar e aceitar com versão, valor e prazo conferidos. Aceite altera a solicitação para Aceita e vincula o prestador. |
| Atendimento e conclusão | RF07 e UC07.3 | Iniciar, autorizar a conclusão pelo cliente e validar quatro últimos dígitos do telefone pelo prestador escolhido. |
| Divergência ou não realização | UC07.3 alternativos e RNF02.4 | Protocolo privado em Aceita ou Em andamento, bloqueando início e conclusão. Administração resolve/cancela via função restrita no banco. Não existe portal administrativo. |
| Avaliação pública | RF08 | Uma nota inteira de 1 a 5 e comentário opcional de até 1000 caracteres por pedido concluído, somente pelo cliente proprietário. Não avaliar ausência como serviço concluído. |
| Histórico | RF09 | Cliente consulta seus pedidos; prestador consulta sua participação, preservando propostas retiradas e canceladas. |
| Chat | RF11 | Liberado às duas partes do pedido após aceite. Mensagens de até 2000 caracteres criptografadas com AES-256-GCM e vinculadas ao pedido. Paginação, atualização manual e repetição de envio com mesmo identificador sem duplicação. Encerrados são somente leitura. |
| Notificações | RF13 | Avisos internos persistidos na mesma transação de novas propostas, edição/alteração de propostas, andamento e mensagens. Marcação individual como lida e paginação. Sem push, SMS ou e-mail externo. |

## Confirmação pelos últimos quatro dígitos

1. O prestador escolhido inicia o atendimento aceito.
2. Depois de conferir o serviço, o cliente seleciona **Autorizar conclusão** e confirma o aviso.
3. O servidor ativa a autorização do pedido por dez minutos, com até cinco tentativas. O código corresponde aos quatro últimos dígitos do telefone cadastrado do cliente, incluindo zero inicial.
4. O cliente informa os dígitos ao prestador; eles não são incluídos nas respostas de consulta do prestador.
5. O prestador digita o código. O servidor confere sessão, vínculo, pedido Em andamento, autorização, prazo, tentativas e ausência de protocolo aberto.
6. O servidor conclui, registra horário/evento e consome a autorização em transação. A avaliação fica disponível.

Os quatro dígitos podem coincidir entre pessoas e pedidos. Renovar autorização não muda os dígitos. A proteção contra conclusão unilateral depende da autorização explícita para aquele pedido; conhecer o telefone sozinho não autoriza concluir. Editar o perfil do cliente invalida autorizações ativas. O suporte pode ser aberto antes do início para registrar não comparecimento.

## Ativação local

Os cadastros existentes não foram usados nos testes. Os cenários integrados criam tabelas temporárias e descartam tudo ao final.

No terminal da API:

```powershell
cd C:\Users\rayan\Documents\Codex\maridao\services\api
npm run db:activate
npm run db:workflows
npm run dev
```

A ativação solicita a senha de `postgres` no terminal; não enviar essa senha pelo chat. O programa encontra o SQL Shell instalado e aplica 009, 010 e 011 na ordem. A senha do usuário limitado da API não substitui a senha administrativa.

`CHAT_ENCRYPTION_KEY` foi configurada apenas no arquivo local ignorado pelo Git. Em outra máquina, gerar uma chave própria de 32 bytes em hexadecimal; preservar a chave dos dados já gravados. `MAIL_MODE=local` grava arquivos em `services/api/.local-mail/`, também ignorados pelo Git. Eles contêm códigos de teste e devem ser tratados como credenciais temporárias. O modo local é recusado em produção.

No terminal do aplicativo:

```powershell
cd C:\Users\rayan\Documents\Codex\maridao\apps\mobile-sdk57
npx expo start --clear
```

A configuração local foi ajustada para o IP do Wi-Fi encontrado em 17/11/2026, `192.168.0.69`. Se mudar de rede, atualizar HOST da API e EXPO_PUBLIC_API_URL do aplicativo.

## Percurso de conferência no aparelho

- Cliente cria um pedido e prestador compatível envia proposta.
- Prestador edita a proposta; cliente atualiza e aceita a versão atual.
- Ambos abrem a conversa pelo atendimento e trocam mensagens; terceiro não acessa.
- Prestador inicia; cliente autoriza conclusão; código incorreto não conclui e o correto conclui.
- Cliente publica avaliação uma única vez; ela aparece no perfil e altera a média.
- Ambos consultam notificações, marcam como lidas e consultam histórico.
- Cliente registra ausência em outro pedido Aceita; prestador fica impedido de iniciar enquanto o protocolo estiver aberto.
- Administração verifica e resolve/cancela o protocolo pela função restrita, preservando histórico.
- Usuário edita o perfil e testa senha incorreta, troca de senha e recuperação na caixa local.
- Conta sem atendimento ativo encerra acesso e perde suas sessões; conta com serviço ativo recebe impedimento.

## Evidências e limites

Testes: 61 verificações unitárias da API, integração PostgreSQL temporária dos módulos da equipe, regressão PostgreSQL de propostas/histórico/confirmacão e três testes do aplicativo. TypeScript da API e do aplicativo e lint global do aplicativo passaram; geração iOS com as novas telas também passou. Novas correções devem repetir as verificações afetadas antes do commit.

A ativação com privilégios reais, teste simultâneo entre conexões, navegação visual no iPhone e exercício do suporte com operador são verificações finais; não foram substituídos por testes de unidade. O Word completo da revisão anterior ainda precisa da conferência final e de incorporar a decisão do telefone; este arquivo é a especificação vigente do código.

Para implantação pública ainda será necessário envio real de e-mail, HTTPS, política de retenção/anonimização, proteção do CPF do cliente, backups/restauração e revisão de dependências. Entrar com Google requer projeto e credenciais próprias. Esses itens não são equivalentes ao modo local de teste.

## Organização no Kanban

Preservar as responsabilidades de origem: Rayane (#1/#10/#12), Felipe (#4/#11), Pedro (#5/#9 e documentação), Kaio (#6/#8), Gabriel (#3/#7/#13), Andrey (#2/#14). A confirmação está em #21 e a revisão documental em #22. Tratar as implementações novas como Em andamento até ativação e validação, sem marcar Concluído só por existir código.

Denúncia, bloqueio administrativo, validação documental e antecedentes criminais permanecem fora da entrega atual; antecedentes podem ser apresentados como evolução futura.
