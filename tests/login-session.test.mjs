import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accessSession, BOOTSTRAP_UID, BOOTSTRAP_EMAIL } from '../access-model.js';
const config = { ownerUid: 'rondo-uid', credentialsMigrated: true };
const profile = { username: 'F', name: 'F', groupId: 'g1', groupName: 'Support', internal: true, enabled: true, role: 'member' };
const view = { enabled: true, allowedPages: ['allowed'] };
test('Rondo ownership is bound to the configured UID, not the username or old superAdmin flag', () => {
  const owner = accessSession({ uid: 'rondo-uid' }, config, { ...profile, username: 'Rondo' });
  assert.equal(owner.superAdmin, true); assert.equal(owner.username, 'Rondo');
  const forged = accessSession({ uid: 'other' }, config, { ...profile, username: 'Rondo', superAdmin: true }, view);
  assert.equal(forged.superAdmin, false); assert.equal(forged.canEdit, false);
});
test('appointed administrators can edit but cannot appoint administrators', () => {
  const admin = accessSession({ uid: 'f' }, config, { ...profile, groupName: 'OMNIPLAY Support', role: 'member' });
  assert.equal(admin.canEdit, true); assert.equal(admin.superAdmin, false);
  assert.equal(accessSession({ uid: 'f' }, config, profile, view).canEdit, false);
});
test('old email is bootstrap only and loses access after transfer', () => {
  assert.equal(accessSession({ uid: BOOTSTRAP_UID }, null).username, BOOTSTRAP_EMAIL);
  assert.equal(accessSession({ uid: BOOTSTRAP_UID }, config, { ...profile, role: 'admin' }, view), null);
});
test('disabled, missing and removed group profiles fail closed', () => {
  assert.equal(accessSession(null, config, profile, view), null);
  assert.equal(accessSession({ uid: 'f' }, config, null, view), null);
  assert.equal(accessSession({ uid: 'f' }, config, { ...profile, enabled: false }, view), null);
  assert.equal(accessSession({ uid: 'f' }, config, profile, { enabled: false }), null);
  assert.equal(accessSession({ uid: 'rondo-uid' }, config, { ...profile, username: 'Rondo', enabled: false }), null);
});
test('a role flag grants no admin access until credentials are private', () => {
  const session = accessSession({ uid: 'f' }, { ownerUid: 'rondo-uid' }, { ...profile, role: 'admin' }, view);
  assert.equal(session.canEdit, false);
});
test('Rondo, K and F sign in through member credentials; original email only bootstraps', async () => {
  const source = await readFile(new URL('../login-auth.js', import.meta.url), 'utf8');
  const route = source.slice(source.indexOf('const administrator='), source.indexOf('const session=await resolveSession(credential.user)'));
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const login = new AsyncFunction('username', 'LOGIN_USERNAME', 'ADMIN_EMAIL', 'password', 'auth', 'memberCredentials', 'signInWithEmailAndPassword', route);
  for (const username of ['K', 'F', 'Rondo', BOOTSTRAP_EMAIL]) {
    const calls = [];
    await login(username, BOOTSTRAP_EMAIL, BOOTSTRAP_EMAIL, { value: 'test-only' }, {}, async () => ({ email: 'member@invalid', password: 'bridge' }), async (_, email) => { calls.push(email); return { user: {} }; });
    assert.deepEqual(calls, [username === BOOTSTRAP_EMAIL ? BOOTSTRAP_EMAIL : 'member@invalid']);
  }
});

test('only the two named internal groups can edit; external role flags do not grant edit access',()=>{for(const groupName of ['OMNIPLAY','OMNIPLAY Support']) assert.equal(accessSession({uid:'f'},config,{...profile,groupName},view).canEdit,true);assert.equal(accessSession({uid:'f'},config,{...profile,groupName:'Client',role:'admin'},view).canEdit,false);});
