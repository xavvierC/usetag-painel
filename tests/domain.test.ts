import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allocatePayment,adjustment,cents,commission,csv,outstanding,summary,type Sale} from '../lib/domain/finance.ts';
import {blankDispatch,dispatchIssues,formatDispatch,parseDispatch} from '../lib/domain/dispatch.ts';
import {sameOrigin} from '../lib/domain/origin.ts';
const sale=(id:string,amountCents:number):Sale=>({id,clientId:id,client:'Cliente fictício',amountCents,rateBps:500,soldOn:'2026-10-23',status:'approved',archived:false,version:1,receivedCents:0,items:[]});
test('origin compares public request host and protocol without accepting another site',()=>{
 const request=(origin:string,host='127.0.0.1:4180',protocol='http')=>new Request('http://localhost:4180/api/command',{headers:{origin,host,'x-forwarded-proto':protocol}});
 assert.equal(sameOrigin(request('http://127.0.0.1:4180')),true);
 assert.equal(sameOrigin(request('https://example.test','example.test','https')),true);
 assert.equal(sameOrigin(request('https://invalid.example')),false);
 assert.equal(sameOrigin(request('null')),false);
 assert.equal(sameOrigin(request('http://127.0.0.1:4181')),false);
 assert.equal(sameOrigin(request('https://127.0.0.1:4180')),false);
 assert.equal(sameOrigin(new Request('http://localhost:4180/api/command')),false);
});
test('reference amounts, rounding and target use integer cents',()=>{
  const stats=summary([sale('a',29900),sale('b',55380)],'2026-10-23','2026-10-28');
  assert.equal(stats.amount,85280);assert.equal(stats.generated,4264);assert.equal(300000-stats.amount,214720);
  assert.equal(commission(10,500),1);assert.equal(commission(18389,500),919);
  assert.equal(cents('1.036,64'),103664);assert.throws(()=>cents('-100'));assert.throws(()=>cents('1,123'));assert.throws(()=>cents('1e3'));
});
test('partial/group payments cannot over-allocate and preserve original inputs',()=>{
  const sales=[sale('a',29900),sale('b',55380)];const next=allocatePayment(sales,[{saleId:'a',amountCents:1000},{saleId:'b',amountCents:2000}],3000);
  assert.equal(outstanding(next[0]),495);assert.equal(outstanding(next[1]),769);assert.equal(sales[0].receivedCents,0);
  assert.throws(()=>allocatePayment(next,[{saleId:'a',amountCents:500}],500));assert.throws(()=>allocatePayment(next,[{saleId:'a',amountCents:1}],2));assert.throws(()=>allocatePayment(next,[{saleId:'a',amountCents:1},{saleId:'a',amountCents:1}],2));
});
test('archival preserves commission; cancellation exposes excess without inventing cash',()=>{
  const archived={...sale('a',29900),archived:true};assert.equal(summary([archived],'2026-10-23','2026-10-28').amount,0);assert.equal(outstanding(archived),1495);
  const cancelled={...archived,status:'cancelled' as const,receivedCents:1000};assert.equal(outstanding(cancelled),0);assert.equal(adjustment(cancelled),1000);
});
test('CSV quotes and neutralizes formulas including leading whitespace',()=>{
  const text=csv([['=1+1','  @SUM(A1)','normal;"text"','\tmalicious']]);assert.ok(text.includes("'=1+1"));assert.ok(text.includes("'  @SUM(A1)"));assert.ok(text.includes('""text""'));assert.ok(text.startsWith('\uFEFF'));
});
test('dispatch preserves digits, zero differs from unknown, gift participates in total',()=>{
  const d=parseDispatch('Nome completo: Cliente Exemplo\nCPF: 00012345678\nCEP: 01234567\nEndereço: Rua de exemplo, 1\nPlacas: 13\nGoogle | Azul: 5 unidades\nGoogle | Preto: 5 unidades\nInstagram: 3 unidades (brinde)\nInstagram: 0 unidades');
  assert.equal(d.cpf,'00012345678');assert.equal(d.items.length,3);const text=formatDispatch(d);assert.ok(text.includes('Total: 13 unidades'));assert.ok(text.includes('3 unidades | Instagram | Brinde'));assert.ok(text.includes('000.123.456-78'));assert.ok(!text.includes('0 unidades'));
  const unknown=parseDispatch('Google | Azul: ___ unidades');assert.equal(unknown.items[0].quantity,null);assert.ok(formatDispatch(unknown).includes('Total: a confirmar'));
});
test('dispatch detects conflicts, missing fields and mismatch without silently resolving',()=>{
  const d=parseDispatch('Nome: Cliente A\nNome: Cliente B\nPlacas: 50\nGoogle | Azul: 2 unidades');assert.ok(dispatchIssues(d).some(i=>i.includes('conflitantes')));assert.ok(dispatchIssues(d).some(i=>i.includes('difere')));assert.ok(dispatchIssues(blankDispatch()).length>=5);assert.throws(()=>parseDispatch('a'.repeat(12001)));
});
test('dispatch accepts the customer address format without requiring city or UF',()=>{
  const d=parseDispatch('Nome completo: Murilo Silva\nCPF: 06612029927\nTelefone: (47) 991311006\nE-mail: musilva05@gmail.com\nEndereço completo: Rua João Picolli,57 apto.11\nCEP: 89251590\nGoogle | Azul: 7 unidades\nGoogle | Preto: 15 unidades');
  assert.equal(d.address,'Rua João Picolli,57 apto.11');
  assert.deepEqual(dispatchIssues(d),[]);
  assert.match(formatDispatch(d),/Total: 22 unidades/);
  assert.doesNotMatch(formatDispatch(d),/cidade|UF/i);
});
