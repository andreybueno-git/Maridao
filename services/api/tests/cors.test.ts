import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Request,Response} from 'express';
import {cors,webOrigins} from '../src/cors.ts';

const site='https://demo.example.invalid';
function call(method:string,headers:Record<string,string>,allowed=[site]){
 const sent:Record<string,string>={};let status=0,ended=false,passed=false;
 const request={method,get:(name:string)=>headers[name]} as unknown as Request;
 const response={vary:(name:string)=>{sent.Vary=name;return response;},set:(name:string,value:string)=>{sent[name]=value;return response;},status:(code:number)=>{status=code;return response;},end:()=>{ended=true;}} as unknown as Response;
 cors(allowed)(request,response,()=>{passed=true;});
 return {sent,status,ended,passed};
}
test('WEB_ORIGINS: lista separada por vírgula, sem barra final; curinga e caminho são descartados',()=>{
 assert.deepEqual(webOrigins(''),[]);
 assert.deepEqual(webOrigins(` ${site}/ , http://localhost:8085,*,https://a.example.invalid/caminho,texto`),[site,'http://localhost:8085']);
});
test('sem Origin ou com origem fora da lista a resposta segue sem cabeçalho de CORS',()=>{
 for(const headers of [{},{Origin:'https://outro.example.invalid'}] as Record<string,string>[]){const result=call('GET',headers);assert.equal(result.passed,true);assert.deepEqual(result.sent,{});}
 assert.deepEqual(call('GET',{Origin:site},[]).sent,{});
});
test('origem permitida: a resposta leva a origem exata e Vary; a rota continua',()=>{
 const result=call('POST',{Origin:site});
 assert.equal(result.passed,true);assert.deepEqual(result.sent,{Vary:'Origin','Access-Control-Allow-Origin':site});
});
test('consulta prévia (OPTIONS) de origem permitida termina em 204 com métodos e cabeçalhos; sem ela, OPTIONS segue para as rotas',()=>{
 const result=call('OPTIONS',{Origin:site,'Access-Control-Request-Method':'POST'});
 assert.equal(result.passed,false);assert.equal(result.status,204);assert.equal(result.ended,true);
 assert.equal(result.sent['Access-Control-Allow-Headers'],'Authorization, Content-Type');assert.match(result.sent['Access-Control-Allow-Methods']!,/POST/);
 assert.equal(call('OPTIONS',{Origin:site}).passed,true);
 assert.equal(call('OPTIONS',{Origin:'https://outro.example.invalid','Access-Control-Request-Method':'POST'}).passed,true);
});
