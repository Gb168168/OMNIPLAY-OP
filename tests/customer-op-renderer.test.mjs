import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
test('customer renderer removes three columns even for internal editors, and never falls back to full game data', async()=>{
 const source=await readFile(new URL('../op-game-form.js',import.meta.url),'utf8');
 const body={innerHTML:'',querySelectorAll:()=>[]},search={value:''};
 const workspace={innerHTML:'',classList:{remove(){}},querySelector(selector){
   if(selector==='#opGameBody')return body;
   if(selector==='#opGameSearch')return search;
   if(selector==='.op-assets-column')return {remove:()=>{workspace.innerHTML=workspace.innerHTML.replace(/<th class="op-assets-column">.*?<\/th>/,'')}};
   return {textContent:'',colSpan:0};
 },querySelectorAll(selector){if(selector==='.op-admin-column')return [{remove:()=>{workspace.innerHTML=workspace.innerHTML.replace(/<th class="op-admin-column">.*?<\/th>/g,'')}}];return [];}};
 let fail=false;
 const ctx={window:{},document:{querySelector:()=>workspace},installStyles(){},isAdminView:()=>true,db:{},records:{},fieldOptions:{},console:{error(){}},
 esc:value=>String(value??''),allAssets:()=>[],pills:()=>'',coloredValueCell:(key,value)=>'<td>'+String(value||'—')+'</td>',
 getCustomerGameCatalog:async()=>{if(fail)throw new Error('permission denied');return {rowsJson:JSON.stringify([['100','1','Allowed']]),records:{'100':{mandarinName:'中文'}}};},
 getDoc:()=>{throw new Error('must not read raw documents');},localGameListDraft:()=>{throw new Error('must not read local drafts');}};
 vm.createContext(ctx);
 const unique=source.slice(source.indexOf('function uniqueGames'),source.indexOf('function isAdminView'));
 const decode=source.match(/function decodedGameListRows[^\n]*/)[0];
 vm.runInContext(unique+'\n'+decode+'\n'+source.slice(source.indexOf('window.renderOpGameFormPage=')),ctx);
 await ctx.window.renderOpGameFormPage({state:{customerGroups:[]},page:{customerOpGame:true}});
 assert.doesNotMatch(workspace.innerHTML,/可查看群組|對應檔案／圖片|操作/);
 assert.equal((workspace.innerHTML.match(/<th(?: |>)/g)||[]).length,24);
 assert.equal((body.innerHTML.match(/<td(?: |>)/g)||[]).length,24);
 assert.doesNotMatch(body.innerHTML,/data-edit-id|編輯/);assert.match(body.innerHTML,/Allowed/);
 search.value='missing';search.oninput();assert.match(body.innerHTML,/找不到遊戲資料/);
 fail=true;await ctx.window.renderOpGameFormPage({state:{customerGroups:[]},page:{customerOpGame:true}});
 assert.match(body.innerHTML,/permission denied/);assert.doesNotMatch(body.innerHTML,/Allowed/);
});
