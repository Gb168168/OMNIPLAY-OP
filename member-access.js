import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, setPersistence, inMemoryPersistence, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updatePassword, signOut } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc as firebaseGetDoc,
  setDoc as firebaseSetDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { ADMIN_UID, digest, collectMembers, memberCredentials, groupWorkspace,
  groupDocumentIds, withoutCredentials } from './member-model.js?v=20261007-startup-3';

let syncQueue = Promise.resolve(), bindings = null, sources = null, refreshTimer;
const written = new Map();
const admin = () => window.__omniplaySession?.superAdmin === true && getAuth().currentUser?.uid === ADMIN_UID;
export function getDoc(ref) {
  const session = window.__omniplaySession;
  if (session && !session.superAdmin && ref.path.startsWith('omniplay/')) {
    const id = ref.path.slice('omniplay/'.length);
    return firebaseGetDoc(id === 'workspace'
      ? doc(ref.firestore, 'omniplay-group-views', session.groupId)
      : doc(ref.firestore, 'omniplay-group-views', session.groupId, 'documents', id));
  }
  return firebaseGetDoc(ref);
}
export async function setDoc(ref, data, options) {
  await firebaseSetDoc(ref, data, options);
  if (!admin() || !ref.path.startsWith('omniplay/')) return;
  if (sources) {
    const id = ref.path.slice('omniplay/'.length);
    sources.set(id, options?.merge ? { ...(sources.get(id) || {}), ...data } : data);
  }
  clearTimeout(refreshTimer);
  if (ref.path === 'omniplay/workspace') return syncMembersAndViews(ref.firestore, data);
  // Sheet chunks may be written in parallel. Publish after those writes settle.
  refreshTimer = setTimeout(() => syncMembersAndViews(ref.firestore).catch(showSyncError), 600);
}
function showSyncError(error) {
  const status = document.querySelector('#cloudStatus');
  if (status) status.textContent = '⚠️ 人員登入同步失敗：' + String(error.message || error.code || '連線異常').slice(0, 100);
}
async function provision(db, member) {
  const key = await digest(member.key), credentials = await memberCredentials(member.username, member.password);
  const aliasKey = 'alias-' + await digest(credentials.email);
  const previous = bindings.get(key)?.email === credentials.email ? bindings.get(key) : bindings.get(aliasKey);
  if (previous?.password === credentials.password) {
    if (!bindings.has(key)) {
      await firebaseSetDoc(doc(db, 'omniplay-member-bindings', key), previous);
      bindings.set(key, previous);
    }
    return previous.uid;
  }
  const primary = getApps().find(app => app.name === '[DEFAULT]');
  const auxiliary = getApps().find(app => app.name === 'member-provisioning') || initializeApp(primary.options, 'member-provisioning');
  const auth = getAuth(auxiliary);
  await setPersistence(auth, inMemoryPersistence);
  try {
    let user;
    if (previous?.email === credentials.email) {
      user = (await signInWithEmailAndPassword(auth, previous.email, previous.password)).user;
      await updatePassword(user, credentials.password);
    } else {
      try { user = (await createUserWithEmailAndPassword(auth, credentials.email, credentials.password)).user; }
      catch (error) {
        if (error.code !== 'auth/email-already-in-use') throw error;
        user = (await signInWithEmailAndPassword(auth, credentials.email, credentials.password)).user;
      }
    }
    if (user.uid === ADMIN_UID) throw new Error('人員帳號不可使用管理員身分');
    const binding = { uid: user.uid, ...credentials };
    // Only the administrator can read bindings, including the bridge credential.
    await firebaseSetDoc(doc(db, 'omniplay-member-bindings', key), binding);
    await firebaseSetDoc(doc(db, 'omniplay-member-bindings', aliasKey), binding);
    bindings.set(key, binding);
    bindings.set(aliasKey, binding);
    return user.uid;
  } finally { await signOut(auth); }
}
export function syncMembersAndViews(db, workspace) {
  if (!admin()) return Promise.resolve();
  syncQueue = syncQueue.catch(() => {}).then(() => synchronize(db, workspace));
  return syncQueue;
}
async function synchronize(db, workspace) {
  if (!admin()) throw new Error('請使用管理員登入以同步人員');
  {
    const snapshot = await getDocs(collection(db, 'omniplay'));
    sources = new Map(snapshot.docs.map(item => [item.id, item.data()]));
  }
  if (!bindings) {
    const snapshot = await getDocs(collection(db, 'omniplay-member-bindings'));
    bindings = new Map(snapshot.docs.map(item => [item.id, item.data()]));
  }
  const data = workspace || sources.get('workspace');
  if (!data) throw new Error('找不到工作區資料');
  sources.set('workspace', data);
  const members = collectMembers(data), profiles = await getDocs(collection(db, 'omniplay-member-access'));
  const previous = new Map(profiles.docs.map(item => [item.id, item.data()]));
  // Revoke deleted/renamed members before publishing any new view.
  const memberKeys = new Set(members.map(member => member.key));
  for (const [uid, profile] of previous) {
    const member = members.find(item => item.key === profile.memberKey);
    if (!memberKeys.has(profile.memberKey) || member.username !== profile.username) {
      await firebaseSetDoc(doc(db, 'omniplay-member-access', uid), { ...profile, enabled: false });
    }
  }
  const groups = data.customerGroups || [], oldViews = await getDocs(collection(db, 'omniplay-group-views'));
  for (const view of oldViews.docs) if (!groups.some(group => group.id === view.id)) {
    await firebaseSetDoc(view.ref, { enabled: false });
    written.delete(view.ref.path);
  }
  for (const group of groups) {
    const view = groupWorkspace(data, group), ids = groupDocumentIds(data, group, [...sources.keys()]);
    view.allowedDocumentIds = ids;
    const writes = [[doc(db, 'omniplay-group-views', group.id), view],
      ...ids.map(id => [doc(db, 'omniplay-group-views', group.id, 'documents', id), withoutCredentials(sources.get(id))])];
    // Commit the root allowlist last so a new page is never exposed before its data exists.
    const root = writes.shift(); writes.push(root);
    for (let i = 0; i < writes.length; i += 200) {
      const batch = writeBatch(db), changed = [];
      for (const [ref, value] of writes.slice(i, i + 200)) {
        const serialized = JSON.stringify(value);
        if (written.get(ref.path) === serialized) continue;
        batch.set(ref, value); changed.push([ref.path, serialized]);
      }
      if (changed.length) { await batch.commit(); for (const [path, value] of changed) written.set(path, value); }
    }
  }
  const failures = [];
  for (const member of members) {
    try {
      const uid = await provision(db, member), { password, key, ...safe } = member;
      const profile = { ...safe, memberKey: key, enabled: true };
      if (JSON.stringify(previous.get(uid)) !== JSON.stringify(profile)) {
        await firebaseSetDoc(doc(db, 'omniplay-member-access', uid), profile);
      }
    } catch (error) { failures.push(`${member.username} (${error.code || '同步失敗'})`); }
  }
  if (failures.length) throw new Error('未完成：' + failures.join('、'));
}
