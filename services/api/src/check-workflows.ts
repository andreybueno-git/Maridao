import {createDatabasePool} from './database.ts';
const pool=createDatabasePool();
try{
 const required={proposals:['version'],service_requests:['completion_code_hash'],accounts:['disabled_at','email_verified_at'],service_reviews:['rating'],chat_messages:['ciphertext'],notifications:['read_at'],account_challenges:['token_hash']};
 const rows=(await pool.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='maridao'")).rows;
 const missing=Object.entries(required).flatMap(([table,columns])=>columns.filter(column=>!rows.some(r=>r.table_name===table&&r.column_name===column)).map(column=>`${table}.${column}`));
 if(missing.length){console.error('Ativação pendente: aplique as migrações 009, 010 e 011 como postgres. Campos ausentes: '+missing.join(', '));process.exitCode=1;}
 else console.log('Estrutura das funções da equipe disponível.');
 console.log(/^([a-f0-9]{64})$/.test(process.env.CHAT_ENCRYPTION_KEY??'')?'Chave do chat configurada.':'Configure CHAT_ENCRYPTION_KEY com 32 bytes aleatórios em hexadecimal.');
 console.log(process.env.MAIL_MODE==='local'&&process.env.NODE_ENV!=='production'?'E-mail em modo de teste local.':'Envio de e-mail não configurado.');
}catch{console.error('Não foi possível verificar a estrutura. Confira a conexão com PostgreSQL.');process.exitCode=1;}finally{await pool.end();}
