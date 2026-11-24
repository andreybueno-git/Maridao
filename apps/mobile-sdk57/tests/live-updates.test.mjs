import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotices, mergeChat, unreadLabel, POLL_MS } from '../src/lib/live-updates.ts';
const notice=(id,read_at=null)=>({id:String(id),request_id:null,title:'Aviso '+id,created_at:'2026-11-20T12:00:00.000Z',read_at});
const message=(id,mine=false)=>({id:String(id),mine,message:'Mensagem '+id,created_at:'2026-11-20T12:00:00.000Z'});
test('consulta a cada 15 s cabe duas vezes no prazo de 30 s do RNF01.1',()=>{assert.equal(POLL_MS,15000);assert.ok(POLL_MS*2<=30000);});
test('avisos: sem novidade devolve o mesmo objeto (a lista não redesenha)',()=>{
 const old={notifications:[notice(3),notice(2,'2026-11-20T12:05:00.000Z')],hasMore:false,unread:1};
 assert.equal(mergeNotices(old,{notifications:[notice(3),notice(2,'2026-11-20T12:05:00.000Z')],hasMore:false,unread:1}),old);
});
test('avisos: o novo entra no topo, a contagem acompanha e as páginas antigas já carregadas ficam',()=>{
 const old={notifications:[notice(3),notice(2),notice(1)],hasMore:true,unread:3};
 const merged=mergeNotices(old,{notifications:[notice(4),notice(3),notice(2)],hasMore:true,unread:4});
 assert.deepEqual(merged.notifications.map(n=>n.id),['4','3','2','1']);assert.equal(merged.unread,4);assert.equal(merged.hasMore,true);
 assert.equal(merged.notifications[1],old.notifications[0]);
});
test('avisos: leitura feita em outro aparelho marca o aviso e baixa a contagem',()=>{
 const old={notifications:[notice(2),notice(1)],hasMore:false,unread:2};
 const merged=mergeNotices(old,{notifications:[notice(2,'2026-11-20T12:09:00.000Z'),notice(1)],hasMore:false,unread:1});
 assert.equal(merged.notifications[0].read_at,'2026-11-20T12:09:00.000Z');assert.equal(merged.notifications[1],old.notifications[1]);assert.equal(merged.unread,1);
});
test('chat: sem mensagem nova devolve o mesmo objeto e a mesma lista',()=>{
 const old={messages:[message(1),message(2,true)],hasMore:false,canSend:true,counterpart:{removed:false}};
 assert.equal(mergeChat(old,{messages:[message(1),message(2,true)],hasMore:false,canSend:true,counterpart:{removed:false}}),old);
});
test('chat: mensagem nova entra no fim e as anteriores já carregadas continuam na tela',()=>{
 const old={messages:[message(1),message(2),message(3)],hasMore:false,canSend:true};
 const merged=mergeChat(old,{messages:[message(2),message(3),message(4)],hasMore:true,canSend:true});
 assert.deepEqual(merged.messages.map(m=>m.id),['1','2','3','4']);assert.equal(merged.hasMore,false);
 assert.equal(merged.messages[0],old.messages[0]);
});
test('chat: conversa encerrada some com o campo de envio sem mexer nas mensagens',()=>{
 const old={messages:[message(1)],hasMore:false,canSend:true,counterpart:{removed:false}};
 const closed=mergeChat(old,{messages:[message(1)],hasMore:false,canSend:false,counterpart:{removed:false}});
 assert.equal(closed.canSend,false);assert.equal(closed.messages,old.messages);
 assert.equal(mergeChat(old,{messages:[message(1)],hasMore:false,canSend:true,counterpart:{removed:true}}).counterpart.removed,true);
});
test('painel: texto da quantidade de avisos não lidos',()=>{
 assert.equal(unreadLabel(null),'');assert.equal(unreadLabel(0),'');assert.equal(unreadLabel(1),'1 não lida');assert.equal(unreadLabel(12),'12 não lidas');assert.equal(unreadLabel(150),'99+ não lidas');
});
