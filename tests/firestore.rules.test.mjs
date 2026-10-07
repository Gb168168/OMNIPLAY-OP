import { readFile } from 'node:fs/promises';
import test, { before, after } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-omniplay-members', firestore: {
    host: '127.0.0.1', port: 8088, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'omniplay', 'workspace'), { adminAuth: { passwordHash: 'private' }, customerGroups: [{ members: [{ password: 'private' }] }] });
    await setDoc(doc(db, 'omniplay-member-bindings', 'private'), { password: 'credential' });
    await setDoc(doc(db, 'omniplay-member-access', 'f'), { username: 'F', name: 'F', groupName: 'Support', groupId: 'g1', enabled: true });
    await setDoc(doc(db, 'omniplay-member-access', 'disabled'), { groupId: 'g1', enabled: false });
    await setDoc(doc(db, 'omniplay-member-access', 'member-k'), { username: 'K', name: 'K', groupName: 'Support', groupId: 'g1', enabled: true, internal: true });
    await setDoc(doc(db, 'omniplay-group-views', 'g1'), { enabled: true, allowedDocumentIds: ['game-list-online-page'] });
    await setDoc(doc(db, 'omniplay-group-views', 'g2'), { enabled: true, allowedDocumentIds: [] });
    await setDoc(doc(db, 'omniplay-group-views', 'g1', 'documents', 'game-list-online-page'), { rows: [] });
    await setDoc(doc(db, 'omniplay-group-views', 'g1', 'documents', 'revoked-sheet'), { snapshotJson: 'secret' });
  });
});
after(async () => { await env?.cleanup(); });
test('administrator retains all existing operations', async () => {
  const db = env.authenticatedContext('xqDN3vaLfufEkz4TZ1omSmGkQ2A2').firestore();
  await assertSucceeds(getDoc(doc(db, 'omniplay', 'workspace')));
  await assertSucceeds(setDoc(doc(db, 'omniplay', 'new-document'), { test: true }));
  await assertSucceeds(getDoc(doc(db, 'omniplay-member-bindings', 'private')));
});
test('member reads own profile and own group, never other groups or credentials', async () => {
  const db = env.authenticatedContext('f').firestore();
  await assertSucceeds(getDoc(doc(db, 'omniplay-member-access', 'f')));
  await assertSucceeds(getDoc(doc(db, 'omniplay-group-views', 'g1')));
  await assertSucceeds(getDoc(doc(db, 'omniplay-group-views', 'g1', 'documents', 'game-list-online-page')));
  for (const path of [['omniplay', 'workspace'], ['omniplay-member-bindings', 'private'],
    ['omniplay-group-views', 'g2'], ['omniplay-member-access', 'disabled'],
    ['omniplay-group-views', 'g1', 'documents', 'revoked-sheet']]) {
    await assertFails(getDoc(doc(db, ...path)));
  }
});
test('member cannot edit data or assign their own access', async () => {
  const db = env.authenticatedContext('f').firestore();
  await assertFails(setDoc(doc(db, 'omniplay-member-access', 'f'), { enabled: true, groupId: 'g2' }));
  await assertFails(setDoc(doc(db, 'omniplay-group-views', 'g1'), { enabled: true }));
  await assertFails(setDoc(doc(db, 'omniplay', 'workspace'), { test: true }));
});
test('unauthenticated, unassigned and disabled users cannot read group data', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('new-user'), env.authenticatedContext('disabled')]) {
    await assertFails(getDoc(doc(context.firestore(), 'omniplay-group-views', 'g1')));
  }
});
test('audit events must identify the actual signed-in member', async () => {
  const db = env.authenticatedContext('f').firestore();
  const event = { authUid: 'f', username: 'F', name: 'F', groupName: 'Support', action: 'login', item: '', createdAt: serverTimestamp(), createdAtIso: new Date().toISOString() };
  await assertSucceeds(setDoc(doc(db, 'omniplay-audit-events', 'valid'), event));
  await assertFails(setDoc(doc(db, 'omniplay-audit-events', 'forged'), { ...event, username: 'K', name: 'K' }));
  await assertFails(getDoc(doc(db, 'omniplay-audit-events', 'valid')));
  await assertFails(deleteDoc(doc(db, 'omniplay-audit-events', 'valid')));
});
test('revocation takes effect even when a Firebase sign-in token remains valid', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'omniplay-member-access', 'f'), { enabled: false }, { merge: true });
  });
  await assertFails(getDoc(doc(env.authenticatedContext('f').firestore(), 'omniplay-group-views', 'g1')));
});
test('existing internal K member retains audit read access', async () => {
  await assertSucceeds(getDoc(doc(env.authenticatedContext('member-k').firestore(), 'omniplay-audit-events', 'valid')));
});

test('approved Cia_Cia has full access; username or role flag alone cannot grant it', async () => {
  await env.withSecurityRulesDisabled(async context => {
    for (const [uid, profile] of [
      ['cia-admin', { username: 'Cia_Cia', superAdmin: true, enabled: true }],
      ['cia-name-only', { username: 'Cia_Cia', enabled: true }],
      ['k-role-only', { username: 'K', superAdmin: true, enabled: true }],
      ['cia-disabled', { username: 'Cia_Cia', superAdmin: true, enabled: false }],
    ]) await setDoc(doc(context.firestore(), 'omniplay-member-access', uid), profile);
  });
  const db = env.authenticatedContext('cia-admin').firestore();
  await assertSucceeds(getDoc(doc(db, 'omniplay', 'workspace')));
  await assertSucceeds(setDoc(doc(db, 'omniplay', 'cia-admin-write'), { test: true }));
  await assertSucceeds(getDoc(doc(db, 'omniplay-member-bindings', 'private')));
  for (const uid of ['cia-name-only', 'k-role-only', 'cia-disabled']) {
    const denied = env.authenticatedContext(uid).firestore();
    await assertFails(getDoc(doc(denied, 'omniplay', 'workspace')));
    await assertFails(setDoc(doc(denied, 'omniplay-member-access', uid), { username: 'Cia_Cia', superAdmin: true, enabled: true }));
  }
});
