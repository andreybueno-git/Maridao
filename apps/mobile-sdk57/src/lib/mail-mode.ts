// RF10.3: como o código de recuperação/confirmação é entregue, conforme o MAIL_MODE da API (GET /auth/recovery e GET /account).
export type MailMode='local'|'smtp'|'unconfigured';
export const asMailMode=(value:unknown):MailMode|null=>value==='local'||value==='smtp'||value==='unconfigured'?value:null;
// null: o modo ainda não chegou (ou a consulta falhou); a tela não afirma nada sobre o envio e deixa a API responder.
export function recoveryNote(mode:MailMode|null){
 return mode==='smtp'?'Enviaremos um código para o e-mail da conta. Ele vale por 15 minutos. Confira também a caixa de spam.'
  :mode==='local'?'Nesta versão de teste, o e-mail fica na caixa de saída local do computador. Nenhuma mensagem é enviada para uma caixa de e-mail real.'
  :mode==='unconfigured'?'O envio de e-mail não está configurado neste servidor, por isso a recuperação de senha está indisponível. Procure a administração.'
  :'Informe o e-mail da conta para receber o código de recuperação.';
}
export function verifyNote(mode:MailMode|null){
 return mode==='smtp'?'O código de confirmação é enviado para o seu e-mail e vale por 15 minutos.'
  :mode==='local'?'Modo de teste: as instruções são gravadas na caixa de saída local do computador.'
  :'O envio de e-mail precisa ser configurado.';
}
export const codeLabel=(mode:MailMode|null)=>mode==='local'?'Código recebido no e-mail de teste':'Código recebido por e-mail';
// Só o modo "unconfigured" confirmado bloqueia o pedido; sem resposta, a pessoa pode tentar e a API decide.
export const canRequestCode=(mode:MailMode|null)=>mode!=='unconfigured';
