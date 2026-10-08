export const BOOTSTRAP_UID = 'xqDN3vaLfufEkz4TZ1omSmGkQ2A2';
export const BOOTSTRAP_EMAIL = 'goldbricks168@gmail.com';
export const OWNER_USERNAME = 'Rondo';
export function accessSession(user, config, profile, view) {
  if (!user) return null;
  const ownerUid = config?.ownerUid || BOOTSTRAP_UID;
  if (user.uid === ownerUid) {
    if (ownerUid !== BOOTSTRAP_UID && (!profile?.enabled || profile.username?.toLowerCase() !== 'rondo')) return null;
    return { authUid: user.uid, username: ownerUid === BOOTSTRAP_UID ? BOOTSTRAP_EMAIL : OWNER_USERNAME,
      name: ownerUid === BOOTSTRAP_UID ? BOOTSTRAP_EMAIL : OWNER_USERNAME,
      groupId: profile?.groupId || '__admin__', groupName: '最高管理者', internal: true,
      role: 'owner', superAdmin: true, canEdit: true, bootstrap: ownerUid === BOOTSTRAP_UID, allowedPages: [] };
  }
  if (user.uid === BOOTSTRAP_UID || !profile?.enabled) return null;
  const administrator = config?.credentialsMigrated === true && ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(profile.groupName || '').trim());
  if (!administrator && !view?.enabled) return null;
  return { authUid: user.uid, username: profile.username, name: profile.name || profile.username,
    groupId: profile.groupId, groupName: profile.groupName, internal: !!profile.internal,
    role: administrator ? 'admin' : 'member', superAdmin: false, canEdit: administrator, bootstrap: false,
    allowedPages: administrator ? [] : view.allowedPages || [] };
}
