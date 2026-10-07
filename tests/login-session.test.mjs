import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ADMIN_UID } from '../member-model.js';
const source = await readFile(new URL('../login-auth.js', import.meta.url), 'utf8');
const resolveSource = source.slice(source.indexOf('async function resolveSession(user){'), source.indexOf('const auth=getAuth(getApps().length?'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('user', 'ADMIN_UID', 'LOGIN_USERNAME', 'readSession', 'getFirestore', 'getDoc', 'doc', resolveSource + '\nreturn resolveSession(user);');
const profile = { username: 'F', name: 'F', groupId: 'g1', groupName: 'Support', internal: true, enabled: true };
function resolve(uid, data = profile, view = { enabled: true, allowedPages: ['allowed'] }) {
  return run(uid ? { uid } : null, ADMIN_UID, 'K', () => ({ authUid: uid, superAdmin: true, groupId: '__admin__', allowedPages: ['private'], loginAt: 'remembered' }),
    () => ({}), async ref => ({ exists: () => Boolean(ref.collection === 'omniplay-member-access' ? data : view),
      data: () => ref.collection === 'omniplay-member-access' ? data : view }), (_, collection, id) => ({ collection, id }));
}
test('a forged local admin session does not elevate an authenticated member', async () => {
  const session = await resolve('member-uid');
  assert.equal(session.superAdmin, false); assert.equal(session.groupId, 'g1');
  assert.deepEqual(session.allowedPages, ['allowed']); assert.equal(session.loginAt, 'remembered');
});
test('K name alone does not give administrator privileges', async () => {
  assert.equal((await resolve('member-k', { ...profile, username: 'K' })).superAdmin, false);
  assert.equal((await resolve(ADMIN_UID)).superAdmin, true);
});
test('disabled, missing or removed group access fails closed', async () => {
  assert.equal(await resolve('member', { ...profile, enabled: false }), null);
  assert.equal(await resolve('member', null), null);
  assert.equal(await resolve('member', profile, { enabled: false }), null);
  assert.equal(await resolve('member', profile, null), null);
  assert.equal(await resolve(null), null);
});
