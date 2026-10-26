import {getDoc,setDoc} from './member-access.js?v=20261021-group-values-1';
import {getApps} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {getFirestore,doc} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const informationKeys=['mandarinName','gameInformationName','jackpot','status','releaseDate','pagcor','freeSpin','plannedReleaseDate','note1','note2','newFeatureName','featureStatus','featureReleaseDate','previewCopy'];
export function validateReferenceImport(text){
 const data=JSON.parse(text);
 if(!Array.isArray(data.onlineRows)||!data.onlineRows.length||!Array.isArray(data.information)||!data.information.length)throw Error('請提供 onlineRows 與 information 資料');
 const onlineRows=data.onlineRows.map((row,index)=>{
  if(!Array.isArray(row)||row.length!==19||row.some(v=>v!==null&&!['string','number'].includes(typeof v)))throw Error('線上清單第 '+(index+1)+' 列須有 19 個純文字或數值欄位');
  const values=row.map(v=>String(v??''));if(!/^\d{5,}$/.test(values[0])||!/^\d{5,}-.+/.test(values[1]))throw Error('線上清單第 '+(index+1)+' 列遊戲 ID 或版本無效');return values;
 });
 const seen=new Set(),information=data.information.map(row=>{
  const id=String(row?.id||'');if(!/^\d{5,}$/.test(id)||seen.has(id))throw Error('遊戲資訊 ID 無效或重複：'+id);seen.add(id);
  const next={id};for(const key of informationKeys){if(typeof row[key]!=='string')throw Error(id+' 缺少文字欄位 '+key);next[key]=row[key];}
  for(const key of ['releaseDate','plannedReleaseDate','featureReleaseDate'])if(next[key]&&!(key==='plannedReleaseDate'&&next[key]==='查無日期')&&!/^\d{4}-\d{2}-\d{2}$/.test(next[key]))throw Error(id+' 的日期須為 YYYY-MM-DD');
  return next;
 });return{onlineRows,information};
}
export function replaceReferenceSnapshot(snapshot,rows){
 if(!snapshot)return '';
 const next=structuredClone(snapshot),sheet=next.sheets?.[next.sheetOrder?.[0]];if(!sheet?.cellData)throw Error('現有試算表格式無法辨識');
 let header=-1,offset=-1;for(let r=0;r<5;r++)for(const [c,cell]of Object.entries(sheet.cellData[r]||{}))if(String(cell?.v||'').trim().toUpperCase()==='GAME ID'){header=r;offset=+c;break;}
 if(header<0)throw Error('現有試算表缺少 GAME ID 表頭');
 const merge=(sheet.mergeData||[]).find(m=>m.startRow===header&&m.startColumn===offset),first=merge?merge.endRow+1:header+2;
 // Retain column widths, headers and cell styles; replace only the source table's values.
 const previous=sheet.cellData;sheet.cellData=Object.fromEntries(Object.entries(previous).filter(([r])=>+r<first));
 rows.forEach((row,i)=>{sheet.cellData[first+i]={};row.forEach((v,c)=>{const prior=previous[first+i]?.[offset+c]||{};sheet.cellData[first+i][offset+c]={v,t:1,...(prior.s?{s:prior.s}:{})};});});
 sheet.mergeData=(sheet.mergeData||[]).filter(m=>m.endRow<first);sheet.rowCount=Math.max(sheet.rowCount||0,rows.length+first+100);
 return JSON.stringify(next);
}
function openImport(){
 if(!window.__omniplayCanEdit)return;
 document.querySelector('#internalReferenceImport')?.remove();const dialog=document.createElement('dialog');dialog.id='internalReferenceImport';
 dialog.style.cssText='width:min(760px,calc(100vw - 40px));max-height:85vh;padding:24px;border:1px solid #cbd5e1;border-radius:14px;color:#24354a;background:white';
 dialog.innerHTML='<form><h3 style="margin:0 0 10px">更新內部參考資料</h3><p style="font-size:13px">貼上匯入資料。依 Game ID 更新遊戲資訊；線上版本清單以本次資料為準。保留既有素材、群組權限與未列入的遊戲資訊。</p><label style="display:block;margin:12px 0;font-size:13px">選擇匯入檔案 <input type="file" accept=".json,application/json" aria-label="選擇內部資料 JSON"></label><textarea aria-label="內部參考匯入資料" spellcheck="false" style="width:100%;box-sizing:border-box;height:240px;font:12px monospace;border:1px solid #cbd5e1;border-radius:7px;padding:10px"></textarea><p data-summary style="font-size:13px;white-space:pre-wrap">尚未貼上資料</p><div style="display:flex;gap:10px;align-items:center;justify-content:flex-end"><output style="font-size:13px;margin-right:auto"></output><button type="button" data-close class="secondary">取消</button><button type="submit" class="primary" disabled>更新工作區</button></div></form>';
 document.body.append(dialog);const input=dialog.querySelector('textarea'),button=dialog.querySelector('[type=submit]'),summary=dialog.querySelector('[data-summary]'),output=dialog.querySelector('output');
 input.oninput=()=>{try{const data=validateReferenceImport(input.value);summary.textContent='遊戲資訊：'+data.information.length+' 款遊戲\nGame List_Online：'+data.onlineRows.length+' 筆版本資料\n實際與預計發行日期分開儲存。';button.disabled=false;}catch(error){summary.textContent=error.message;button.disabled=true;}};
 dialog.querySelector('[type=file]').onchange=async event=>{const file=event.target.files?.[0];if(file){input.value=await file.text();input.oninput();}};
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();if(!window.__omniplayCanEdit)return;button.disabled=true;input.disabled=true;output.textContent='更新中…';
  try{
   const data=validateReferenceImport(input.value),db=getFirestore(getApps()[0]),sourceRef=doc(db,'omniplay','game-list-online-page'),recordsRef=doc(db,'omniplay','op-game-form-records');
   await window.disposeGameListOnlinePage?.();
   const source=await getDoc(sourceRef),raw=source.data()||{},records=await getDoc(recordsRef),prior=records.data()?.records||{},updatedAt=new Date().toISOString(),next={};
   let snapshot=null;if(raw.snapshotJson)snapshot=JSON.parse(raw.snapshotJson);
   const snapshotJson=replaceReferenceSnapshot(snapshot,data.onlineRows);
   await setDoc(sourceRef,{rowsJson:JSON.stringify(data.onlineRows),snapshotJson,updatedAt},{merge:true});
   output.textContent='線上清單已更新；正在更新遊戲資訊…';
   for(const row of data.information){const{id,...fields}=row;next[id]={...prior[id],...fields,gameInformationGame:true,gameInformationDeleted:false,updatedAt};}
   await setDoc(recordsRef,{records:next,updatedAt},{merge:true});
   const checkedSource=await getDoc(sourceRef),checkedRecords=await getDoc(recordsRef);
   if(checkedSource.data()?.rowsJson!==JSON.stringify(data.onlineRows)||checkedSource.data()?.snapshotJson!==snapshotJson)throw Error('線上清單儲存後比對未通過，請重試');
   for(const row of data.information)for(const key of informationKeys)if(checkedRecords.data()?.records?.[row.id]?.[key]!==row[key])throw Error('遊戲資訊 '+row.id+' 儲存後比對未通過，請重試');
   // Keep the native editor from restoring an older local draft on the next visit.
   try{localStorage.removeItem('omniplay-game-list-draft-v1');}catch{}
   window.dispatchEvent(new CustomEvent('omniplay-game-list-updated',{detail:{rows:data.onlineRows}}));
   input.hidden=true;summary.textContent='更新完成：遊戲資訊 '+data.information.length+' 款，Game List_Online '+data.onlineRows.length+' 筆。';output.textContent='已儲存至雲端';button.hidden=true;
   const close=dialog.querySelector('[data-close]');close.textContent='完成並重新整理';close.onclick=()=>location.reload();
  }catch(error){output.textContent='更新未完成：'+String(error.message||error);button.disabled=false;input.disabled=false;}
 };dialog.showModal();
}
const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='更新內部資料';button.style.cssText='font-size:12px;padding:6px 10px';button.onclick=openImport;
const title=document.querySelector('#pageTitle'),update=()=>{button.hidden=!window.__omniplayCanEdit||!['Game List_Online','遊戲資訊'].includes(title?.textContent?.trim());};
document.querySelector('#addPageBtn')?.parentElement?.prepend(button);if(title)new MutationObserver(update).observe(title,{childList:true,subtree:true,characterData:true});update();
