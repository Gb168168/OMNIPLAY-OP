import {getFirestore,collection,query,where,getDocs,doc,writeBatch} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {setDoc,syncMembersAndViews} from './member-access.js?v=20261026-api-entry-editor-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OWNERS={ours:'我方處理',client:'客戶處理',both:'雙方配合',pending:'待確認'};
export async function loadApiEntries(context){
 if(!context.admin)return{entries:context.page?.apiManualEntries||[],overrides:context.page?.apiManualOverrides||[]};
 const snap=await getDocs(query(collection(getFirestore(),'omniplay'),where('apiManualEntry','==',true)));
 const entries=snap.docs.map(item=>({...item.data(),key:item.id.slice('api-manual-entry-'.length)}));
 return {entries,overrides:entries.map(item=>item.key)};
}
export function entryAdminMarkup(item){return '<hr><p><strong>處理責任：</strong>'+esc(OWNERS[item.owner]||'待確認')+'</p><small>'+esc(item.reviewStatus||'')+'</small><details><summary>內部說明（客戶不會收到）</summary><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(item.internalNote||'尚無內部說明')+'</p><small>'+esc(item.sourceRefs||'')+'</small></details>';}
export function openApiEntryEditor(item={},onSaved){
 if(!window.__omniplayCanEdit)return;
 const dialog=document.createElement('dialog');dialog.style.cssText='width:min(760px,calc(100vw - 24px));max-height:90dvh;border:1px solid #cbd9e9;border-radius:14px;padding:22px;background:#fff;color:#253d59';
 dialog.innerHTML='<form><h3 style="margin:0 0 16px">'+(item.key?'編輯說明':'新增說明')+'</h3><div style="display:grid;gap:12px"><label>說明標題<input name="zh" required maxlength="200"></label><label>英文標題（選填）<input name="en" maxlength="200"></label><label>Action<input name="a" type="number" min="1" max="999" required></label><label>處理責任（初步分類可自行修正）<select name="owner">'+Object.entries(OWNERS).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select></label><label>客戶說明（中）<textarea name="answerZh" rows="5" maxlength="12000" placeholder="只放可對客提供的說明；不要放原始內部對話。"></textarea></label><label>客戶說明（英）<textarea name="answerEn" rows="4" maxlength="12000"></textarea></label><label>內部處理說明（只供管理端）<textarea name="internalNote" rows="7" maxlength="30000"></textarea></label><label>來源編號／備註<input name="sourceRefs" maxlength="500"></label><label>確認狀態<input name="reviewStatus" maxlength="100"></label><label style="display:flex;align-items:center;gap:8px"><input style="width:auto" name="customerVisible" type="checkbox" role="switch">客戶可見（只送出客戶說明，不送內部內容）</label><output role="status"></output><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" data-cancel>取消</button><button type="submit">儲存說明</button></div></div></form>';
 dialog.querySelectorAll('label:not(:has([type=checkbox]))').forEach(el=>el.style.cssText='display:grid;gap:5px;font-size:13px');
 dialog.querySelectorAll('input:not([type=checkbox]),textarea,select').forEach(el=>el.style.cssText='width:100%;box-sizing:border-box;border:1px solid #cbd9e9;border-radius:7px;padding:9px;font:inherit;color:#253d59;background:white');
 const form=dialog.querySelector('form');for(const key of ['zh','en','a','owner','answerZh','answerEn','internalNote','sourceRefs','reviewStatus'])form.elements[key].value=item[key]??(key==='owner'?'pending':key==='a'?105:'');form.elements.customerVisible.checked=item.customerVisible===true;
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 form.onsubmit=async event=>{event.preventDefault();const output=form.querySelector('output'),f=new FormData(form),visible=f.has('customerVisible');if(visible&&!String(f.get('answerZh')||f.get('answerEn')||'').trim()){output.textContent='請先填寫客戶說明，再開啟客戶可見。';return;}
 const key=item.key||crypto.randomUUID(),entry={...item,key,apiManualEntry:true,customerVisible:visible,updatedAt:new Date().toISOString()};for(const field of ['zh','en','owner','answerZh','answerEn','internalNote','sourceRefs','reviewStatus'])entry[field]=String(f.get(field)||'').trim();entry.a=Number(f.get('a'));entry.owner=OWNERS[entry.owner]?entry.owner:'pending';entry.example=item.example||'';entry.hintZh=item.hintZh||'';entry.hintEn=item.hintEn||'';
 form.querySelector('[type=submit]').disabled=true;output.textContent='儲存並同步中…';try{await setDoc(doc(getFirestore(),'omniplay','api-manual-entry-'+key),entry);dialog.close();onSaved();}catch(error){output.textContent='儲存失敗：'+error.message;form.querySelector('[type=submit]').disabled=false;}};
 document.body.append(dialog);dialog.showModal();
}
export function importApiEntries(onSaved){
 if(!window.__omniplayCanEdit)return;const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;let progress=document.createElement('dialog');progress.style.cssText='padding:24px;border:1px solid #ccd9e9;border-radius:12px;max-width:500px';document.body.append(progress);progress.textContent='正在檢查匯入資料…';progress.showModal();
 try{const payload=JSON.parse(await file.text()),rows=payload.entries;if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw Error('請提供 1–1000 則說明。');
 const entries=rows.map(item=>{if(!/^[a-zA-Z0-9_-]{1,100}$/.test(item.key||'')||!String(item.zh||'').trim())throw Error('說明格式或編號不正確');return{key:item.key,apiManualEntry:true,zh:String(item.zh).slice(0,200),en:String(item.en||'').slice(0,200),a:Math.max(1,Math.min(999,Number(item.a)||105)),owner:OWNERS[item.owner]?item.owner:'pending',answerZh:String(item.answerZh||'').slice(0,12000),answerEn:String(item.answerEn||'').slice(0,12000),internalNote:String(item.internalNote||'').slice(0,30000),sourceRefs:String(item.sourceRefs||'').slice(0,500),reviewStatus:String(item.reviewStatus||'待人工確認').slice(0,100),customerVisible:false,updatedAt:new Date().toISOString()};});
 const db=getFirestore(),existing=await getDocs(query(collection(db,'omniplay'),where('apiManualEntry','==',true))),savedKeys=new Set(existing.docs.map(item=>item.id));for(let start=0;start<entries.length;start+=100){const batch=writeBatch(db);for(const entry of entries.slice(start,start+100))if(!savedKeys.has('api-manual-entry-'+entry.key))batch.set(doc(db,'omniplay','api-manual-entry-'+entry.key),entry);await batch.commit();progress.textContent='已匯入 '+Math.min(start+100,entries.length)+' / '+entries.length+' 則；所有匯入內容均為內部可見。';}
 await syncMembersAndViews(db);progress.close();progress.remove();onSaved();
 }catch(error){progress.textContent='匯入未完成：'+error.message;const close=document.createElement('button');close.textContent='關閉';close.onclick=()=>{progress.close();progress.remove()};progress.append(close);}};input.click();
}

