import { getFirestore, doc, runTransaction } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { syncMembersAndViews } from './member-access.js?v=20261021-group-values-1';
import { LINKED_GAME_FIELDS, createFieldRule, assignFieldGroup, normalizeFieldRules, resolveLinkedValue } from './group-field-values.js?v=20261021-group-values-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openGroupFieldEditor({game, record, groups, onSaved}) {
  if (!window.__omniplayCanEdit) return;
  const dialog = document.createElement('dialog'); dialog.className = 'op-group-value-dialog';
  let draft = structuredClone(record.linkedFieldRules || {}), expected = JSON.stringify(record.linkedFieldRules || {}), key = 'betMax', busy = false, committed = false;
  const style = document.createElement('style'); style.textContent = `.op-group-value-dialog{width:min(850px,calc(100vw - 24px));max-height:90vh;overflow:auto;padding:22px;border:1px solid #cbd7e6;border-radius:14px;background:#fff;color:#172033}.op-group-value-dialog::backdrop{background:#0f172a88}.ogv-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.ogv-row{border:1px solid #d7e0ec;border-radius:10px;padding:14px;margin:12px 0}.ogv-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-top:12px}.ogv-groups label{display:flex;align-items:center;gap:8px;padding:8px;background:#f5f8fc;border-radius:7px}.ogv-groups input{width:auto}.op-group-value-dialog textarea,.op-group-value-dialog select{box-sizing:border-box;max-width:100%;padding:9px;border:1px solid #c7d5e4;border-radius:7px;background:#fff;color:#172033}.op-group-value-dialog textarea{width:100%;min-height:60px;resize:vertical;margin-top:8px;font:14px Arial,sans-serif}.op-group-value-dialog button{padding:8px 12px;border:1px solid #b9cee7;border-radius:8px;background:#edf5ff;color:#315d8e;cursor:pointer}.ogv-help{font-size:13px;color:#65758c}.ogv-status{white-space:pre-wrap;flex:1;color:#a12b3a;font-size:13px}.ogv-preview{margin:16px 0;padding:12px;background:#edf5ff;border-radius:8px}.ogv-preview strong{margin-left:12px;white-space:pre-wrap;overflow-wrap:anywhere}.ogv-row legend{font-weight:600}.ogv-actions{display:flex;justify-content:flex-end;gap:10px;align-items:center;margin-top:18px;flex-wrap:wrap}`;
  dialog.append(style);
  const content = document.createElement('div'); dialog.append(content);
  content.innerHTML = `<div class="ogv-bar"><div><h2 style="margin:0">連動欄位設定</h2><p>${esc(game.id)} · ${esc(game.name)}</p></div><button type="button" data-close>關閉</button></div><p class="ogv-help">每組數值各自指定可查看群組。勾選新值時，會自動取消該群組在舊值的勾選；未另指定的群組使用預設值。這裡維護文件顯示資料。</p><label>選擇欄位 <select data-field>${LINKED_GAME_FIELDS.map(([id,label]) => `<option value="${id}" ${id === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><div data-rows></div><button type="button" data-add>＋ 新增一組數值</button><div class="ogv-preview"><label>群組預覽 <select data-preview>${groups.map(group => `<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('')}</select></label><strong data-result></strong></div><div class="ogv-actions"><span class="ogv-status" role="status"></span><button type="button" data-save>儲存欄位與群組設定</button></div>`;
  const status = content.querySelector('.ogv-status'), rows = content.querySelector('[data-rows]');
  const current = () => draft[key] ||= createFieldRule(game, key);
  const preview = () => { const value = resolveLinkedValue('', current(), content.querySelector('[data-preview]').value); content.querySelector('[data-result]').textContent = value === '' ? '—（此群組未開放）' : value; };
  const draw = () => {
    const rule = current();
    rows.innerHTML = [{value:rule.defaultValue,default:true}, ...rule.variants].map((item,i) => `<fieldset class="ogv-row" data-row="${i-1}"><legend>${i === 0 ? '預設值' : '額外數值 ' + i}</legend><textarea data-value aria-label="${i === 0 ? '預設值' : '額外數值 ' + i}">${esc(item.value)}</textarea>${i ? '<button type="button" data-remove>移除這組數值</button>' : ''}<div class="ogv-groups">${groups.map(group => `<label><input type="checkbox" data-group="${esc(group.id)}" ${(i === 0 ? !rule.defaultExcludedGroupIds.includes(group.id) : item.groupIds.includes(group.id)) ? 'checked' : ''}>${esc(group.name)}</label>`).join('')}</div></fieldset>`).join('');
    preview();
  };
  const dirty = () => { committed = false; status.textContent = '已修改，請儲存以套用'; preview(); };
  rows.oninput = event => {
    if (!event.target.matches('[data-value]')) return;
    const index = Number(event.target.closest('[data-row]').dataset.row);
    if (index === -1) current().defaultValue = event.target.value; else current().variants[index].value = event.target.value;
    dirty();
  };
  rows.onchange = event => {
    if (!event.target.matches('[data-group]')) return;
    const index = Number(event.target.closest('[data-row]').dataset.row), id = event.target.dataset.group;
    const old = assignFieldGroup(current(), index, id, event.target.checked), name = groups.find(group => group.id === id)?.name || id;
    const next = resolveLinkedValue('', current(), id); committed = false; draw();
    status.textContent = `${name} 已改用「${next || '未開放'}」，不再套用原本的「${old || '未開放'}」。請儲存以套用。`;
  };
  rows.onclick = event => {
    const button = event.target.closest('[data-remove]'); if (!button) return;
    const index = Number(button.closest('[data-row]').dataset.row), rule = current(), removed = rule.variants.splice(index, 1)[0];
    rule.defaultExcludedGroupIds = rule.defaultExcludedGroupIds.filter(id => !removed.groupIds.includes(id));
    committed = false; draw(); status.textContent = '已移除這組數值，原群組恢復預設值。請儲存以套用。';
  };
  content.querySelector('[data-field]').onchange = event => { key = event.target.value; draw(); };
  content.querySelector('[data-preview]').onchange = preview;
  content.querySelector('[data-add]').onclick = () => { if (current().variants.length >= 20) {status.textContent = '每個欄位最多 20 組額外數值';return;} current().variants.push({value:'',groupIds:[]}); draw(); dirty(); };
  content.querySelector('[data-close]').onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => dialog.remove(), {once:true});
  content.querySelector('[data-save]').onclick = async () => {
    if (busy) return;
    busy = true; content.querySelectorAll('input,textarea,select,button').forEach(node => node.disabled = true); status.textContent = '儲存與同步群組資料中…';
    try {
      if (!committed) {
        const next = normalizeFieldRules(draft, groups), ref = doc(getFirestore(), 'omniplay', 'op-game-form-records');
        await runTransaction(getFirestore(), async transaction => {
          const snapshot = await transaction.get(ref), prior = snapshot.data()?.records?.[game.id] || {};
          if (!snapshot.exists()) throw Error('遊戲資料不存在，請關閉後重新載入');
          if (JSON.stringify(prior.linkedFieldRules || {}) !== expected) throw Error('其他人已修改此遊戲的欄位設定，請關閉後重新開啟');
          transaction.update(ref, {['records.' + game.id + '.linkedFieldRules']:next, updatedAt:new Date().toISOString()});
        });
        draft = next; expected = JSON.stringify(next); committed = true; record.linkedFieldRules = structuredClone(next); onSaved(next);
      }
      await syncMembersAndViews(getFirestore());
      status.textContent = '已儲存，群組資料已同步'; content.querySelector('[data-save]').textContent = '儲存欄位與群組設定'; draw();
    } catch(error) {
      status.textContent = (committed ? '欄位已儲存，但群組同步失敗：' : '儲存失敗：') + error.message;
      if (committed) content.querySelector('[data-save]').textContent = '重試群組同步';
    } finally { busy = false; content.querySelectorAll('input,textarea,select,button').forEach(node => node.disabled = false); }
  };
  document.body.append(dialog); draw(); dialog.showModal();
  return dialog;
}
