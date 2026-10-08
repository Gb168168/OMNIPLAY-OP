// No Firebase or DOM dependencies: the same model is used by login and sync.
export const ADMIN_UID = 'xqDN3vaLfufEkz4TZ1omSmGkQ2A2';
export const ADMIN_USERNAME = 'Rondo';
export const ADMIN_EMAIL = 'goldbricks168@gmail.com';
export const PLATFORM_PERMISSION = 'system_all_platforms';
export const normalizeUsername = value => String(value || '').trim().normalize('NFC').toLowerCase();
export const isReservedUsername = value => normalizeUsername(value) === ADMIN_EMAIL;
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function memberCredentials(username, password) {
  return {
    email: `member-${await digest(normalizeUsername(username))}@omniplay-op.invalid`,
    password: await digest('omniplay-member-password-v1:' + password),
  };
}
export function collectMembers(workspace) {
  const groups = workspace.customerGroups || [], result = [], names = new Set();
  const push = (member, group, kind) => {
    const username = String(member.username || (kind === 'customer' ? member.domain : '') || '').trim();
    if (!username || !member.password || isReservedUsername(username)) return;
    if (!member.id || !group?.id) throw new Error('人員必須有識別碼及所屬群組');
    const normalized = normalizeUsername(username);
    if (names.has(normalized)) throw new Error(`登入帳號重複：${username}`);
    names.add(normalized);
    result.push({ key: `${kind}:${group.id}:${member.id}`, username, password: String(member.password),
      name: member.name || username, groupId: group.id, groupName: group.name || '',
      internal: ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group.name || '').trim()) });
  };
  for (const group of groups) for (const member of group.members || []) push(member, group, 'member');
  for (const customer of workspace.customers || []) push(customer, groups.find(group => group.id === customer.groupId), 'customer');
  return result;
}
export function withoutCredentials(value) {
  if (Array.isArray(value)) return value.map(withoutCredentials);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(password|passwordHash|adminAuth|members|authUid|firebaseUid|accessToken|refreshToken|idToken)$/i.test(key))
    .map(([key, item]) => [key, withoutCredentials(item)]));
}
export function groupWorkspace(workspace, group) {
  const allowed = new Set(group.allowedPages || []), platformAccess =
    ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group.name || '').trim()) && allowed.has(PLATFORM_PERMISSION);
  const categories = (workspace.categories || []).map(category => ({ ...category,
    pages: (category.pages || []).filter(page => allowed.has(page.id)) })).filter(category => category.pages.length);
  const result = {
    categories, customerGroups: platformAccess ? workspace.customerGroups : [group],
    customers: platformAccess ? workspace.customers : [],
    customerTypeOptions: workspace.customerTypeOptions || [], customerProgressOptions: workspace.customerProgressOptions || [],
    customerCommAppOptions: workspace.customerCommAppOptions || [], customerOptionVersion: workspace.customerOptionVersion || 0,
    platformImportVersion: workspace.platformImportVersion || 0, updatedAt: workspace.updatedAt || '',
    allowedPages: [...allowed], enabled: true,
  };
  return withoutCredentials(result);
}
export function groupDocumentIds(workspace, group, sourceIds) {
  const allowed = new Set(group.allowedPages || []);
  const pages = (workspace.categories || []).flatMap(category => category.pages || []).filter(page => allowed.has(page.id));
  const ids = new Set();
  for (const page of pages.filter(page => page.type === 'sheet')) {
    const base = 'sheet-' + page.id;
    for (const id of sourceIds) if (id === base || id.startsWith(base + '-chunk-')) ids.add(id);
  }
  if (pages.some(page => ['op game', 'game list_online'].includes(String(page.name || '').trim().toLowerCase()))) {
    ids.add('game-list-online-page');
  }
  if (pages.some(page => String(page.name || '').trim().toLowerCase() === 'op game')) ids.add('op-game-form-records');
  return [...ids].filter(id => sourceIds.includes(id));
}

// Keep account metadata public, but only the owner may hydrate passwords.
export function publicWorkspace(value) {
  if (Array.isArray(value)) return value.map(publicWorkspace);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(password|passwordHash|adminAuth|authUid|firebaseUid|accessToken|refreshToken|idToken)$/i.test(key))
    .map(([key, item]) => [key, publicWorkspace(item)]));
}
export function hydratePasswords(workspace, secrets) {
  const result = structuredClone(workspace);
  for (const group of result.customerGroups || []) for (const member of group.members || []) {
    const secret = secrets.get(`member:${group.id}:${member.id}`);
    if (secret) member.password = secret.password;
  }
  for (const customer of result.customers || []) {
    const secret = secrets.get(`customer:${customer.groupId}:${customer.id}`);
    if (secret) customer.password = secret.password;
  }
  return result;
}
