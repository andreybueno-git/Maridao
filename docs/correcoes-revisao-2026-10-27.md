# Correções da revisão do Maridão

Atualizado em 17/11/2026 conforme escolha da usuária pelo telefone e implementação das funções da equipe.

## Escopo da entrega

Retirar denúncia, bloqueio de contas, validação de documentos e comprovação de identidade dos requisitos funcionais, das dependências e do RNF02.4. Retirar o RNF02.3 de validação documental desta versão. O cadastro continua verificando campos obrigatórios, formato/dígitos e duplicidade; essas verificações não comprovam identidade nem situação cadastral. A criptografia dos dados permanece no RNF02.2.

Verificação de antecedentes criminais e eventual consulta documental ficam em Evoluções futuras, sem requisito obrigatório, selo na interface ou promessa de disponibilidade na entrega. Na defesa, apresentar como possibilidade a estudar; não afirmar equivalência com procedimentos de outras empresas.

## Diagrama de casos de uso

Cliente e Prestador de Serviço especializam Usuário e herdam os casos de uso comuns de acesso, saída e configuração de perfil. O acesso Menu → Configurações é um caminho de navegação descrito nos fluxos, sem seta de herança entre Menu e Configurações. As ações reais de configurações continuam ligadas aos casos de edição/exclusão de perfil e autenticação. Administração é papel restrito de apoio no fluxo alternativo, sem cadastro público de administrador.

## UC06.2 Aceitar proposta

**Responsabilidade:** permitir ao cliente escolher uma proposta pendente e válida da própria solicitação aberta.

**Pré-condição:** cliente autenticado; solicitação própria Aberta; proposta Pendente, vigente e ainda na versão apresentada.

**Pós-condição:** proposta escolhida Aceita, solicitação Aceita — isto é, pedido aceito — e vínculo ao prestador registrado. Somente as demais propostas Pendentes tornam-se Não selecionada; Retirada e Cancelada preservam seu estado. O aceite não representa início nem pagamento.

1. Cliente consulta valor, descrição, prazo e validade e seleciona Aceitar proposta.
2. Sistema exibe confirmação com nome do prestador, valor e consequência para as demais propostas.
3. Cliente confirma o aceite.
4. Sistema bloqueia a solicitação, verifica autoria, estado, validade e versão; altera proposta e solicitação para Aceita, vincula o escolhido e atualiza as demais Pendentes, na mesma transação.
5. Sistema confirma o resultado gravado. Cliente e prestador consultam o pedido aceito.

**Alternativas:** cancelar confirmação não altera dados; proposta vencida, retirada, cancelada ou alterada exige nova consulta; conta indevida não acessa o pedido. Falha de gravação reverte todas as alterações. Repetição da mesma confirmação não cria outro aceite.

## RF07.3 e UC07.3 Concluir atendimento

**Requisito:** permitir ao prestador escolhido registrar a conclusão somente com confirmação do cliente por código formado pelos quatro últimos dígitos do telefone cadastrado do cliente, autorizado por ele para a solicitação após conferir o serviço.

**Atores:** cliente e prestador escolhido; administração como apoio nos fluxos alternativos.

**Pré-condição:** solicitação Em andamento, proposta escolhida vinculada e ausência de atendimento de suporte em aberto.

**Pós-condição de sucesso:** solicitação Concluída, horário de conclusão e registro de confirmação persistidos, autorização consumida e avaliação habilitada ao cliente. O prestador não pode concluir somente confirmando uma caixa de diálogo.

1. Cliente confere que o serviço foi realizado e abre os detalhes do atendimento.
2. Cliente seleciona Autorizar conclusão, após aviso de que só deve compartilhá-lo quando concordar com a conclusão.
3. Sistema ativa por dez minutos uma autorização vinculada à solicitação, usando os quatro últimos dígitos do telefone cadastrado, com até cinco tentativas. A renovação mantém os mesmos dígitos e reinicia prazo e tentativas; o código não é exclusivo entre pedidos.
4. Cliente entrega o código ao prestador após concordar com o resultado.
5. Prestador escolhido informa o código no atendimento correspondente e confirma.
6. Sistema verifica sessão, vínculo, estado, validade, tentativas e código, bloqueando o pedido durante a operação.
7. Sistema grava Concluída, horário e evento de confirmação na mesma transação, consome a autorização e habilita avaliação.
8. Sistema exibe o resultado real. Avisos seguem a implementação de RF13; não anunciar envio que não ocorreu.

### Alternativas e exceções do UC07.3

**A1 Código inválido:** registrar tentativa, manter Em andamento e informar erro. Ao atingir cinco tentativas, invalidar; somente o cliente pode renovar a autorização. Tentativas não são desfeitas pelo rollback de uma alteração de status.

**A2 Código expirado ou ausente:** não concluir. Cliente pode renovar a autorização, com os mesmos quatro dígitos. Não revelar o código ao prestador em respostas de consulta.

**A3 Cliente discorda da conclusão:** cliente não fornece código e seleciona Relatar problema. Informa Discordo da conclusão e um relato privado. Sistema grava protocolo ligado à solicitação, data/hora e autor; informa que o relato foi registrado para análise. O atendimento permanece Em andamento e a conclusão fica impedida enquanto existir protocolo aberto. Administração analisa informações das partes e registra decisão/justificativa. Se a divergência for resolvida e o serviço tiver ocorrido, cliente pode autorizar novamente a conclusão. Após a conclusão efetiva, pode avaliar e comentar a qualidade nos UC08.1–UC08.3.

**A4 Serviço não realizado:** cliente escolhe Serviço não realizado e descreve o fato no protocolo privado. Não simular Concluída para permitir uma avaliação. Administração analisa o pedido e registra eventual cancelamento, com motivo, horário, responsável e preservação do histórico. Não há reembolso automático, pois o aplicativo não processa pagamentos.

**A5 Falha de rede ou gravação:** não mostrar sucesso antes de confirmar persistência. Consultar o pedido/protocolo antes de repetir. Alterações de conclusão e evento são atômicas; protocolos possuem proteção contra duplicidade em aberto.

**A6 Conta indevida, pedido encerrado ou conflito:** negar operação sem expor dados de outra conta. Prestador não escolhido, pedido sem autorização própria e solicitação Cancelada não podem concluir o atendimento. Dígitos coincidentes não substituem a autorização do cliente para aquele pedido.

## Postura de atendimento e limites do escopo

O Maridão organiza os registros, exige confirmação do cliente para conclusão, disponibiliza avaliações dos serviços realizados e oferece registro e acompanhamento de problemas para análise administrativa. As decisões de atendimento e os cancelamentos ficam rastreáveis. A equipe não executa fisicamente o serviço nem processa pagamentos; isso não elimina os fluxos de suporte definidos. Não prometer garantia de resultado, indenização automática, atendimento 24 horas ou prazo de resposta que a equipe não tenha definido.

## RNF02.4 Rastreabilidade dos eventos do atendimento

Registrar no PostgreSQL os eventos de cancelamento, retirada, confirmação e suporte vinculados aos fluxos existentes. Cada evento contém identificador, solicitação, autor autenticado ou indicação de sistema, data/hora do servidor, ação, estado anterior/novo, motivo e referências necessárias. Alteração de estado e registro do evento pertencem à mesma transação. Não incluir senha, token, código de confirmação, CPF/CNPJ ou conteúdo privado em logs técnicos.

O cancelamento automático registra a referência ao novo pedido que substituiu o anterior. Não apagar a solicitação ou suas propostas para representar cancelamento. Somente pedidos Abertos sem proposta aceita, do mesmo cliente e categoria, são substituídos. Pedidos Aceitos, Em andamento e Concluídos são preservados. Falha na criação do novo pedido reverte cancelamentos e eventos.

Relatos de suporte são privados e distintos de avaliações públicas. A administração tem acesso restrito para tratar protocolos; decisões exigem justificativa. Registros antigos sem log não recebem datas, motivos ou autores inventados. Sua ausência de detalhe é identificada como legado.

## Telas e rastreabilidade

| Tela ou ação | Requisitos e casos de uso | Resultado da conferência do código |
|---|---|---|
| Início e escolha do perfil | RF01/RF02/RF10 | Implementadas; não substituir cadastro/login por selos de verificação |
| Cadastro do cliente | RF01.1, RF10.4 / UC01.1, UC10.4 | Implementado; cidade Palmas e bairro; formato/dígitos não são identidade |
| Cadastro do prestador | RF02.1, RF10.4 / UC02.1, UC10.4 | Implementado; CPF/CNPJ protegido, sem validação documental |
| Entrar e Sair | RF10.1/RF10.2 / UC10.1/UC10.2 | Implementados |
| Recuperar senha | RF10.3 / UC10.3 | Recuperação implementada com expiração, uso único e caixa de e-mail local de teste; envio real depende de integração |
| Menu e Configurações | UC01.2/UC02.2, UC01.3/UC02.3 e RF10 | Tela implementada com edição, troca de senha e encerramento do acesso; exige 011 |
| Profissionais e filtros | RF03 / UC03.1–UC03.3 | Busca, perfil, avaliações e reputação implementados; exigem 011 |
| Nova solicitação | RF04 / UC04.1–UC04.3 | Implementada; preferência de data não é reserva; substituição da mesma categoria preservada |
| Pedidos e propostas | RF05/RF06 / UC05.1–UC06.3 | Consulta, envio e aceite implementados; edição/retirada na branch atual, migração 009 necessária |
| Andamento e conclusão | RF07 / UC07.1–UC07.3 | Início e confirmação por código implementados na branch atual; exigem migração 010 e validação no aparelho |
| Relatar problema e protocolo | UC07.3 A3/A4, RNF02.4 | Registro e consulta de protocolos implementados na branch atual; triagem/resolução restrita pelo banco, sem portal administrativo; exige 010 |
| Avaliação e comentário | RF08/RF12 / UC08.1–UC08.3, UC12.2–UC12.3 | Implementadas nesta revisão; uma avaliação por serviço concluído e cliente proprietário; exige 011 |
| Meu histórico e detalhes | RF09 / UC09.1–UC09.3 | Implementados na branch atual; migração 009 e testes no aparelho pendentes |
| Chat | RF11 / UC11.1–UC11.3 | Implementado para as partes após aceite; mensagens criptografadas, consulta paginada e envio impedido após encerramento; exige 011 |
| Notificações | RF13 / UC13.1–UC13.3 | Implementadas dentro do aplicativo por eventos transacionais do banco; sem push; exige 011 |
| Denúncia, bloqueio e selo documental | Fora do escopo | Retirar de requisitos, diagramas, protótipos e promessa de entrega |

A matriz registra cobertura definida e evidência disponível separadamente; presença de texto ou imagem não comprova implementação. Atualizar diagramas de sequência afetados pelo aceite e pelo código de conclusão. Remover o bloco de protótipo com Nome do Requisito/Nome do Caso de Uso e substituir por referências reais às telas.

## Organização no GitHub Projects

Quadro existente: Maridão — Desenvolvimento, associado ao repositório Maridao. Colunas A fazer, Em andamento e Concluído. Uma tarefa só vai para Concluído com implementação, validação e evidência. Fechamento por exclusão de escopo não significa funcionalidade implementada.

Preservar responsáveis existentes: Rayane (#1/#10/#12), Felipe (#4/#11), Pedro (#5/#9 e documentação), Kaio (#6/#8), Gabriel (#3/#7/#13), Andrey (#2/#14). #21 passa a exigir código do cliente e fluxo alternativo; #15 sai da entrega atual. Revisão documental registrada em #22. Definir responsável de implementação dos protocolos antes de iniciar, sem atribuição fictícia.

A ausência do prestador pode ser relatada em Aceita, mesmo sem início. A análise administrativa bloqueia início e conclusão enquanto aberta. O cancelamento preserva started_at nulo quando o serviço não começou.
