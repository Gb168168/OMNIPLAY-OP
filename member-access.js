import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, setPersistence, inMemoryPersistence, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updatePassword, signOut } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc as firebaseGetDoc,
  setDoc as firebaseSetDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { ADMIN_UID, ADMIN_EMAIL, ADMIN_USERNAME, normalizeUsername, digest, collectMembers, memberCredentials, groupWorkspace,
  groupDocumentIds, withoutCredentials, publicWorkspace, hydratePasswords } from './member-model.js?v=20261008-internal-1';

let syncQueue = Promise.resolve(), bindings = null, sources = null, refreshTimer;
const written = new Map();
async function configuration(db = getFirestore()) {
  const snap = await firebaseGetDoc(doc(db, 'omniplay-security', 'access'));
  return snap.exists() ? snap.data() : null;
}
async function owner(db = getFirestore()) {
  const user = getAuth().currentUser;
  if (!user) return false;
  return user.uid === ((await configuration(db))?.ownerUid || ADMIN_UID);
}
async function editable(db = getFirestore()) {
  if (await owner(db)) return true;
  const user = getAuth().currentUser;
  if (!user) return false;
  const config = await configuration(db), snap = await firebaseGetDoc(doc(db, 'omniplay-member-access', user.uid));
  return config?.credentialsMigrated === true && snap.exists() && snap.data().enabled === true && ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(snap.data().groupName || '').trim());
}
async function passwordSecrets(db) {
  const result = new Map();
  const snap = await getDocs(collection(db, 'omniplay-member-secrets'));
  for (const item of snap.docs) result.set(item.data().key, item.data());
  return result;
}
async function storePasswords(db, workspace) {
  for (const member of collectMembers(workspace)) await firebaseSetDoc(doc(db, 'omniplay-member-secrets', await digest(member.key)), { key: member.key, password: member.password });
}
export async function getDoc(ref) {
  const session = window.__omniplaySession;
  if (session && !session.canEdit && !session.superAdmin && ref.path.startsWith('omniplay/')) {
    const id = ref.path.slice('omniplay/'.length);
    return firebaseGetDoc(id === 'workspace'
      ? doc(ref.firestore, 'omniplay-group-views', session.groupId)
      : doc(ref.firestore, 'omniplay-group-views', session.groupId, 'documents', id));
  }
  const snap = await firebaseGetDoc(ref);
  if (ref.path !== 'omniplay/workspace' || !snap.exists() || !await owner(ref.firestore)) return snap;
  const data = hydratePasswords(snap.data(), await passwordSecrets(ref.firestore));
  return { exists: () => true, data: () => data, id: snap.id, ref: snap.ref };
}
export async function setDoc(ref, data, options) {
  if (ref.path === 'omniplay/workspace') {
    if (await owner(ref.firestore)) await storePasswords(ref.firestore, data);
    await firebaseSetDoc(ref, publicWorkspace(data), options);
  } else await firebaseSetDoc(ref, data, options);
  if (!await editable(ref.firestore) || !ref.path.startsWith('omniplay/')) return;
  clearTimeout(refreshTimer);
  if (ref.path === 'omniplay/workspace') return syncMembersAndViews(ref.firestore, data);
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
  const primary = getApps().find(app => app.name === '[DEFAULT]');
  const auxiliary = getApps().find(app => app.name === 'member-provisioning') || initializeApp(primary.options, 'member-provisioning');
  const auth = getAuth(auxiliary);
  await setPersistence(auth, inMemoryPersistence);
  try {
    let user;
    if (previous?.email === credentials.email) {
      user = (await signInWithEmailAndPassword(auth, previous.email, previous.password)).user;
      if (previous.password !== credentials.password) await updatePassword(user, credentials.password);
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
export async function syncMembersAndViews(db, workspace) {
  if (!await editable(db)) return;
  syncQueue = syncQueue.catch(() => {}).then(() => synchronize(db, workspace));
  return syncQueue;
}
async function synchronize(db, workspace) {
  if (!await editable(db)) throw new Error('請使用管理員登入');
  const isOwner = await owner(db);
  {
    const snapshot = await getDocs(collection(db, 'omniplay'));
    sources = new Map(snapshot.docs.map(item => [item.id, item.data()]));
  }
  if (isOwner && !bindings) {
    const snapshot = await getDocs(collection(db, 'omniplay-member-bindings'));
    bindings = new Map(snapshot.docs.map(item => [item.id, item.data()]));
  }
  let data = workspace || sources.get('workspace');
  if (isOwner && data) data = hydratePasswords(data, await passwordSecrets(db));
  if (!data) throw new Error('找不到工作區資料');
  if (isOwner) {
    await storePasswords(db, data);
    await firebaseSetDoc(doc(db, 'omniplay', 'workspace'), publicWorkspace(data));
    const config = await configuration(db);
    if (!config?.credentialsMigrated) await firebaseSetDoc(doc(db, 'omniplay-security', 'access'), { ownerUid: config?.ownerUid || ADMIN_UID, ownerUsername: config?.ownerUsername || ADMIN_EMAIL, credentialsMigrated: true });
  }
  sources.set('workspace', data);
  const members = isOwner ? collectMembers(data) : [], profiles = isOwner ? await getDocs(collection(db, 'omniplay-member-access')) : null;
  const previous = new Map(profiles ? profiles.docs.map(item => [item.id, item.data()]) : []);
  // Revoke deleted/renamed members before publishing any new view.
  const memberKeys = new Set(members.map(member => member.key));
  for (const [uid, profile] of previous) {
    const member = members.find(item => item.key === profile.memberKey);
    if (!memberKeys.has(profile.memberKey) || member.username !== profile.username) {
      await firebaseSetDoc(doc(db, 'omniplay-member-access', uid), { ...profile, enabled: false, superAdmin: false, role: profile.role === 'admin' && getAuth().currentUser.uid !== ADMIN_UID ? 'admin' : 'member' });
    }
  }
  const groups = data.customerGroups || [], oldViews = await getDocs(collection(db, 'omniplay-group-views'));
  for (const view of oldViews.docs) if (isOwner && !groups.some(group => group.id === view.id)) {
    await firebaseSetDoc(view.ref, { enabled: false });
    written.delete(view.ref.path);
  }
  for (const group of groups) {
    const view = groupWorkspace(data, group), ids = groupDocumentIds(data, group, [...sources.keys()]);
    view.allowedDocumentIds = isOwner ? ids : (oldViews.docs.find(item => item.id === group.id)?.data().allowedDocumentIds || []);
    if (!isOwner && !oldViews.docs.some(item => item.id === group.id)) continue;
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
      const profile = { ...safe, memberKey: key, enabled: true,
        superAdmin: false, role: previous.get(uid)?.role === 'admin' && getAuth().currentUser.uid !== ADMIN_UID ? 'admin' : 'member' };
      if (JSON.stringify(previous.get(uid)) !== JSON.stringify(profile)) {
        await firebaseSetDoc(doc(db, 'omniplay-member-access', uid), profile);
      }
    } catch (error) { failures.push(`${member.username} (${error.code || '同步失敗'})`); }
  }
  if (failures.length) throw new Error('人員登入未完成：' + failures.join('、'));

}

export async function listMemberProfiles(db = getFirestore()) {
  if (!await owner(db)) throw new Error('只有最高管理者可以管理權限');
  const config = await configuration(db), snap = await getDocs(collection(db, 'omniplay-member-access'));
  return snap.docs.map(item => ({ uid: item.id, ...item.data(), owner: item.id === config?.ownerUid }));
}
export async function setMemberRole(uid, role, db = getFirestore()) {
  const config = await configuration(db);
  if (!await owner(db) || config?.ownerUid === ADMIN_UID) throw new Error('只有 Rondo 可以任免管理員');
  if (uid === config.ownerUid) throw new Error('不能變更 Rondo 的最高管理者身分');
  if (!['admin', 'member'].includes(role)) throw new Error('無效的管理員權限');
  const ref = doc(db, 'omniplay-member-access', uid), snap = await firebaseGetDoc(ref);
  if (!snap.exists() || snap.data().enabled !== true) throw new Error('此人員尚未啟用');
  if (role === 'admin' && !['OMNIPLAY', 'OMNIPLAY Support'].includes(String(snap.data().groupName || '').trim())) throw new Error('其他群組只能查看與下載，不能設為管理員');
  await firebaseSetDoc(ref, { role, superAdmin: false }, { merge: true });
}
export async function transferToRondo(password, db = getFirestore()) {
  const config = await configuration(db);
  if (!await owner(db) || (config?.ownerUid || ADMIN_UID) !== ADMIN_UID) throw new Error('此工作區已完成最高管理者交接');
  if (!password) throw new Error('請設定 Rondo 的登入密碼');
  const snap = await getDoc(doc(db, 'omniplay', 'workspace'));
  if (!snap.exists()) throw new Error('找不到工作區');
  const workspace = snap.data();
  workspace.customerGroups ||= [];
  let group = (workspace.customerGroups || []).find(item => (item.members || []).some(member => normalizeUsername(member.username) === 'rondo'));
  if (!group) group = (workspace.customerGroups || []).find(item => ['OMNIPLAY', 'OMNIPLAY Support'].includes(item.name));
  if (!group) { group = { id: 'rondo-owner-group', name: 'OMNIPLAY', members: [], allowedPages: [], pageOrder: [] }; workspace.customerGroups.push(group); }
  group.members ||= [];
  let member = group.members.find(item => normalizeUsername(item.username) === 'rondo');
  if (!member) { member = { id: 'rondo-owner', name: 'Rondo', username: 'Rondo' }; group.members.push(member); }
  member.password = password;
  let syncError;
  try { await setDoc(doc(db, 'omniplay', 'workspace'), workspace); } catch (error) { syncError = error; }
  if (!(await configuration(db))?.credentialsMigrated) throw syncError || new Error('人員密碼尚未完成移轉');
  const profiles = await listMemberProfiles(db), candidate = profiles.find(item => normalizeUsername(item.username) === 'rondo' && item.enabled);
  if (!candidate) throw syncError || new Error('Rondo 的登入帳號尚未同步完成');
  const auxiliary = getApps().find(app => app.name === 'member-provisioning'), auth = getAuth(auxiliary);
  const credentials = await memberCredentials('Rondo', password);
  try {
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    // A member can read this harmless config only under the new rules. This
    // prevents handing off while the old administrator-only rules are active.
    try { await firebaseGetDoc(doc(getFirestore(auxiliary), 'omniplay-security', 'access')); }
    catch { throw new Error('請先發布新版 Firebase 規則，再按「建立 Rondo 並交接」'); }
    if (auth.currentUser.uid !== candidate.uid) throw new Error('Rondo 的登入身分驗證失敗');
    await firebaseSetDoc(doc(db, 'omniplay-security', 'access'), {
      ownerUid: candidate.uid, ownerUsername: 'Rondo', credentialsMigrated: true,
    });
  } finally { await signOut(auth); }
  await signOut(getAuth());
}
