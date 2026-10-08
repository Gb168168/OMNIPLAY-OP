import test from 'node:test';
import assert from 'node:assert/strict';
import { memberCredentials, collectMembers, groupWorkspace, groupDocumentIds, isReservedUsername } from '../member-model.js';
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
