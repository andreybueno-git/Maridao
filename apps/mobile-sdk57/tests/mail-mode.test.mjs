import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asMailMode, recoveryNote, verifyNote, codeLabel, canRequestCode } from '../src/lib/mail-mode.ts';
test('telas de recuperação e confirmação refletem o modo de envio em uso',()=>{
 assert.equal(asMailMode('smtp'),'smtp');assert.equal(asMailMode('local'),'local');assert.equal(asMailMode('unconfigured'),'unconfigured');assert.equal(asMailMode('outro'),null);assert.equal(asMailMode(undefined),null);
 assert.match(recoveryNote('smtp'),/Enviaremos um código para o e-mail da conta/);assert.ok(!recoveryNote('smtp').includes('teste'));
 assert.match(recoveryNote('local'),/Nenhuma mensagem é enviada para uma caixa de e-mail real/);
 assert.match(recoveryNote('unconfigured'),/não está configurado/);assert.ok(!/teste|configurad/.test(recoveryNote(null)));
 assert.match(verifyNote('smtp'),/enviado para o seu e-mail/);assert.match(verifyNote('local'),/Modo de teste/);assert.match(verifyNote('unconfigured'),/precisa ser configurado/);
 assert.equal(codeLabel('local'),'Código recebido no e-mail de teste');assert.equal(codeLabel('smtp'),'Código recebido por e-mail');
 assert.equal(canRequestCode('smtp'),true);assert.equal(canRequestCode('local'),true);assert.equal(canRequestCode(null),true);assert.equal(canRequestCode('unconfigured'),false);
});
