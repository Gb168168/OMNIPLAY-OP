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

test('old Cia_Cia superAdmin flag cannot grant highest permissions', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'omniplay-member-access', 'cia-old'), { username: 'Cia_Cia', enabled: true, superAdmin: true, role: 'member' });
  });
  await assertFails(getDoc(doc(env.authenticatedContext('cia-old').firestore(), 'omniplay', 'workspace')));
});
test('Rondo may appoint admins; admins cannot appoint, read passwords, or replace the owner', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'omniplay-security', 'access'), { ownerUid: 'rondo', ownerUsername: 'Rondo', credentialsMigrated: true });
    await setDoc(doc(db, 'omniplay-member-access', 'rondo'), { username: 'Rondo', enabled: true, role: 'member', groupId: 'g1' });
    await setDoc(doc(db, 'omniplay-member-access', 'appointed'), { username: 'F', enabled: true, role: 'admin', groupId: 'g1', groupName: 'OMNIPLAY Support' });
    await setDoc(doc(db, 'omniplay-member-access', 'normal'), { username: 'User', enabled: true, role: 'member', groupId: 'g1' });
    await setDoc(doc(db, 'omniplay-group-views', 'g1'), { enabled: true, allowedDocumentIds: [], allowedPages: ['page_allowed'] });
    await setDoc(doc(db, 'omniplay-member-secrets', 'owner'), { password: 'private-owner' });
    await setDoc(doc(db, 'omniplay', 'workspace'), { categories: [], customerGroups: [{ id: 'g1', members: [{ id: 'r', username: 'Rondo' }] }] });
  });
  const owner = env.authenticatedContext('rondo').firestore(), admin = env.authenticatedContext('appointed').firestore();
  await assertSucceeds(getDoc(doc(owner, 'omniplay-member-secrets', 'owner')));
  await assertSucceeds(setDoc(doc(owner, 'omniplay-member-access', 'normal'), { role: 'admin' }, { merge: true }));
  await assertSucceeds(setDoc(doc(owner, 'omniplay-member-access', 'normal'), { role: 'member' }, { merge: true }));
  await assertSucceeds(getDoc(doc(admin, 'omniplay', 'workspace')));
  await assertSucceeds(setDoc(doc(admin, 'omniplay-group-views', 'g1', 'documents', 'sheet-page_allowed-chunk-2'), { data: 'new chunk' }));
  await assertFails(setDoc(doc(admin, 'omniplay-group-views', 'g1', 'documents', 'sheet-private-chunk-2'), { data: 'private' }));
  await assertSucceeds(getDoc(doc(env.authenticatedContext('normal').firestore(), 'omniplay-group-views', 'g1', 'documents', 'sheet-page_allowed-chunk-2')));
  await assertSucceeds(setDoc(doc(admin, 'omniplay', 'administrator-sheet'), { rows: [] }));
  await assertSucceeds(setDoc(doc(admin, 'omniplay', 'workspace'), { categories: [{ id: 'edited' }] }, { merge: true }));
  await assertFails(getDoc(doc(admin, 'omniplay-member-secrets', 'owner')));
  await assertFails(getDoc(doc(admin, 'omniplay-member-bindings', 'private')));
  await assertFails(setDoc(doc(admin, 'omniplay-member-access', 'normal'), { role: 'admin' }, { merge: true }));
  await assertFails(setDoc(doc(admin, 'omniplay-member-access', 'appointed'), { role: 'owner' }, { merge: true }));
  await assertFails(setDoc(doc(admin, 'omniplay-security', 'access'), { ownerUid: 'appointed', ownerUsername: 'Rondo', credentialsMigrated: true }));
  await assertFails(setDoc(doc(admin, 'omniplay', 'workspace'), { customerGroups: [] }, { merge: true }));
  await assertFails(getDoc(doc(env.authenticatedContext('xqDN3vaLfufEkz4TZ1omSmGkQ2A2').firestore(), 'omniplay', 'workspace')));
  await assertFails(setDoc(doc(owner, 'omniplay-security', 'access'), { ownerUid: 'appointed', ownerUsername: 'Rondo', credentialsMigrated: true }));
  await assertFails(deleteDoc(doc(owner, 'omniplay-member-access', 'rondo')));
  await assertFails(setDoc(doc(owner, 'omniplay-member-access', 'rondo'), { enabled: false }, { merge: true }));
  await assertSucceeds(getDoc(doc(owner, 'omniplay-audit-events', 'valid')));
  await assertSucceeds(getDoc(doc(admin, 'omniplay-audit-events', 'valid')));
});
