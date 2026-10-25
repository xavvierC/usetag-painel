const {chromium}=require('C:/Users/xavie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
 for(const width of [390,768,1024,1440]) {
  await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4180/dashboard',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Visão geral.'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
  await page.screenshot({path:path.join(__dirname,`../test-results/dashboard-${width}.png`),fullPage:true});
  console.log('LAYOUT_OK',width);
 }
 await page.getByRole('button',{name:'Nova venda',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Nome do cliente').fill('Cliente QA');
 await page.getByRole('dialog').getByLabel('Valor da venda (R$)').fill('100,00');
 await page.getByRole('dialog').getByLabel('Data da venda').fill('2026-10-23');
 await page.getByRole('button',{name:'Registrar venda',exact:true}).click();
 await page.locator('.sidebar').getByRole('link',{name:'Vendas',exact:true}).click();
 await page.getByLabel('Buscar cliente').fill('Cliente QA');assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('button',{name:'Editar venda de Cliente QA'}).click();
 await page.getByRole('dialog').getByLabel('Valor da venda (R$)').fill('200,00');await page.getByRole('button',{name:'Aplicar alterações'}).click();
 assert.ok((await page.locator('tbody').textContent()).includes('200,00'));
 await page.getByRole('button',{name:'Arquivar venda de Cliente QA'}).click();await page.getByRole('dialog').getByRole('button',{name:'Arquivar venda',exact:true}).click();await page.getByLabel('Arquivadas').check();assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('button',{name:'Restaurar venda de Cliente QA'}).click();await page.getByLabel('Arquivadas').uncheck();assert.equal(await page.locator('tbody tr').count(),1);
 await page.locator('.sidebar').getByRole('link',{name:'Comissões',exact:true}).click();await page.getByRole('button',{name:'Registrar recebimento',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Total recebido (R$)').fill('10,00');await page.getByRole('dialog').getByLabel('Data do recebimento').fill('2026-10-23');
 await page.locator('.allocation').filter({hasText:'Cliente QA'}).locator('input').fill('10,00');await page.getByRole('button',{name:'Registrar na demonstração'}).click();
 await page.locator('.sidebar').getByRole('link',{name:'Financeiro',exact:true}).click();assert.ok((await page.locator('tbody').textContent()).includes('10,00'));
 await page.locator('.sidebar').getByRole('link',{name:'Clientes',exact:true}).click();await page.getByRole('button',{name:'Novo cliente'}).click();await page.getByRole('dialog').getByLabel('Nome completo',{exact:true}).fill('Cliente Cadastro QA');await page.getByRole('button',{name:'Salvar na demonstração'}).click();assert.ok((await page.locator('.client-grid').textContent()).includes('Cliente Cadastro QA'));
 await page.getByRole('button',{name:'Nova venda',exact:true}).click();await page.getByRole('dialog').getByLabel('Cliente cadastrado').selectOption({label:'Cliente Cadastro QA'});assert.equal(await page.getByRole('dialog').getByLabel('Nome do cliente',{exact:true}).inputValue(),'Cliente Cadastro QA');await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.locator('.sidebar').getByRole('link',{name:'Assistente IA',exact:true}).click();await page.getByLabel('Dados recebidos do cliente').fill('Nome completo: Cliente Exemplo\nCPF: 00012345678\nEndereço: Rua Teste, 1\nCEP: 01234567\nGoogle | Azul: 10 unidades\nInstagram: 0 unidades');await page.getByRole('button',{name:'Estruturar venda'}).click();
 assert.ok((await page.getByLabel('Mensagem para expedição').inputValue()).includes('Total: 10 unidades'));await page.getByRole('button',{name:'Copiar',exact:true}).click();assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('VENDA GERADA'));
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Abrir navegação'}).click();await page.waitForFunction(()=>Math.abs(document.querySelector('.sidebar').getBoundingClientRect().x)<0.1);await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Abrir navegação'}).getAttribute('aria-expanded'),'false');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 for(const route of ['vendas','clientes','comissoes','financeiro','metas','expedicao','configuracoes']) {
  await page.goto('http://127.0.0.1:4180/'+route,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflow');
 }
 const blocked=await page.request.post('http://127.0.0.1:4180/api/command',{data:{},headers:{Origin:'https://invalid.example'}});assert.equal(blocked.status(),403);
 const unavailable=await page.request.post('http://127.0.0.1:4180/api/expedicao',{data:{source:'teste'},headers:{Origin:'http://127.0.0.1:4180'}});assert.equal(unavailable.status(),503);
 assert.deepEqual(errors,[]);console.log('CRUD_CLIENTS_ARCHIVE_RESTORE_PAYMENT_CASH_DISPATCH_COPY_MOBILE_KEYBOARD_REDUCED_MOTION_API_GUARDS_OK');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
