// RNF01.1: avisos e mensagens chegam em até 30 s. As telas consultam a API a cada 15 s (ver src/hooks/use-polling.ts) e
// juntam a resposta ao que já está na tela com as funções abaixo. Quando nada mudou elas devolvem o MESMO objeto, para a
// tela não redesenhar (a lista não pisca e nada do que a pessoa está digitando é tocado).
export const POLL_MS=15000;
export type Notice={id:string;request_id:string|null;title:string;created_at:string;read_at:string|null};
export type NoticeData={notifications:Notice[];hasMore:boolean;unread:number};
// `next` é sempre a primeira página (os 30 avisos mais recentes). Avisos novos entram no topo; os que já estavam na tela
// ficam onde estão (inclusive páginas antigas já carregadas) e só recebem a marca de lido.
export function mergeNotices(old:NoticeData,next:NoticeData):NoticeData{
 const shown=new Map(old.notifications.map(item=>[item.id,item])),latest=new Map(next.notifications.map(item=>[item.id,item]));
 const added=next.notifications.filter(item=>!shown.has(item.id));
 const reread=old.notifications.some(item=>latest.has(item.id)&&latest.get(item.id)!.read_at!==item.read_at);
 if(!added.length&&!reread&&old.unread===next.unread)return old;
 return {...old,unread:next.unread,notifications:!added.length&&!reread?old.notifications:[...added,...old.notifications.map(item=>{const now=latest.get(item.id);return now&&now.read_at!==item.read_at?{...item,read_at:now.read_at}:item;})]};
}
export type ChatMessage={id:string;mine:boolean;message:string;created_at:string};
export type ChatData<C extends {removed?:boolean}|undefined={removed?:boolean}|undefined>={messages:ChatMessage[];hasMore:boolean;canSend:boolean;counterpart?:C};
// `next` traz as 50 mensagens mais recentes. As que ainda não estão na tela entram no fim; as antigas já carregadas ficam.
// Se a conversa foi encerrada (ou o cliente excluiu a conta), o campo de envio some na mesma atualização.
export function mergeChat<T extends ChatData>(old:T,next:T):T{
 const shown=new Set(old.messages.map(item=>item.id)),added=next.messages.filter(item=>!shown.has(item.id));
 const closed=old.canSend!==next.canSend||(old.counterpart?.removed===true)!==(next.counterpart?.removed===true);
 if(!added.length&&!closed)return old;
 return {...old,canSend:next.canSend,counterpart:next.counterpart,messages:added.length?[...old.messages,...added]:old.messages};
}
// Texto do painel inicial. Sem contagem ainda (primeira carga ou falha de rede) nada é mostrado.
export const unreadLabel=(count:number|null|undefined)=>!count||count<1?'':count===1?'1 não lida':count>99?'99+ não lidas':`${count} não lidas`;
