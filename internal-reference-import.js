import {snapshotGameRows} from './game-list-source.js?v=20261026-source-grid-1';
import {getDoc,setDoc} from './member-access.js?v=20261026-api-entry-editor-1';
import {getApps} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {getFirestore,doc} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const informationKeys=['mandarinName','gameInformationName','jackpot','status','releaseDate','pagcor','freeSpin','plannedReleaseDate','note1','note2','newFeatureName','featureStatus','featureReleaseDate','previewCopy'];
export function validateReferenceImport(text){
 const data=JSON.parse(text);
 const onlineSnapshot=data.onlineGrid?buildReferenceGrid(data.onlineGrid,data.onlineFormats,data.onlineMerges):null;
 if(onlineSnapshot)data.onlineRows=snapshotGameRows(onlineSnapshot);
 if(!Array.isArray(data.onlineRows)||!data.onlineRows.length)throw Error('請提供線上清單資料');
 if(data.information===undefined)data.information=[];if(!Array.isArray(data.information))throw Error('遊戲資訊格式不正確');
 const onlineRows=data.onlineRows.map((row,index)=>{
  if(!Array.isArray(row)||row.length!==19||row.some(v=>v!==null&&!['string','number'].includes(typeof v)))throw Error('線上清單第 '+(index+1)+' 列須有 19 個純文字或數值欄位');
  const values=row.map(v=>String(v??''));if(!/^\d{5,}$/.test(values[0])||!/^\d{5,}-.+/.test(values[1]))throw Error('線上清單第 '+(index+1)+' 列遊戲 ID 或版本無效');return values;
 });
 const seen=new Set(),information=data.information.map(row=>{
  const id=String(row?.id||'');if(!/^\d{5,}$/.test(id)||seen.has(id))throw Error('遊戲資訊 ID 無效或重複：'+id);seen.add(id);
  const next={id};for(const key of informationKeys){if(typeof row[key]!=='string')throw Error(id+' 缺少文字欄位 '+key);next[key]=row[key];}
  for(const key of ['releaseDate','plannedReleaseDate','featureReleaseDate'])if(next[key]&&!(key==='plannedReleaseDate'&&next[key]==='查無日期')&&!/^\d{4}-\d{2}-\d{2}$/.test(next[key]))throw Error(id+' 的日期須為 YYYY-MM-DD');
  return next;
 });return{onlineRows,information,onlineSnapshot};
}
export function buildReferenceGrid(grid,formats=[],merges=[]){
 if(!Array.isArray(grid)||grid.length<3||grid.length>5000||grid.some(row=>!Array.isArray(row)||row.length!==20||row.some(v=>v!==null&&!['string','number'].includes(typeof v))))throw Error('來源表格須包含 A:T 共 20 欄');
 if(String(grid[0][1]).trim()!=='GAME ID'||String(grid[0][2]).trim()!=='GAME VERSION')throw Error('來源表頭不正確');
 const id='game-list-online-sheet',cellData={},rowData={},columnData={},widths=[45,90,140,200,120,115,290,110,100,100,150,140,255,320,110,280,280,135,135,160];
 grid.forEach((row,r)=>{cellData[r]={};let lines=1;row.forEach((raw,c)=>{
  let v=raw??'';if(typeof v==='string'&&/Grand\s*[:：]/i.test(v)&&/Major\s*[:：]/i.test(v))v=v.replace(/\s*(Major\s*[:：])/ig,'\n$1');
  // Game IDs and numeric columns must be numeric cells, so the editor does not flag them as numbers stored as text.
  if(r>=2&&[0,1,7,8,9,10,11].includes(c)&&typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v))v=Number(v);
  const pattern=typeof formats?.[r]?.[c]==='string'?formats[r][c]:'General',s={vt:2,tb:typeof v==='string'&&v.includes('\n')?3:2,ht:r<2?2:1,fs:11};
  if(typeof v==='number')s.n={pattern:pattern==='@'?'0':pattern};
  if(r<2)Object.assign(s,{bg:{rgb:'#a6a6a6'},cl:{rgb:'#000000'},bl:1,ht:2});
  cellData[r][c]={v,t:typeof v==='number'?2:1,s};lines=Math.max(lines,String(v).split('\n').length);
 });rowData[r]={h:r<2?34:Math.max(25,lines*18+10)};});
 if(!Array.isArray(merges)||merges.some(m=>!['startRow','endRow','startColumn','endColumn'].every(k=>Number.isInteger(m[k]))||m.startRow<0||m.endRow>1||m.startColumn<0||m.endColumn>19||m.startRow>m.endRow||m.startColumn>m.endColumn))throw Error('表頭合併範圍不正確');
 widths.forEach((w,c)=>columnData[c]={w});
 return{id:'game-list-online-workbook',name:'Game List_Online',sheetOrder:[id],sheets:{[id]:{id,name:'Game List_Online',rowCount:Math.max(grid.length+100,500),columnCount:20,cellData,rowData,columnData,mergeData:merges,freeze:{xSplit:0,ySplit:2,startRow:2,startColumn:0},rowHeader:{width:46,hidden:false},columnHeader:{height:24,hidden:false},showGridlines:1}}};
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
 input.oninput=()=>{try{const data=validateReferenceImport(input.value);summary.textContent=(data.information.length?'遊戲資訊：'+data.information.length+' 款遊戲\n':'遊戲資訊：保留原資料\n')+'Game List_Online：'+data.onlineRows.length+' 筆版本資料\n實際與預計發行日期分開儲存。';button.disabled=false;}catch(error){summary.textContent=error.message;button.disabled=true;}};
 dialog.querySelector('[type=file]').onchange=async event=>{const file=event.target.files?.[0];if(file){input.value=await file.text();input.oninput();}};
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();if(!window.__omniplayCanEdit)return;button.disabled=true;input.disabled=true;output.textContent='更新中…';
  try{
   const data=validateReferenceImport(input.value),db=getFirestore(getApps()[0]),sourceRef=doc(db,'omniplay','game-list-online-page'),recordsRef=doc(db,'omniplay','op-game-form-records');
   await window.disposeGameListOnlinePage?.();
   const source=await getDoc(sourceRef),raw=source.data()||{},records=await getDoc(recordsRef),prior=records.data()?.records||{},updatedAt=new Date().toISOString(),next={};
   let snapshot=null;if(raw.snapshotJson)snapshot=JSON.parse(raw.snapshotJson);
   if(data.onlineSnapshot&&snapshot?.resources)data.onlineSnapshot.resources=structuredClone(snapshot.resources);
   const snapshotJson=data.onlineSnapshot?JSON.stringify(data.onlineSnapshot):replaceReferenceSnapshot(snapshot,data.onlineRows);
   await setDoc(sourceRef,{rowsJson:JSON.stringify(data.onlineRows),snapshotJson,gameListLayoutVersion:'',updatedAt},{merge:true});
   output.textContent='線上清單已更新；正在更新遊戲資訊…';
   for(const row of data.information){const{id,...fields}=row;next[id]={...prior[id],...fields,gameInformationGame:true,gameInformationDeleted:false,updatedAt};}
   if(data.information.length)await setDoc(recordsRef,{records:next,updatedAt},{merge:true});
   const checkedSource=await getDoc(sourceRef),checkedRecords=await getDoc(recordsRef);
   if(checkedSource.data()?.rowsJson!==JSON.stringify(data.onlineRows)||checkedSource.data()?.snapshotJson!==snapshotJson)throw Error('線上清單儲存後比對未通過，請重試');
   for(const row of data.information)for(const key of informationKeys)if(checkedRecords.data()?.records?.[row.id]?.[key]!==row[key])throw Error('遊戲資訊 '+row.id+' 儲存後比對未通過，請重試');
   // Keep the native editor from restoring an older local draft on the next visit.
   try{localStorage.removeItem('omniplay-game-list-draft-v1');}catch{}
   window.dispatchEvent(new CustomEvent('omniplay-game-list-updated',{detail:{rows:data.onlineRows}}));
   input.hidden=true;summary.textContent='更新完成：Game List_Online '+data.onlineRows.length+' 筆。'+(data.information.length?'遊戲資訊 '+data.information.length+' 款。':'遊戲資訊保留原資料。');output.textContent='已儲存至雲端';button.hidden=true;
   const close=dialog.querySelector('[data-close]');close.textContent='完成並重新整理';close.onclick=()=>location.reload();
  }catch(error){output.textContent='更新未完成：'+String(error.message||error);button.disabled=false;input.disabled=false;}
 };dialog.showModal();
}
const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='更新內部資料';button.style.cssText='font-size:12px;padding:6px 10px';button.onclick=openImport;
const title=document.querySelector('#pageTitle'),update=()=>{button.hidden=!window.__omniplayCanEdit||!['Game List_Online','遊戲資訊','Game Information'].includes(title?.textContent?.trim());};
document.querySelector('#addPageBtn')?.parentElement?.prepend(button);if(title)new MutationObserver(update).observe(title,{childList:true,subtree:true,characterData:true});update();





