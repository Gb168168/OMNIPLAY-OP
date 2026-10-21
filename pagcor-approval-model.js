export const PAGCOR_COLLECTION = 'omniplay-pagcor-approvals';
export const MAX_APPROVAL_FILE_BYTES = 20 * 1024 * 1024;
export const APPROVAL_CHUNK_BYTES = 256 * 1024;
export const MAX_APPROVAL_ITEMS = 50;

// Group preview shows only content shared by every platform in that group.
// An individual platform preview passes exactly one ID. Empty identity never grants access.
export function approvalPreviewAllowed(approval, platformIds) {
  return Array.isArray(platformIds) && platformIds.length > 0
    && platformIds.every(id => typeof id === 'string' && id !== '' && approval.allowedPlatformIds?.includes(id));
}

export function approvalLink(value) {
  const text = String(value || '').trim();
  if (text.length > 2048) throw new Error('連結網址上限 2048 字元');
  const url = new URL(text);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('請輸入 http 或 https 連結');
  }
  return url.href;
}

export function normalizeApproval(input, platforms) {
  const known = new Set(platforms.map(platform => platform.id));
  const allowedPlatformIds = [...new Set(input.allowedPlatformIds || [])];
  if (allowedPlatformIds.length > 400) throw new Error('最多開放 400 個平台');
  if (allowedPlatformIds.some(id => !known.has(id))) throw new Error('平台資料已變更，請重新開啟設定');
  const items = input.items || [];
  if (items.length > MAX_APPROVAL_ITEMS) throw new Error('每款遊戲最多 50 個項目');
  const ids = new Set();
  for (const item of items) {
    if (!item.id || ids.has(item.id) || !String(item.name || '').trim()) throw new Error('項目名稱或識別碼不正確');
    ids.add(item.id);
    if (item.kind === 'link') approvalLink(item.url);
    else if (item.kind !== 'file' || !Number.isInteger(item.chunkCount) || item.chunkCount !== Math.ceil(item.size / APPROVAL_CHUNK_BYTES) ||
      !Number.isFinite(item.size) || item.size <= 0 || item.size > MAX_APPROVAL_FILE_BYTES) {
      throw new Error('檔案資料不正確');
    }
  }
  return {
    allowedPlatformIds,
    fileIds: items.filter(item => item.kind === 'file').map(item => item.id),
    items: items.map(item => item.kind === 'link'
      ? { id: item.id, kind: 'link', name: String(item.name).trim().slice(0, 160), url: approvalLink(item.url) }
      : { id: item.id, kind: 'file', name: String(item.name).trim().slice(0, 160), chunkCount: item.chunkCount,
        type: String(item.type || 'application/octet-stream'), size: item.size }),
  };
}

// Never infer a platform from a shared group or a display name.
export function memberPlatformId(member, group, platforms, kind = 'member') {
  const id = kind === 'customer' ? member.id : member.platformId;
  return platforms.some(platform => platform.id === id && platform.groupId === group.id) ? id : '';
}
