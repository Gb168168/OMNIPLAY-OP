import { projectLinkedRow } from './group-field-values.js?v=20261021-group-values-1';
import { memberPlatformId } from './pagcor-approval-model.js';
import { gameListRows, preferredGameRows } from './game-list-source.js?v=20261009-online-source-1';
import { automaticGameFolders } from './resource-links.js?v=20261009-auto-game-links-1';
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
      internal: ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group.name || '').trim()),
      platformId: memberPlatformId(member, group, workspace.customers || [], kind) });
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
export function isInternalReferenceCategory(category) {
  return String(category?.name || '').replace(/^\s*📁\s*/, '').trim() === '內部參考，請勿外流';
}

// Visibility is an additional gate; existing group grants still apply.
export function platformVisible(category, page = null) {
  if (isInternalReferenceCategory(category)) return false;
  const manual = [category?.name, category?.displayName].some(name => String(name || '').replace(/^\s*📁\s*/, '').trim() === '操作手冊');
  return category?.platformVisible !== false && (!manual || category.platformVisible === true) && page?.platformVisible !== false;
}
export function explicitlyShared(category,page){return platformVisible(category,page)&&(category.platformVisible===true||page.platformVisible===true);}
function sharedSheet(page,sources){
 const source=sources?.get('sheet-'+page.id);let snapshot=page.snapshot;
 if(source?.format==='json-chunks-v1'){
  const chunks=Array.from({length:Number(source.chunkCount)},(_,index)=>sources.get('sheet-'+page.id+'-chunk-'+index)?.data);
  if(chunks.some(chunk=>typeof chunk!=='string'))throw Error('手冊資料尚未完整儲存，請稍後重試');
  snapshot=JSON.parse(chunks.join(''));
 }else if(typeof source?.snapshotJson==='string')snapshot=JSON.parse(source.snapshotJson);
 else if(source?.snapshot)snapshot=source.snapshot;
 return {...page,snapshot:snapshot||{name:page.name},platformShared:true};
}
function internalGroup(group) { return ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group?.name || '').trim()); }
export const CUSTOMER_OP_PAGE = 'page_op_game_customer';
export const CUSTOMER_OP_DOCUMENT = 'op-game-customer-records';
export function ensureCustomerOpPage(workspace) {
  workspace.categories ||= [];
  const source = workspace.categories.filter(isInternalReferenceCategory).flatMap(category => category.pages || []).find(page => String(page.name || '').trim() === 'OP GAME');
  if (!source) return false;
  if (workspace.categories.some(category => (category.pages || []).some(page => page.id === CUSTOMER_OP_PAGE))) return false;
  let category = workspace.categories.find(category => String(category.name || '').trim() === 'OMNIPLAY遊戲_客戶參考文件');
  if (!category) { category = { id: 'cat_customer_game_reference', name: 'OMNIPLAY遊戲_客戶參考文件', pages: [] }; workspace.categories.push(category); }
  category.pages ||= [];
  category.pages.push({ id: CUSTOMER_OP_PAGE, name: 'OP GAME', type: 'sheet', customerOpGame: true });
  return true;
}
export function customerGameCatalog(rowData = {}, recordData = {}, group = null, workspace = {}) {
  const rows = preferredGameRows(gameListRows(rowData));
  const source = recordData.records || {}, records = {}, fields = ['mandarinName', 'status', 'releaseDate', 'pagcor', 'freeSpin'];
  const selected = rows.filter(row => Array.isArray(row) && String(row[0] ?? '').trim() && (
    !group || (Array.isArray(source[String(row[0]).trim()]?.groupIds) && source[String(row[0]).trim()].groupIds.includes(group.id))
  )).map(row => projectLinkedRow(row.slice(0, 19).map(value => ['string', 'number', 'boolean'].includes(typeof value) ? value : ''), source[String(row[0]).trim()]?.linkedFieldRules, group?.id ?? null));
  for (const row of selected) {
    const id = String(row[0]).trim(), sourceRecord = source[id] || {};
    records[id] = Object.fromEntries(fields.filter(key => ['string','number','boolean'].includes(typeof sourceRecord[key])).map(key => [key, sourceRecord[key]]));
  }
  const assetLinks = {}, allowed = group ? effectiveGroupPages(workspace, group) : new Set();
  const pages = (workspace.categories || []).filter(category => !isInternalReferenceCategory(category)).flatMap(category => category.pages || []).filter(page => allowed.has(page.id) && ['files','photos'].includes(page.type) && (internalGroup(group) || (workspace.categories || []).some(category => (category.pages || []).includes(page) && platformVisible(category,page))));
  const findFolder = (folders, id) => { for (const folder of folders || []) { if (folder.id === id) return folder; const nested = findFolder(folder.folders,id); if (nested) return nested; } return null; };
  for (const id of Object.keys(records)) {
    const links = [], seen = new Set(), sourceRecord = source[id] || {};
    const add = (page, folder, name) => { const key = page.id + '::' + folder.id; if (seen.has(key)) return; seen.add(key); links.push({id:key,pageId:page.id,workspaceFolderId:folder.id,name:String(name || folder.name || 'Files'),type:folder.type === 'photos' ? 'photos' : 'files'}); };
    for (const link of sourceRecord.folders || []) { const page = pages.find(page => page.id === link.pageId || (page.legacyAssetPageIds || []).includes(link.pageId)), folder = page && findFolder(page.folders,link.workspaceFolderId); if (folder) add(page,folder,link.name); }
    const row=selected.find(row=>String(row[0]).trim()===id);
    for(const link of automaticGameFolders(workspace,{id,name:row?.[2]||''},allowed)){const page=pages.find(page=>page.id===link.pageId),folder=findFolder(page?.folders,link.workspaceFolderId);if(page&&folder)add(page,folder,link.name)}
    const assetIds = (sourceRecord.assetIds || sourceRecord.resourceIds || []).filter(key => typeof key === 'string' && pages.some(page => page.id === key.split('::')[0]));
    if (links.length || assetIds.length) assetLinks[id] = {folders:links,assetIds};
  }
  return { rowsJson: JSON.stringify(selected), records, ...(Object.keys(assetLinks).length ? {assetLinks} : {}) };
}

export function projectGroupGameDocument(id, value, rowData, recordData, group, workspace) {
  if (id === CUSTOMER_OP_DOCUMENT) return customerGameCatalog(rowData, recordData, group, workspace);
  const internal = ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group.name || '').trim());
  if (!internal && id === 'op-game-form-records') return { records: customerGameCatalog(rowData, recordData, group, workspace).records, updatedAt: value?.updatedAt || '' };
  if (!internal && id === 'game-list-online-page') return { rowsJson: customerGameCatalog(rowData, recordData, group, workspace).rowsJson, updatedAt: value?.updatedAt || '' };
  // Keep previously granted document IDs usable for sync, but replace hidden
  // page copies with a tombstone so an old direct URL cannot reveal their data.
  if (!internal && /^sheet-/.test(id)) {
    const entry=(workspace.categories||[]).flatMap(category=>(category.pages||[]).map(page=>({category,page}))).find(({page})=>id==='sheet-'+page.id || id.startsWith('sheet-'+page.id+'-chunk-'));
    if (entry && !platformVisible(entry.category,entry.page)) return {restricted:true};
  }
  return withoutCredentials(value);
}

export function effectiveGroupPages(workspace, group) {
  const internal = ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group.name || '').trim());
  const privateIds = new Set((workspace.categories || []).filter(isInternalReferenceCategory).flatMap(category => (category.pages || []).map(page => page.id)));
  const allowed = new Set((group.allowedPages || []).filter(id => internal || !privateIds.has(id)));
  if (internal) for (const id of privateIds) allowed.add(id);
  return allowed;
}
export function groupWorkspace(workspace, group, sources = null) {
  const allowed = effectiveGroupPages(workspace, group), platformAccess =
    ['OMNIPLAY', 'OMNIPLAY Support'].includes(String(group.name || '').trim()) && allowed.has(PLATFORM_PERMISSION);
  const categories = (workspace.categories || []).map(category => ({ ...category,
    pages: (category.pages || []).filter(page => (allowed.has(page.id)||explicitlyShared(category,page)) && (internalGroup(group) || platformVisible(category,page))).map(page=>!internalGroup(group)&&explicitlyShared(category,page)&&page.type==='sheet'&&!page.customerOpGame?sharedSheet(page,sources):page) })).filter(category => category.pages.length);
  const result = {
    categories, customerGroups: platformAccess ? workspace.customerGroups : [group],
    customers: platformAccess ? workspace.customers : [],
    customerTypeOptions: workspace.customerTypeOptions || [], customerProgressOptions: workspace.customerProgressOptions || [],
    customerCommAppOptions: workspace.customerCommAppOptions || [], customerOptionVersion: workspace.customerOptionVersion || 0,
    platformImportVersion: workspace.platformImportVersion || 0, updatedAt: workspace.updatedAt || '',
    allowedPages: [...allowed], enabled: true,
  };
  const view=withoutCredentials(result);
  if(new TextEncoder().encode(JSON.stringify(view)).length>900000)throw Error('平台手冊內容過大，請改用檔案或連結分享');
  return view;
}
export function groupDocumentIds(workspace, group, sourceIds) {
  const allowed = effectiveGroupPages(workspace, group);
  const pages = (workspace.categories || []).flatMap(category => category.pages || []).filter(page => allowed.has(page.id));
  const ids = new Set();
  for (const page of pages.filter(page => page.type === 'sheet' && !page.customerOpGame)) {
    const base = 'sheet-' + page.id;
    for (const id of sourceIds) if (id === base || id.startsWith(base + '-chunk-')) ids.add(id);
  }
  if (pages.some(page => !page.customerOpGame && ['op game', 'game list_online'].includes(String(page.name || '').trim().toLowerCase()))) {
    ids.add('game-list-online-page');
  }
  if (pages.some(page => !page.customerOpGame && String(page.name || '').trim().toLowerCase() === 'op game')) ids.add('op-game-form-records');
    const result = [...ids].filter(id => sourceIds.includes(id));
  if (pages.some(page => page.customerOpGame)) result.push(CUSTOMER_OP_DOCUMENT);
  return result;
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



