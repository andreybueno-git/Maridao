import type {RequestHandler} from 'express';
const windows=new Map<string,{count:number;until:number}>();
export const chatLimit:RequestHandler=(req,res,next)=>{
 const now=Date.now();for(const [key,value] of windows)if(value.until<=now)windows.delete(key);
 const key=req.ip??'unknown',window=windows.get(key)??{count:0,until:now+60_000};
 if(window.count>=30||windows.size>=10000&&!windows.has(key)){res.set('Retry-After',String(Math.max(1,Math.ceil((window.until-now)/1000))));res.status(429).json({error:'Muitas mensagens. Aguarde um minuto.'});return;}
 window.count++;windows.set(key,window);next();
};
