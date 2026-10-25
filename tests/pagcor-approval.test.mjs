import test from 'node:test';
import assert from 'node:assert/strict';
import { approvalLink, normalizeApproval, memberPlatformId, approvalPreviewAllowed, APPROVAL_CHUNK_BYTES } from '../pagcor-approval-model.js';
import { collectMembers, customerGameCatalog } from '../member-model.js';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

test('preview distinguishes approved Playtime platforms, unapproved FBM and mixed groups', () => {
  const approval = { allowedPlatformIds: ['pts', 'pts2'] };
  assert.equal(approvalPreviewAllowed(approval, ['pts', 'pts2']), true);
  assert.equal(approvalPreviewAllowed(approval, ['pts']), true);
  assert.equal(approvalPreviewAllowed(approval, ['pts2']), true);
  assert.equal(approvalPreviewAllowed(approval, ['fbm']), false);
  assert.equal(approvalPreviewAllowed(approval, ['pts', 'fbm']), false);
  assert.equal(approvalPreviewAllowed(approval, []), false);
  assert.equal(approvalPreviewAllowed(approval, null), false);
  assert.equal(approvalPreviewAllowed({ allowedPlatformIds: [] }, ['pts']), false);
});

test('platforms in a shared group remain distinct and unknown bindings fail closed', () => {
  const group = { id: 'g', name: 'Client', members: [
    { id: 'a', username: 'A', password: 'test', platformId: 'platform-a' },
    { id: 'b', username: 'B', password: 'test', platformId: 'platform-b' },
    { id: 'c', username: 'C', password: 'test' },
    { id: 'd', username: 'D', password: 'test', platformId: 'other-group' },
  ] };
  const customers = [{ id: 'platform-a', groupId: 'g' }, { id: 'platform-b', groupId: 'g' }, { id: 'other-group', groupId: 'other' }];
  assert.deepEqual(collectMembers({ customerGroups: [group], customers }).map(member => member.platformId), ['platform-a', 'platform-b', '', '']);
  assert.equal(memberPlatformId({id:'platform-a'}, group, customers, 'customer'), 'platform-a');
  assert.equal(memberPlatformId({platformId:'missing'}, group, customers), '');
});
test('approval supports distinct file/image metadata and safe links without public file URLs', () => {
  const file = { id: 'file', kind: 'file', name: 'report.pdf', type: 'application/pdf', size: 42, chunkCount: 1, url: 'must-not-leak' };
  const image = { ...file, id: 'image', name: 'approval.png', type: 'image/png' };
  const result = normalizeApproval({ allowedPlatformIds: ['a','a'], items: [file, image, { id: 'link', kind: 'link', name: 'Report', url: 'https://example.com/report' }] }, [{id:'a'}]);
  assert.deepEqual(result.allowedPlatformIds, ['a']);
  assert.deepEqual(result.fileIds, ['file','image']);
  assert(!('url' in result.items[0]));
  assert.throws(() => normalizeApproval({allowedPlatformIds:['missing']}, [{id:'a'}]));
  assert.throws(() => normalizeApproval({items:[{...file,chunkCount:2}]}, []));
  assert.throws(() => normalizeApproval({items:[{...file,size:APPROVAL_CHUNK_BYTES*100}]}, []));
  for (const url of ['javascript:alert(1)', 'data:text/html,secret', 'file:///etc/passwd', 'https://user:password@example.com']) assert.throws(() => approvalLink(url));
});
test('private approval never enters a shared group game catalog', () => {
  const catalog = customerGameCatalog({rows:[['90001','1','Game']]}, {records:{'90001':{groupIds:['g'],mandarinName:'示範'}}}, {id:'g'}, {});
  assert.deepEqual(JSON.parse(catalog.rowsJson).map(row=>row[0]), ['90001']);
  assert.doesNotMatch(JSON.stringify(catalog), /allowedPlatformIds|pagcor-approvals|chunkCount/);
});

test('original file bytes round-trip across chunks and writes stay below batch size limits', async () => {
  const source = (await readFile(new URL('../pagcor-approval-files.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replaceAll('export async function', 'async function');
  const documents = new Map(), batches = [];
  const ctx = { Uint8Array, Blob, btoa, atob, crypto:webcrypto, PAGCOR_COLLECTION:'omniplay-pagcor-approvals', APPROVAL_CHUNK_BYTES, MAX_APPROVAL_FILE_BYTES:20*1024*1024,
    getFirestore:()=>({}), doc:(_, ...path)=>path.join('/'),
    getDocFromServer:async path=>({exists:()=>documents.has(path),data:()=>documents.get(path)}),
    writeBatch:()=>{const pending=[];return {set:(path,data)=>pending.push([path,data]),delete:path=>pending.push([path,null]),commit:async()=>{batches.push(pending.length);for(const [path,data] of pending){if(data)documents.set(path,data);else documents.delete(path);}}};} };
  vm.createContext(ctx);vm.runInContext(source,ctx);
  const bytes = Uint8Array.from({length:APPROVAL_CHUNK_BYTES*17+11},(_,i)=>i%251);
  const file = new Blob([bytes],{type:'image/png'});file.name='original.png';
  const item = await ctx.uploadApprovalFile('90001', file);
  assert.equal(item.chunkCount,18);
  assert.deepEqual(batches,[16,2]);
  const restored=await ctx.readApprovalFile('90001',item);
  assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),bytes);
  documents.delete('omniplay-pagcor-approvals/90001/files/'+item.id+'/chunks/0');
  await assert.rejects(ctx.readApprovalFile('90001',item),/不完整/);
  await ctx.removeApprovalFile('90001',item);assert.equal(documents.size,0);
});


test('empty Game ID approvals stay hidden and reappear only when items exist', async () => {
 const source=await readFile(new URL('../pagcor-approval.js',import.meta.url),'utf8');
 const start=source.indexOf('export async function mountPagcorApproval('),end=source.indexOf('\nfunction openApproval(',start);
 for(const admin of [false,true]){
  let snapshotListener;const children=[],tools=[];let emptyRemoved=0;
  const makeNode=()=>({style:{},hidden:false,innerHTML:'',textContent:'',querySelector:()=>({textContent:''}),remove(){this.removed=true;}});
  const toolbar={append:node=>tools.push(node)},dialog={querySelector:()=>toolbar,addEventListener(){}};
  const container={isConnected:true,prepend:node=>children.push(node),querySelector:()=>({remove:()=>emptyRemoved++}),closest:()=>dialog};
  const context={window:{__omniplayCanEdit:admin},document:{createElement:makeNode,body:{}},getFirestore:()=>({}),doc:()=>({}),PAGCOR_COLLECTION:'approvals',
   getDocFromServer:async()=>({exists:()=>true,data:()=>({items:[],allowedPlatformIds:[],revision:0})}),installStyle(){},label:(zh,en)=>zh,
   onSnapshot:(reference,callback)=>{snapshotListener=callback;return()=>{};},MutationObserver:class{observe(){}disconnect(){}},openApproval:()=>({close(){}})};
  vm.createContext(context);vm.runInContext(source.slice(start,end).replace('export async function','async function'),context);
  await context.mountPagcorApproval({container,game:{id:'100001'},state:{}});
  const button=children[0];assert.equal(button.hidden,true);assert.equal(button.style.display,'none');assert.equal(emptyRemoved,0);
  assert.equal(tools.length,admin?1:0);if(admin)assert.equal(tools[0].hidden,false);
  snapshotListener({exists:()=>true,data:()=>({items:[{id:'file'}]})});assert.equal(button.hidden,false);assert.equal(button.style.display,'');assert.equal(emptyRemoved,1);if(admin)assert.equal(tools[0].hidden,true);
  snapshotListener({exists:()=>true,data:()=>({items:[]})});assert.equal(button.hidden,true);if(admin)assert.equal(tools[0].hidden,false);
 }
});
