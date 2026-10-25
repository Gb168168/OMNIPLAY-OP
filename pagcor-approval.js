import { getFirestore, doc, getDocFromServer, runTransaction, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { uploadApprovalFile, readApprovalFile, removeApprovalFile } from './pagcor-approval-files.js';
import { PAGCOR_COLLECTION, MAX_APPROVAL_FILE_BYTES, MAX_APPROVAL_ITEMS, approvalLink, normalizeApproval, approvalPreviewAllowed } from './pagcor-approval-model.js?v=20261021-preview-2';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const english = () => localStorage.getItem('omniplay-customer-language') === 'en';
const label = (zh, en) => english() ? en : zh;
function installStyle() {
  if (document.getElementById('pagcorApprovalStyle')) return;
  const style = document.createElement('style'); style.id = 'pagcorApprovalStyle';
  style.textContent = `.pagcor-dialog{width:min(820px,calc(100vw - 32px));max-height:88vh;border:1px solid #cbd7e6;border-radius:16px;padding:22px;background:#fff;color:#172033}.pagcor-dialog::backdrop{background:#0f172a88}.pagcor-dialog h2{margin:0}.pagcor-head,.pagcor-tools,.pagcor-item{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pagcor-head{justify-content:space-between}.pagcor-section{margin:18px 0;padding:15px;border:1px solid #d7e0ec;border-radius:12px}.pagcor-platforms{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;max-height:210px;overflow:auto}.pagcor-platforms label{display:flex;gap:8px;align-items:center;padding:8px;background:#f5f8fc;border-radius:7px}.pagcor-platforms input{width:auto}.pagcor-platforms label[hidden]{display:none}.pagcor-items{display:grid;gap:12px}.pagcor-item{padding:12px;border:1px solid #d7e0ec;border-radius:10px}.pagcor-item span{flex:1;overflow-wrap:anywhere;min-width:150px}.pagcor-item img{max-width:160px;max-height:100px;object-fit:contain}.pagcor-dialog button,.pagcor-dialog a{border:1px solid #b9cee7;border-radius:8px;background:#edf5ff;color:#315d8e;padding:8px 12px;cursor:pointer;text-decoration:none}.pagcor-dialog input:not([type=checkbox]){padding:10px;border:1px solid #c7d5e4;border-radius:8px;max-width:100%;box-sizing:border-box}.pagcor-links{display:grid;grid-template-columns:1fr 2fr auto;gap:8px}.pagcor-footer{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:18px}.pagcor-status{white-space:pre-wrap;color:#a12b3a;font-size:13px;flex:1}.pagcor-dialog button:disabled{opacity:.5;cursor:wait}.pagcor-help{font-size:13px;color:#65758c;line-height:1.6}@media(max-width:600px){.pagcor-links{grid-template-columns:1fr}}`;
  document.head.append(style);
}

export async function mountPagcorApproval({ container, game, state, readOnly = false, previewGroupId = null, previewPlatformIds = null }) {
  const admin = !readOnly && !previewGroupId && !!window.__omniplayCanEdit;
  if (previewGroupId && (!window.__omniplayCanEdit || !Array.isArray(previewPlatformIds) || !previewPlatformIds.length)) return;
  const reference = doc(getFirestore(), PAGCOR_COLLECTION, game.id);
  let data = { allowedPlatformIds: [], items: [], revision: 0 };
  try {
    const snapshot = await getDocFromServer(reference);
    if (snapshot.exists()) data = snapshot.data();
    else if (!admin) return;
    if (previewGroupId) {
      if (!approvalPreviewAllowed(data, previewPlatformIds)) {
        if (previewPlatformIds.some(id => data.allowedPlatformIds?.includes(id)) && container.isConnected) {
          const note = document.createElement('p'); note.className = 'pagcor-help';
          note.textContent = '此群組的平台權限不同，請在上方選擇個別平台預覽。'; container.append(note);
        }
        return;
      }
      // Preview uses the internal user's connection, so explicitly reproduce the server's access checks.
      const [group, catalog, ...platforms] = await Promise.all([
        getDocFromServer(doc(getFirestore(), 'omniplay-group-views', previewGroupId)),
        getDocFromServer(doc(getFirestore(), 'omniplay-group-views', previewGroupId, 'documents', 'op-game-customer-records')),
        ...previewPlatformIds.map(id => getDocFromServer(doc(getFirestore(), 'omniplay-platform-access', id))),
      ]);
      if (!group.exists() || group.data().enabled !== true || !group.data().allowedDocumentIds?.includes('op-game-customer-records')
        || !catalog.exists() || !Object.hasOwn(catalog.data().records || {}, game.id)) return;
      if (platforms.some(platform => !platform.exists() || platform.data().enabled !== true || platform.data().groupId !== previewGroupId)) {
        if (container.isConnected) {
          const note = document.createElement('p'); note.className = 'pagcor-help';
          note.textContent = '平台權限尚未同步，請先執行「同步帳號與權限」後再預覽。'; container.append(note);
        }
        return;
      }
    }
  } catch (error) {
    if (!admin) return; // Unauthorized clients receive neither metadata nor attachments.
    const status = document.createElement('p'); status.className = 'pagcor-help';
    status.textContent = 'Pagcor Approval 載入失敗：' + (error.code || error.message);
    if (container.isConnected) container.append(status);
    return;
  }
  if (!container.isConnected) return;
  installStyle();
  const button = document.createElement('button'); button.type = 'button'; button.className = 'op-browser-folder';
  let opened = null, addButton = null;
  const renderEntry = () => {
    const count = Array.isArray(data.items) ? data.items.length : 0;
    button.hidden = count === 0; button.style.display = count ? '' : 'none';
    button.innerHTML = '<span>📄</span><strong>Pagcor Approval</strong><small>' +
      (admin ? '獨立平台權限 · ' : '') + count + ' ' + label('個項目', 'items') + '</small>';
    if (addButton) { addButton.hidden = count > 0; addButton.style.display = count ? 'none' : ''; }
    if (count) container.querySelector('.op-browser-empty')?.remove();
    else if (!admin) opened?.close();
  };
  const open = () => { opened = openApproval({ reference, game, platforms: state.customers || [], admin, data,
    onSave: next => { data = next; renderEntry(); } }); };
  button.onclick = open;
  if (admin) {
    const toolbar = container.closest('dialog')?.querySelector('.op-browser-toolbar');
    if (toolbar) { addButton = document.createElement('button'); addButton.type = 'button'; addButton.className = 'op-folder-add';
      addButton.textContent = '＋ 新增 Pagcor Approval'; addButton.onclick = open; toolbar.append(addButton); }
  }
  container.prepend(button); renderEntry();
  const unsubscribe = onSnapshot(reference, snapshot => {
    if (snapshot.exists()) {
      data = snapshot.data();
      if (previewGroupId && !approvalPreviewAllowed(data, previewPlatformIds)) { button.remove(); addButton?.remove(); opened?.close(); return; }
      renderEntry();
    }
    else { data = { allowedPlatformIds: [], items: [], revision: 0 }; renderEntry(); if (!admin) opened?.close(); }
  }, () => { button.remove(); addButton?.remove(); opened?.close(); });
  const cleanup = () => { unsubscribe(); observer.disconnect(); opened?.close(); };
  const observer = new MutationObserver(() => { if (!container.isConnected) cleanup(); });
  observer.observe(document.body, { childList: true, subtree: true });
  container.closest('dialog')?.addEventListener('close', cleanup, { once: true });
}

function openApproval({ reference, game, platforms, admin, data, onSave }) {
  const dialog = document.createElement('dialog'); dialog.className = 'pagcor-dialog';
  dialog.setAttribute('data-viewer-control', '');
  let items = structuredClone(data.items || []), busy = false, saved = false, saveAttempted = false;
  const initialFiles = new Map(items.filter(item => item.kind === 'file').map(item => [item.id, item]));
  const uploadedFiles = new Map(), objectUrls = new Set();
  dialog.innerHTML = `<div class="pagcor-head"><div><h2>Pagcor Approval</h2><p>${esc(game.id)} · ${esc(game.name)}</p></div><button type="button" data-close>${label('關閉','Close')}</button></div>
    ${admin ? `<section class="pagcor-section"><h3>允許查看的平台</h3><p class="pagcor-help">僅勾選的平台帳號可查看。未勾選任何平台時，只有內部管理者可看。同群組平台不會自動共用此權限。</p><input type="search" data-platform-search aria-label="搜尋平台" placeholder="搜尋平台名稱或域名"><div class="pagcor-platforms">${platforms.map(platform => `<label data-platform-label="${esc((platform.name+' '+(platform.domain||'')).toLowerCase())}"><input type="checkbox" name="approvalPlatform" value="${esc(platform.id)}" ${(data.allowedPlatformIds || []).includes(platform.id) ? 'checked' : ''}><span>${esc(platform.name)}<small> · ${esc(platform.domain || '未填域名')}</small></span></label>`).join('') || '<p>請先在所有平台列表建立平台。</p>'}</div></section>
    <section class="pagcor-section"><h3>圖片 檔案與連結</h3><div class="pagcor-tools"><button type="button" data-upload>上傳圖片／檔案</button><input type="file" data-files multiple hidden><span class="pagcor-help">單檔上限 20 MB，每款遊戲最多 50 個項目。儲存後才套用。填完連結可直接按下方儲存。</span></div><div class="pagcor-links" style="margin-top:12px"><input data-link-name maxlength="160" placeholder="連結名稱，例如：CPS1" aria-label="連結名稱"><input data-link-url type="url" placeholder="完整網址，例如：https://example.com/report" aria-label="連結網址"><button type="button" data-add-link>加入連結</button></div></section>` : ''}
    <div class="pagcor-items"></div><div class="pagcor-footer"><span class="pagcor-status" role="status"></span>${admin ? '<button type="button" data-save>儲存 Pagcor Approval</button>' : ''}</div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('.pagcor-status');
  const cleanupUploads = files => Promise.allSettled([...files].map(file => removeApprovalFile(game.id, file)));
  const close = () => { if (busy) return; dialog.close(); };
  dialog.querySelector('[data-close]').onclick = close;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    if (!saved && !saveAttempted) void cleanupUploads(uploadedFiles.values());
    dialog.remove();
  }, { once: true });
  const setBusy = value => {
    busy = value;
    dialog.querySelectorAll('button,input').forEach(element => element.disabled = value);
  };
  async function blobUrl(item) {
    const blob = await readApprovalFile(game.id, item);
    if (!dialog.isConnected) return null;
    const url = URL.createObjectURL(blob); objectUrls.add(url); return url;
  }
  const draw = () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls.clear();
    const root = dialog.querySelector('.pagcor-items');
    root.innerHTML = items.map(item => `<div class="pagcor-item" data-item-id="${esc(item.id)}"><span>${esc(item.name)}</span>${item.kind === 'link'
      ? `<a href="${esc(approvalLink(item.url))}" target="_blank" rel="noopener noreferrer">${label('開啟連結','Open link')}</a>`
      : `<button type="button" data-download="${esc(item.id)}">${label('下載','Download')}</button>`}${admin ? `<button type="button" data-remove="${esc(item.id)}">移除</button>` : ''}</div>`).join('') || `<p class="pagcor-help">${label('尚無 Pagcor Approval 資料','No Pagcor Approval materials yet')}</p>`;
    root.querySelectorAll('[data-download]').forEach(button => button.onclick = async () => {
      const item = items.find(item => item.id === button.dataset.download);
      button.disabled = true;
      try {
        const url = await blobUrl(item); if (!url) return;
        const link = document.createElement('a'); link.href = url; link.download = item.name; link.click();
      } catch (error) { status.textContent = label('下載失敗，請確認平台權限或重新登入：','Download failed. Check access or sign in again: ') + (error.code || error.message); }
      finally { button.disabled = false; }
    });
    root.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
      if (!confirm('移除這個項目？儲存後生效。')) return;
      items = items.filter(item => item.id !== button.dataset.remove); draw();
    });
    // Preview raster images only; SVG/HTML are treated as downloadable files.
    for (const item of items.filter(item => item.kind === 'file' && /^image\/(png|jpeg|webp|gif)$/.test(item.type))) {
      const row = [...root.children].find(row => row.dataset.itemId === item.id);
      void blobUrl(item).then(url => {
        if (!url || !row.isConnected) return;
        const image = document.createElement('img'); image.alt = item.name; image.src = url; row.prepend(image);
      }).catch(() => { /* The download button reports actionable authorization errors. */ });
    }
  };
  dialog.querySelector('[data-platform-search]')?.addEventListener('input', event => {
    const term = event.target.value.trim().toLowerCase();
    dialog.querySelectorAll('[data-platform-label]').forEach(row => row.hidden = !row.dataset.platformLabel.includes(term));
  });
  if (admin) {
    const picker = dialog.querySelector('[data-files]');
    dialog.querySelector('[data-upload]').onclick = () => picker.click();
    picker.onchange = async () => {
      const files = [...picker.files]; picker.value = '';
      if (!files.length) return;
      if (items.length + files.length > MAX_APPROVAL_ITEMS) { status.textContent = '每款遊戲最多 50 個項目'; return; }
      if (files.some(file => !file.size || file.size > MAX_APPROVAL_FILE_BYTES)) { status.textContent = '請選擇 20 MB 以內的非空白檔案'; return; }
      setBusy(true); status.textContent = '上傳中…';
      try {
        for (const file of files) {
          const item = await uploadApprovalFile(game.id, file);
          uploadedFiles.set(item.id, item);
          items.push(item);
        }
        status.textContent = '已上傳，請儲存以套用';
      } catch (error) { status.textContent = '上傳失敗：' + (error.code || error.message); }
      finally { draw(); setBusy(false); }
    };
    const addPendingLink = () => {
        const name = dialog.querySelector('[data-link-name]'), url = dialog.querySelector('[data-link-url]');
        if (!name.value.trim() && !url.value.trim()) return false;
        if (!name.value.trim()) throw new Error('請輸入連結名稱');
        if (!url.value.trim()) throw new Error('請貼上完整連結網址（https://…）');
        if (items.length >= MAX_APPROVAL_ITEMS) throw new Error('每款遊戲最多 50 個項目');
        let href;
        try { href = approvalLink(url.value); }
        catch { throw new Error('連結網址無效，請貼上完整的 http:// 或 https:// 網址'); }
        items.push({ id: crypto.randomUUID(), kind: 'link', name: name.value.trim(), url: href });
        name.value = ''; url.value = ''; status.textContent = '請儲存以套用'; draw();
        return true;
    };
    dialog.querySelector('[data-add-link]').onclick = () => {
      try {
        if (!addPendingLink()) throw new Error('請輸入連結名稱與完整網址');
      } catch (error) { status.textContent = error.message; }
    };
    dialog.querySelector('[data-save]').onclick = async () => {
      setBusy(true); status.textContent = '儲存中…';
      try {
        // Save the visible draft too; never silently discard text left in the link fields.
        addPendingLink();
        status.textContent = '儲存中…';
        const next = normalizeApproval({ items, allowedPlatformIds: [...dialog.querySelectorAll('[name=approvalPlatform]:checked')].map(input => input.value) }, platforms);
        const revision = Number(data.revision || 0);
        saveAttempted = true;
        await runTransaction(getFirestore(), async transaction => {
          const snapshot = await transaction.get(reference);
          if (Number(snapshot.data()?.revision || 0) !== revision) throw new Error('其他人已修改此遊戲的 Pagcor Approval，請關閉後重新開啟');
          transaction.set(reference, { ...next, revision: revision + 1, updatedAt: new Date().toISOString() });
        });
        saved = true; onSave({ ...next, revision: revision + 1 });
        const retained = new Set(next.fileIds);
        await cleanupUploads([...initialFiles.values(), ...uploadedFiles.values()].filter(item => !retained.has(item.id)));
        dialog.close();
      } catch (error) { status.textContent = '儲存失敗：' + (error.message || error.code); }
      finally { setBusy(false); }
    };
  }
  draw(); dialog.showModal();
  return dialog;
}

