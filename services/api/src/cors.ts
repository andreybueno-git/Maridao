import type {RequestHandler} from 'express';
// Versão web do aplicativo (navegador): só as origens listadas em WEB_ORIGINS recebem os cabeçalhos de CORS.
// Sem a variável nada muda; o aplicativo nativo não usa CORS. O token segue no cabeçalho Authorization (sem cookies).
export const webOrigins=(value=process.env.WEB_ORIGINS??'')=>value.split(',').map(item=>item.trim().replace(/\/+$/,'')).filter(item=>/^https?:\/\/[^/*\s]+$/.test(item));
export const cors=(allowed=webOrigins()):RequestHandler=>(request,response,next)=>{
 const origin=request.get('Origin');
 if(!origin||!allowed.includes(origin)){next();return;}
 response.vary('Origin');response.set('Access-Control-Allow-Origin',origin);
 if(request.method!=='OPTIONS'||!request.get('Access-Control-Request-Method')){next();return;}
 response.set('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE');response.set('Access-Control-Allow-Headers','Authorization, Content-Type');response.set('Access-Control-Max-Age','600');response.status(204).end();
};
