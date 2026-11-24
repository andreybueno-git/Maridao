import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createTransport} from 'nodemailer';
// RF10.3: envio do código de recuperação de senha e de confirmação de e-mail.
// MAIL_MODE=local grava a mensagem em .local-mail/ (só fora de produção); MAIL_MODE=smtp envia pelo servidor configurado.
export type Purpose='password_reset'|'verify_email';
export type Mail={to:string;purpose:Purpose;token:string;expiresInMinutes:number};
export type MailMode='local'|'smtp'|'unconfigured';
export type SmtpConfig={host:string;port:number;secure:boolean;requireTLS:boolean;user?:string;password?:string;from:string};
type Env=Record<string,string|undefined>;
const flag=(value:string|undefined)=>value===undefined||value===''?undefined:value==='true'?true:value==='false'?false:null;
// Lê SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_REQUIRE_TLS, SMTP_USER, SMTP_PASSWORD e MAIL_FROM. Devolve null se algo falta ou é inválido.
// Porta 465 usa TLS desde a conexão; nas demais o STARTTLS é obrigatório. Só fora de produção SMTP_REQUIRE_TLS=false o dispensa
// (servidor de teste na própria máquina). Usuário e senha vêm juntos ou nenhum dos dois.
export function smtpConfig(env:Env=process.env):SmtpConfig|null{
 const host=env.SMTP_HOST?.trim(),from=env.MAIL_FROM?.trim(),port=env.SMTP_PORT===undefined||env.SMTP_PORT===''?587:Number(env.SMTP_PORT);
 if(!host||/\s/.test(host)||!from||/[\r\n]/.test(from)||!/^[^\s@<>]+@[^\s@<>]+$|^[^<>]*<[^\s@<>]+@[^\s@<>]+>$/.test(from)||!Number.isInteger(port)||port<1||port>65535)return null;
 const secureFlag=flag(env.SMTP_SECURE),tlsFlag=flag(env.SMTP_REQUIRE_TLS);
 if(secureFlag===null||tlsFlag===null)return null;
 const secure=secureFlag??port===465,user=env.SMTP_USER||undefined,password=env.SMTP_PASSWORD||undefined;
 if(Boolean(user)!==Boolean(password))return null;
 const requireTLS=!secure&&(tlsFlag??true);
 if(!secure&&!requireTLS&&env.NODE_ENV==='production')return null;
 return {host,port,secure,requireTLS,...(user?{user,password}:{}),from};
}
export function mailMode(env:Env=process.env):MailMode{
 if(env.MAIL_MODE==='local')return env.NODE_ENV==='production'?'unconfigured':'local';
 if(env.MAIL_MODE==='smtp')return smtpConfig(env)?'smtp':'unconfigured';
 return 'unconfigured';
}
// Texto simples, sem link: o código é digitado no aplicativo.
export function composeMail(mail:Mail){
 const reset=mail.purpose==='password_reset';
 return {subject:reset?'Maridão: código para redefinir sua senha':'Maridão: código para confirmar seu e-mail',
  text:[reset?'Recebemos um pedido para redefinir a senha da sua conta no Maridão.':'Use o código abaixo para confirmar o e-mail da sua conta no Maridão.','',
   reset?'No aplicativo, em Recuperar senha, informe este código:':'No aplicativo, em Configurações, informe este código:','',mail.token,'',
   `O código vale por ${mail.expiresInMinutes} minutos e só pode ser usado uma vez.`,
   reset?'Se você não pediu a troca de senha, ignore esta mensagem: sua senha continua a mesma.':'Se você não pediu esta confirmação, ignore esta mensagem.','',
   'Nunca compartilhe este código. A equipe do Maridão não pede código nem senha.'].join('\n')};
}
export type Message={from:string;to:string;subject:string;text:string};
export type Transport={sendMail(message:Message):Promise<unknown>};
export function smtpTransport(config:SmtpConfig):Transport{
 return createTransport({host:config.host,port:config.port,secure:config.secure,requireTLS:config.requireTLS,...(config.user?{auth:{user:config.user,pass:config.password}}:{}),
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
}
let cached:{key:string;transport:Transport}|undefined;
// `transport` é injetado nos testes (transporte falso, sem rede). Em uso normal a conexão é montada uma vez por configuração.
export async function deliverSmtp(mail:Mail,transport?:Transport,config:SmtpConfig|null=smtpConfig()){
 if(!config)throw new Error('SMTP não configurado.');
 if(!transport){const key=JSON.stringify(config);if(cached?.key!==key)cached={key,transport:smtpTransport(config)};transport=cached.transport;}
 await transport.sendMail({from:config.from,to:mail.to,...composeMail(mail)});
}
export async function deliverLocal(mail:Mail){const directory=new URL('../.local-mail/',import.meta.url);await mkdir(directory,{recursive:true,mode:0o700});await writeFile(new URL(randomBytes(16).toString('hex')+'.json',directory),JSON.stringify(mail,null,2),{mode:0o600,flag:'wx'});}
