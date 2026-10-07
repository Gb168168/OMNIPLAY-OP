import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { ADMIN_UID, memberCredentials } from '../member-model.js';

test('legacy members can sign in; password updates, renames, page revocation and deletion preserve administrator sign-in', async () => {
  const projectId = 'demo-omniplay-members';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9098';
  const env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8088,
    rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  await env.clearFirestore();
  const server = initializeAdmin({ projectId }, 'test-admin-sdk');
  await adminAuth(server).createUser({ uid: ADMIN_UID, email: 'goldbricks168@gmail.com', password: 'test-administrator-password' });
  const cfg = { projectId, apiKey: 'demo-key', authDomain: `${projectId}.firebaseapp.com` }, primary = initializeApp(cfg);
  const auth = getAuth(primary); connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
  await setPersistence(auth, inMemoryPersistence);
  await signInWithEmailAndPassword(auth, 'goldbricks168@gmail.com', 'test-administrator-password');
  const db = getFirestore(primary); connectFirestoreEmulator(db, '127.0.0.1', 8088);
  globalThis.window = { __omniplaySession: { superAdmin: true } };
  globalThis.document = { querySelector: () => null };
  // Run the actual production adapter against SDK emulator instances, with only
  // import URLs and the secondary Auth emulator connection replaced for Node.
  const production = await readFile(new URL('../member-access.js', import.meta.url), 'utf8');
  const nodeSource = "import { connectAuthEmulator } from 'firebase/auth';\n" + production
    .replaceAll('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js', 'firebase/app')
    .replaceAll('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js', 'firebase/auth')
    .replaceAll('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js', 'firebase/firestore')
    .replace(/'\.\/member-model\.js(?:\?[^']*)?'/, "'../member-model.js'")
    .replace('const auth = getAuth(auxiliary);', "const auth = getAuth(auxiliary); if(!auth.emulatorConfig) connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});");
  const tmp = new URL('../tmp/', import.meta.url); await mkdir(tmp, { recursive: true });
  await writeFile(new URL('member-access.test.mjs', tmp), nodeSource);
  const access = await import(new URL('member-access.test.mjs', tmp));
  const group = { id: 'g1', name: 'OMNIPLAY Support', allowedPages: ['page_op_game'], members: [
    { id: 'f-member', name: 'F', username: 'F', password: 'old' },
    { id: 'k-member', name: 'K', username: 'K', password: 'member-k' },
    { id: 'cia-member', name: 'Cia_Cia', username: 'Cia_Cia', password: 'member-cia' },
  ] };
  const workspace = { categories: [{ id: 'cat', pages: [{ id: 'page_op_game', name: 'OP GAME', type: 'sheet' },
    { id: 'secret-page', name: 'Private', type: 'files', files: [{ password: 'never-expose' }] }] }],
    customerGroups: [group], customers: [], adminAuth: { passwordHash: 'administrator-only' } };
  await setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  await setDoc(doc(db, 'omniplay', 'game-list-online-page'), { rowsJson: '[[100001,"1.0","Power Dragon"]]' });
  await setDoc(doc(db, 'omniplay', 'op-game-form-records'), { records: {} });
  await access.syncMembersAndViews(db, workspace);
  assert.equal(auth.currentUser.uid, ADMIN_UID);
  const viewer = initializeApp(cfg, 'test-viewer'), viewerAuth = getAuth(viewer);
  connectAuthEmulator(viewerAuth, 'http://127.0.0.1:9098', { disableWarnings: true });
  const viewerDb = getFirestore(viewer); connectFirestoreEmulator(viewerDb, '127.0.0.1', 8088);
  const before = await memberCredentials('f', 'old');
  await signInWithEmailAndPassword(viewerAuth, before.email, before.password);
  const initialUid = viewerAuth.currentUser.uid;
  const view = (await getDoc(doc(viewerDb, 'omniplay-group-views', 'g1'))).data();
  globalThis.window.__omniplaySession = { superAdmin: false, groupId: 'g1' };
  assert.deepEqual((await access.getDoc(doc(viewerDb, 'omniplay', 'workspace'))).data(), view);
  await access.getDoc(doc(viewerDb, 'omniplay', 'game-list-online-page'));
  globalThis.window.__omniplaySession = { superAdmin: true };
  assert.deepEqual(view.categories[0].pages.map(page => page.id), ['page_op_game']);
  assert.doesNotMatch(JSON.stringify(view), /password|adminAuth|members|never-expose/);
  await assert.rejects(getDoc(doc(viewerDb, 'omniplay', 'workspace')), error => error.code === 'permission-denied');
  assert.equal(auth.currentUser.uid, ADMIN_UID);

  group.members[0].password = 'new';
  await access.setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  await assert.rejects(signInWithEmailAndPassword(viewerAuth, before.email, before.password));
  const after = await memberCredentials('F', 'new');
  await signInWithEmailAndPassword(viewerAuth, after.email, after.password);
  assert.equal(viewerAuth.currentUser.uid, initialUid);
  assert.equal(auth.currentUser.uid, ADMIN_UID);

  group.allowedPages = [];
  await access.setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  const revoked = (await getDoc(doc(viewerDb, 'omniplay-group-views', 'g1'))).data();
  assert.deepEqual(revoked.categories, []);
  await assert.rejects(getDoc(doc(viewerDb, 'omniplay-group-views', 'g1', 'documents', 'game-list-online-page')), error => error.code === 'permission-denied');

  group.members[0].username = 'Renamed F';
  await access.setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  await assert.rejects(getDoc(doc(viewerDb, 'omniplay-group-views', 'g1')), error => error.code === 'permission-denied');
  const renamed = await memberCredentials('Renamed F', 'new');
  await signInWithEmailAndPassword(viewerAuth, renamed.email, renamed.password);
  await getDoc(doc(viewerDb, 'omniplay-group-views', 'g1'));
  group.members = group.members.filter(member => member.id !== 'f-member');
  await access.setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  await assert.rejects(getDoc(doc(viewerDb, 'omniplay-group-views', 'g1')), error => error.code === 'permission-denied');
  // Re-adding a deleted username with a new member id and password must work.
  group.members.push({ id: 'new-f-member', username: 'Renamed F', name: 'F again', password: 'readded' });
  await access.setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  const readded = await memberCredentials('Renamed F', 'readded');
  await signInWithEmailAndPassword(viewerAuth, readded.email, readded.password);
  await getDoc(doc(viewerDb, 'omniplay-group-views', 'g1'));
  assert.equal(auth.currentUser.uid, ADMIN_UID);
  const cia = await memberCredentials('Cia_Cia', 'member-cia');
  await signInWithEmailAndPassword(auth, cia.email, cia.password);
  const ciaUid = auth.currentUser.uid;
  assert.notEqual(ciaUid, ADMIN_UID);
  const ciaProfile = (await getDoc(doc(db, 'omniplay-member-access', ciaUid))).data();
  assert.equal(ciaProfile.superAdmin, true);
  assert.equal(ciaProfile.username, 'Cia_Cia');
  globalThis.window.__omniplaySession = { superAdmin: true, authUid: ciaUid };
  await access.getDoc(doc(db, 'omniplay', 'workspace'));
  workspace.ciaAdminTest = true;
  await access.setDoc(doc(db, 'omniplay', 'workspace'), workspace);
  assert.equal((await getDoc(doc(db, 'omniplay', 'workspace'))).data().ciaAdminTest, true);
  assert.equal(auth.currentUser.uid, ciaUid);
  await deleteApp(viewer); await deleteApp(primary); await deleteAdmin(server); await env.cleanup();
});
