import { getFirestore, doc, getDocFromServer, writeBatch } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { PAGCOR_COLLECTION, APPROVAL_CHUNK_BYTES, MAX_APPROVAL_FILE_BYTES } from './pagcor-approval-model.js';

// Use the same platform authorization for file bytes and metadata. No public
// download tokens or URLs are created, and originals are preserved unchanged.
const chunkRef = (gameId, fileId, index) => doc(getFirestore(), PAGCOR_COLLECTION, gameId, 'files', fileId, 'chunks', String(index));
function base64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
export async function uploadApprovalFile(gameId, file) {
  if (!file.size || file.size > MAX_APPROVAL_FILE_BYTES) throw new Error('單檔上限 20 MB');
  const id = crypto.randomUUID(), chunkCount = Math.ceil(file.size / APPROVAL_CHUNK_BYTES);
  for (let start = 0; start < chunkCount; start += 16) {
    const batch = writeBatch(getFirestore());
    for (let index = start; index < Math.min(start + 16, chunkCount); index++) {
      const bytes = new Uint8Array(await file.slice(index * APPROVAL_CHUNK_BYTES, (index + 1) * APPROVAL_CHUNK_BYTES).arrayBuffer());
      batch.set(chunkRef(gameId, id, index), { data: base64(bytes) });
    }
    await batch.commit();
  }
  return { id, kind: 'file', name: file.name, type: file.type || 'application/octet-stream', size: file.size, chunkCount };
}
export async function readApprovalFile(gameId, item) {
  if (item.kind !== 'file' || item.size > MAX_APPROVAL_FILE_BYTES || item.size <= 0 ||
      item.chunkCount !== Math.ceil(item.size / APPROVAL_CHUNK_BYTES)) throw new Error('檔案資料不正確');
  const parts = [];
  for (let start = 0; start < item.chunkCount; start += 8) {
    const snapshots = await Promise.all(Array.from({ length: Math.min(8, item.chunkCount - start) }, (_, offset) =>
      getDocFromServer(chunkRef(gameId, item.id, start + offset))));
    for (const snapshot of snapshots) {
      if (!snapshot.exists()) throw new Error('檔案內容不完整，請聯絡管理者');
      parts.push(Uint8Array.from(atob(snapshot.data().data), char => char.charCodeAt(0)));
    }
  }
  const blob = new Blob(parts, { type: item.type || 'application/octet-stream' });
  if (blob.size !== item.size) throw new Error('檔案大小不符，請聯絡管理者');
  return blob;
}
export async function removeApprovalFile(gameId, item) {
  const batch = writeBatch(getFirestore());
  for (let index = 0; index < item.chunkCount; index++) batch.delete(chunkRef(gameId, item.id, index));
  await batch.commit();
}
