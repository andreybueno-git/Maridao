import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {composeMail,deliverSmtp,mailMode,smtpConfig,type Mail,type Message} from '../src/mail.ts';
import {requestChallenge} from '../src/account-management.ts';
import {tokenHash,type Profile} from '../src/auth.ts';
import {WorkflowError} from '../src/workflow-error.ts';

// Nenhum teste abre conexão: o transporte e o banco são falsos.
const smtp={MAIL_MODE:'smtp',SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'587',SMTP_USER:'usuario',SMTP_PASSWORD:'segredo-ficticio',MAIL_FROM:'Maridão <nao-responda@example.invalid>'};
const token='a'.repeat(64),mail:Mail={to:'cliente@example.invalid',purpose:'password_reset',token,expiresInMinutes:15};
function fakeTransport(fail=false){const sent:Message[]=[];return {sent,sendMail:async(message:Message)=>{if(fail)throw new Error('ECONNREFUSED');sent.push(message);return {messageId:'ficticio'};}};}
function fakeDb(account?:{id:string;email:string}){
 const commands:string[]=[],stored:unknown[][]=[];
 const db={query:async(sql:string,values?:unknown[])=>{commands.push(sql.split(' ')[0]!);if(sql.startsWith('SELECT id,email'))return {rows:account&&values?.[0]===account.email?[account]:[]};if(sql.startsWith('INSERT INTO maridao.account_challenges'))stored.push(values??[]);return {rows:[]};}} as unknown as Pick<PoolClient,'query'>;
 return {db,commands,stored};
}
test('MAIL_MODE: local só fora de produção, smtp só com a configuração completa',()=>{
 assert.equal(mailMode({}),'unconfigured');assert.equal(mailMode({MAIL_MODE:'outro'}),'unconfigured');
 assert.equal(mailMode({MAIL_MODE:'local'}),'local');assert.equal(mailMode({MAIL_MODE:'local',NODE_ENV:'production'}),'unconfigured');
 assert.equal(mailMode(smtp),'smtp');assert.equal(mailMode({...smtp,NODE_ENV:'production'}),'smtp');
 assert.equal(mailMode({MAIL_MODE:'smtp'}),'unconfigured');
 for(const missing of ['SMTP_HOST','MAIL_FROM'])assert.equal(mailMode({...smtp,[missing]:''}),'unconfigured');
});
test('configuração SMTP: porta, TLS obrigatório, credenciais em par e remetente válido',()=>{
 assert.deepEqual(smtpConfig(smtp),{host:'smtp.example.invalid',port:587,secure:false,requireTLS:true,user:'usuario',password:'segredo-ficticio',from:'Maridão <nao-responda@example.invalid>'});
 assert.deepEqual(smtpConfig({...smtp,SMTP_PORT:'465'}),{...smtpConfig(smtp)!,port:465,secure:true,requireTLS:false});
 assert.equal(smtpConfig({...smtp,SMTP_PORT:undefined})?.port,587);
 const open=smtpConfig({SMTP_HOST:'127.0.0.1',SMTP_PORT:'1025',SMTP_REQUIRE_TLS:'false',MAIL_FROM:'teste@example.invalid'});
 assert.deepEqual(open,{host:'127.0.0.1',port:1025,secure:false,requireTLS:false,from:'teste@example.invalid'});
 // Em produção não existe envio sem TLS.
 assert.equal(smtpConfig({...smtp,SMTP_REQUIRE_TLS:'false',NODE_ENV:'production'}),null);
 for(const bad of [{SMTP_PORT:'0'},{SMTP_PORT:'70000'},{SMTP_PORT:'abc'},{SMTP_SECURE:'sim'},{SMTP_REQUIRE_TLS:'nao'},{SMTP_PASSWORD:''},{SMTP_USER:''},{MAIL_FROM:'sem-arroba'},{MAIL_FROM:'a@example.invalid\r\nBcc: outro@example.invalid'},{SMTP_HOST:'host com espaco'}])assert.equal(smtpConfig({...smtp,...bad}),null,JSON.stringify(bad));
});
test('mensagem: assunto e texto em português, com o código e a validade, sem link',()=>{
 const reset=composeMail(mail),verify=composeMail({...mail,purpose:'verify_email'});
 assert.equal(reset.subject,'Maridão: código para redefinir sua senha');assert.equal(verify.subject,'Maridão: código para confirmar seu e-mail');
 for(const message of [reset,verify]){assert.ok(message.text.includes(token));assert.match(message.text,/vale por 15 minutos/);assert.ok(!/https?:\/\//.test(message.text));}
 assert.match(reset.text,/Se você não pediu a troca de senha, ignore esta mensagem/);
});
test('envio por SMTP usa o remetente configurado e o destinatário da conta (transporte falso)',async()=>{
 const transport=fakeTransport();
 await deliverSmtp(mail,transport,smtpConfig(smtp));
 assert.deepEqual(transport.sent,[{from:'Maridão <nao-responda@example.invalid>',to:'cliente@example.invalid',...composeMail(mail)}]);
 await assert.rejects(()=>deliverSmtp(mail,transport,null),/SMTP não configurado/);assert.equal(transport.sent.length,1);
});
test('recuperação em modo smtp: grava só o hash, envia o código e responde igual para conta inexistente',async()=>{
 const account={id:'conta-ficticia',email:'cliente@example.invalid'},transport=fakeTransport(),deliver=(m:Mail)=>deliverSmtp(m,transport,smtpConfig(smtp));
 const known=fakeDb(account),answer=await requestChallenge(known.db,{email:' Cliente@Example.invalid '},'password_reset',undefined,deliver,'smtp');
 assert.deepEqual(answer,{message:'Se houver uma conta ativa com este e-mail, o código foi enviado. Confira também a caixa de spam.',delivery:'smtp'});
 assert.deepEqual(known.commands,['BEGIN','SELECT','INSERT','COMMIT']);assert.equal(transport.sent.length,1);assert.equal(transport.sent[0]!.to,account.email);
 const code=transport.sent[0]!.text.match(/\b[a-f0-9]{64}\b/)?.[0];assert.ok(code);
 assert.deepEqual(known.stored[0],[account.id,'password_reset',tokenHash(code)]);assert.ok(!JSON.stringify(answer).includes(code));
 const unknown=fakeDb(account);
 assert.deepEqual(await requestChallenge(unknown.db,{email:'ninguem@example.invalid'},'password_reset',undefined,deliver,'smtp'),answer);
 assert.deepEqual(unknown.commands,['BEGIN','SELECT','COMMIT']);assert.equal(transport.sent.length,1);
});
test('falha do servidor de e-mail: recuperação não revela a conta; confirmação de e-mail avisa; o código não vai para o registro',async()=>{
 const account={id:'conta-ficticia',email:'cliente@example.invalid'},broken=fakeTransport(true),deliver=(m:Mail)=>deliverSmtp(m,broken,smtpConfig(smtp));
 const logged:string[]=[],original=console.error;console.error=(...parts:unknown[])=>{logged.push(parts.join(' '));};
 try{
  const answer=await requestChallenge(fakeDb(account).db,{email:account.email},'password_reset',undefined,deliver,'smtp');
  assert.equal(answer.delivery,'smtp');assert.match(answer.message,/^Se houver uma conta ativa/);
  await assert.rejects(()=>requestChallenge(fakeDb(account).db,{},'verify_email',{id:account.id,email:account.email} as Profile,deliver,'smtp'),(e:unknown)=>e instanceof WorkflowError&&e.status===502&&e.details?.code==='MAIL_DELIVERY_FAILED');
 }finally{console.error=original;}
 assert.equal(logged.length,2);for(const line of logged){assert.match(line,/Falha no envio de e-mail/);assert.ok(!/[a-f0-9]{64}/.test(line));assert.ok(!line.includes(account.email));}
});
test('sem envio configurado a API responde 503 antes de consultar o banco; modo local mantém a resposta de teste',async()=>{
 const off=fakeDb();
 await assert.rejects(()=>requestChallenge(off.db,{email:'cliente@example.invalid'},'password_reset',undefined,undefined,'unconfigured'),(e:unknown)=>e instanceof WorkflowError&&e.status===503&&e.details?.code==='MAIL_NOT_CONFIGURED');assert.equal(off.commands.length,0);
 const local:Mail[]=[];
 assert.deepEqual(await requestChallenge(fakeDb({id:'c',email:'cliente@example.invalid'}).db,{email:'cliente@example.invalid'},'password_reset',undefined,async m=>{local.push(m);},'local'),{message:'Se houver uma conta ativa, as instruções estarão na caixa de e-mail de teste.',delivery:'local'});
 assert.equal(local.length,1);assert.equal(local[0]!.expiresInMinutes,15);
});
