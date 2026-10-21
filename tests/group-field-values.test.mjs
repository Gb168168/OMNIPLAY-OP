import test from 'node:test';
import assert from 'node:assert/strict';
import {createFieldRule, assignFieldGroup, normalizeFieldRules, resolveLinkedGame, projectLinkedRow, LINKED_GAME_FIELDS} from '../group-field-values.js';
import {customerGameCatalog, projectGroupGameDocument} from '../member-model.js';
const groups = [{id:'fbm',name:'FBM'},{id:'play',name:'Playtime'},{id:'nu',name:'NuStar'}];
const game={id:'101014',name:'Piñata Beat 1000',betMax:'1500',betMin:'1',totalPayout:'0.96'};
function rules(){const rule=createFieldRule(game,'betMax');rule.variants.push({value:'5000',groupIds:[]});assignFieldGroup(rule,0,'play',true);return {betMax:rule};}
test('assigning Playtime 5000 removes its 1500 default and moving groups never creates duplicate assignments',()=>{
 const rule=rules().betMax;assert.deepEqual(rule.defaultExcludedGroupIds,['play']);
 assert.equal(resolveLinkedGame(game,{betMax:rule},'play').betMax,'5000');
 assert.equal(resolveLinkedGame(game,{betMax:rule},'fbm').betMax,'1500');
 rule.variants.push({value:'10000',groupIds:[]});assignFieldGroup(rule,1,'play',true);
 assert.deepEqual(rule.variants[0].groupIds,[]);assert.deepEqual(rule.variants[1].groupIds,['play']);
 assignFieldGroup(rule,-1,'play',true);assert(!rule.defaultExcludedGroupIds.includes('play'));assert(rule.variants.every(item=>!item.groupIds.includes('play')));
 assignFieldGroup(rule,-1,'fbm',false);assert.equal(resolveLinkedGame(game,{betMax:rule},'fbm').betMax,'');
});
test('fields, games, and source rows stay independent; percentages keep their intended display',()=>{
 const input=rules();input.betMin=createFieldRule(game,'betMin');input.betMin.defaultValue='2';input.totalPayout=createFieldRule(game,'totalPayout');
 assert.equal(input.totalPayout.defaultValue,'96%');const normalized=normalizeFieldRules(input,groups);
 assert.equal(resolveLinkedGame(game,normalized,'play').betMin,'2');assert.equal(resolveLinkedGame(game,normalized,'new-group').betMax,'1500');
 assert.equal(resolveLinkedGame(game,{}).betMax,'1500');
 const row=['101014','v1','Piñata Beat 1000','OP','PHP', 'Slot','20',1,1500];
 const projected=projectLinkedRow(row,normalized,'play');assert.equal(projected[8],'5000');assert.equal(projected[7],'2');assert.equal(row[8],1500);
 assert.equal(projected[0],row[0]);assert.equal(LINKED_GAME_FIELDS.length,18);
});
test('invalid values, unknown groups, missing assignments and conflicting values are rejected',()=>{
 const input=rules();input.betMax.variants[0].value='-1';assert.throws(()=>normalizeFieldRules(input,groups),/非負數/);
 input.betMax.variants[0].value='5000';input.betMax.variants.push({value:'10000',groupIds:['play']});assert.throws(()=>normalizeFieldRules(input,groups),/重複/);
 input.betMax.variants.pop();input.betMax.variants[0].groupIds=['unknown'];assert.throws(()=>normalizeFieldRules(input,groups),/群組資料/);
 input.betMax.variants[0].groupIds=[];assert.throws(()=>normalizeFieldRules(input,groups),/勾選群組/);
 assert.throws(()=>normalizeFieldRules({id:createFieldRule(game,'id')},groups),/不支援/);
});
test('customer catalogs and raw game-document projections contain only the assigned value, never other group values or rule metadata',()=>{
 const rowData={rows:[['101014','v1','Piñata Beat 1000','OP','PHP','Slot','20',1,1500]]};
 const recordData={records:{'101014':{groupIds:['fbm','play'],linkedFieldRules:rules()}}};
 const fbm=customerGameCatalog(rowData,recordData,groups[0],{}),play=customerGameCatalog(rowData,recordData,groups[1],{});
 assert.equal(JSON.parse(fbm.rowsJson)[0][8],'1500');assert.equal(JSON.parse(play.rowsJson)[0][8],'5000');
 assert.doesNotMatch(JSON.stringify(fbm),/5000|linkedFieldRules|defaultExcludedGroupIds|variants/);
 assert.doesNotMatch(JSON.stringify(play),/1500|linkedFieldRules|defaultExcludedGroupIds|variants/);
 for(const id of ['game-list-online-page','op-game-form-records']){
   const value=projectGroupGameDocument(id,id==='op-game-form-records'?recordData:rowData,rowData,recordData,groups[0],{});
   assert.doesNotMatch(JSON.stringify(value),/5000|linkedFieldRules|variants/);
 }
 assert.equal(customerGameCatalog(rowData,recordData,groups[2],{}).rowsJson,'[]');
 assert.deepEqual(recordData.records['101014'].groupIds,['fbm','play']);
});
