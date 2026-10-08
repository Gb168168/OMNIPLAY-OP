import test from 'node:test';
import assert from 'node:assert/strict';
import { memberCredentials, collectMembers, groupWorkspace, groupDocumentIds, isReservedUsername, ensureCustomerOpPage, customerGameCatalog, CUSTOMER_OP_PAGE, CUSTOMER_OP_DOCUMENT } from '../member-model.js';
const internal = { id: 'g1', name: 'OMNIPLAY Support', allowedPages: ['page_op_game'], members: [
  { id: 'm1', username: ' F ', password: 'short', name: 'F' },
  { id: 'm2', username: 'K', password: 'reserved' },
] };
const external = { id: 'g2', name: 'Client', allowedPages: ['asset'] };
const workspace = { categories: [{ id: 'c1', pages: [{ id: 'page_op_game', name: 'OP GAME', type: 'sheet' },
  { id: 'private', name: 'Private', type: 'files' }, { id: 'asset', name: 'Game Asset', type: 'photos' }] }],
  customerGroups: [internal, external], customers: [{ id: 'u1', username: 'client', password: 'private', groupId: 'g2' }],
  adminAuth: { passwordHash: 'secret' }, platformImportVersion: 1 };
test('username case and surrounding spaces do not change login identity', async () => {
  assert.deepEqual(await memberCredentials(' F ', 'short'), await memberCredentials('f', 'short'));
  assert.notDeepEqual(await memberCredentials('f', 'short'), await memberCredentials('f', 'different'));
  assert.equal((await memberCredentials('f', 'x')).password.length, 64);
});
test('existing member and customer credentials are retained; existing K member account is also retained', () => {
  const accounts = collectMembers(workspace);
  assert.deepEqual(accounts.map(item => item.username), ['F', 'K', 'client']);
  assert.equal(accounts[0].groupId, 'g1'); assert.equal(accounts[2].internal, false);
});
test('duplicate identities fail closed instead of overwriting another profile', () => {
  const copy = structuredClone(workspace); copy.customerGroups[1].members = [{ id: 'm3', username: 'f', password: 'x' }];
  assert.throws(() => collectMembers(copy), /重複/);
});
test('viewer projection includes only allowed pages and never credentials or members', () => {
  const view = groupWorkspace(workspace, internal);
  assert.deepEqual(view.categories[0].pages.map(page => page.id), ['page_op_game']);
  assert.deepEqual(view.customers, []);
  assert.equal(view.customerGroups.length, 1);
  assert.doesNotMatch(JSON.stringify(view), /password|adminAuth|members|secret|private/);
  assert.equal(workspace.customerGroups[0].members[0].password, 'short');
});
test('external group cannot gain platform access by selecting the system page', () => {
  const view = groupWorkspace(workspace, { ...external, allowedPages: ['system_all_platforms', 'asset'] });
  assert.deepEqual(view.customers, []); assert.equal(view.customerGroups.length, 1);
});
test('sheet and game documents are selected only for granted pages', () => {
  const ids = ['sheet-page_op_game', 'sheet-page_op_game-chunk-0', 'sheet-private', 'game-list-online-page', 'op-game-form-records', 'workspace'];
  assert.deepEqual(groupDocumentIds(workspace, external, ids), []);
  assert.deepEqual(groupDocumentIds(workspace, internal, ids).sort(), ids.filter(id => !['workspace', 'sheet-private'].includes(id)).sort());
});

test('Cia_Cia uses the same member credentials as K and F', () => {
  assert.equal(isReservedUsername(' Cia_Cia '), false);
  assert.equal(isReservedUsername('cia_cia'), false);
  assert.equal(isReservedUsername('K'), false);
  const copy = structuredClone(workspace);
  copy.customerGroups[0].members.push({ id: 'admin-name', username: 'Cia_Cia', password: 'unused' });
  assert.deepEqual(collectMembers(copy).map(item => item.username), ['F', 'K', 'Cia_Cia', 'client']);
});

test('shared workspace retains member metadata without passwords, owner can hydrate them', async () => {
  const { publicWorkspace, hydratePasswords } = await import('../member-model.js');
  const shared = publicWorkspace(workspace);
  assert.doesNotMatch(JSON.stringify(shared), /password|adminAuth|secret/);
  assert.equal(shared.customerGroups[0].members[0].username, ' F ');
  const hydrated = hydratePasswords(shared, new Map([['member:g1:m1', { password: 'owner-private' }]]));
  assert.equal(hydrated.customerGroups[0].members[0].password, 'owner-private');
  assert.equal(shared.customerGroups[0].members[0].password, undefined);
});

test('internal reference pages are automatic for internal groups and excluded from external stale grants', () => {
  const workspace = { categories: [
    { id: 'private', name: '內部參考，請勿外流', pages: [{ id: 'private-sheet', name: 'OP GAME', type: 'sheet', files: [{ name: 'confidential.pdf' }] }] },
    { id: 'public', name: '客戶資料', pages: [{ id: 'public-page', name: 'Game Asset', type: 'files' }] }
  ], customerGroups: [], customers: [] };
  const ids = ['sheet-private-sheet', 'sheet-private-sheet-chunk-0', 'op-game-form-records', 'game-list-online-page'];
  const external = { id: 'client', name: 'Client', allowedPages: ['private-sheet', 'public-page'] };
  const externalView = groupWorkspace(workspace, external);
  assert.deepEqual(externalView.categories.map(category => category.id), ['public']);
  assert.deepEqual(externalView.allowedPages, ['public-page']);
  assert.deepEqual(groupDocumentIds(workspace, external, ids), []);
  assert.doesNotMatch(JSON.stringify(externalView.categories), /confidential|private-sheet/);
  for (const name of ['OMNIPLAY', 'OMNIPLAY Support']) {
    const group = { id: 'internal', name, allowedPages: ['public-page'] };
    assert.equal(groupWorkspace(workspace, group).categories.length, 2);
    assert(groupDocumentIds(workspace, group, ids).includes('op-game-form-records'));
  }
});

test('customer OP GAME is available to every group without exposing original records',()=>{
 const workspace={categories:[{id:'internal',name:'內部參考，請勿外流',pages:[{id:'original-op',name:'OP GAME',type:'sheet',snapshot:{secret:'not-copied'}}]}]};
 assert.equal(ensureCustomerOpPage(workspace),true);assert.equal(ensureCustomerOpPage(workspace),false);
 const group={id:'client',name:'Client',allowedPages:[]};
 const view=groupWorkspace(workspace,group);
 assert(view.allowedPages.includes(CUSTOMER_OP_PAGE));
 assert.equal(view.categories.length,1);
 assert.equal(view.categories[0].pages[0].customerOpGame,true);
 assert.doesNotMatch(JSON.stringify(view),/not-copied|original-op/);
 assert.deepEqual(groupDocumentIds(workspace,group,['op-game-form-records','game-list-online-page','sheet-original-op']),[CUSTOMER_OP_DOCUMENT]);
});
test('customer catalog filters each game by assigned group and strips all internal fields',()=>{
 const rows={rowsJson:JSON.stringify([['100','1','Allowed'],['100','2','Allowed'],['200','1','Other'],['300','1','Unassigned']])};
 const records={records:{'100':{groupIds:['client'],mandarinName:'中文',status:'上線',assetIds:['secret'],folders:[{name:'private'}],notes:'private note'},'200':{groupIds:['other']},'300':{groupIds:[]}}};
 const catalog=customerGameCatalog(rows,records,{id:'client'});
 assert.deepEqual(JSON.parse(catalog.rowsJson).map(row=>row[0]),['100','100']);
 assert.deepEqual(Object.keys(catalog.records),['100']);
 assert.deepEqual(catalog.records['100'],{mandarinName:'中文',status:'上線'});
 assert.doesNotMatch(JSON.stringify(catalog),/groupIds|assetIds|folders|private|Other|Unassigned/);
 assert.equal(JSON.parse(customerGameCatalog(rows,records,{id:'none'}).rowsJson).length,0);
 assert.equal(JSON.parse(customerGameCatalog({rowsJson:'invalid'},records,{id:'client'}).rowsJson).length,0);
});
