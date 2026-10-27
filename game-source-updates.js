import {doc,onSnapshot,runTransaction} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {gameListRows,preferredGameRows} from './game-list-source.js?v=20261020-pagcor-1';
const fields=['遊戲 ID','版本','英文名稱','製造商','投注面額','遊戲類型','線數','最低投注','最高投注','最高獎金','最高獎金倍數','彩金群組','彩金下限','彩金上限','彩金保留 RTP','彩金累加 RTP','總彩金 RTP','基本遊戲 RTP','總 RTP'];
const parse=(value,fallback={})=>{try{return JSON.parse(value)||fallback}catch{return fallback}};
export function sourceGameIndex(rows){
 const grouped={};for(const row of preferredGameRows(rows)){const id=String(row[0]).trim();(grouped[id]||=[]).push(Array.from({length:19},(_,i)=>String(row[i]??'').trim()));}
 for(const id of Object.keys(grouped))grouped[id].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return grouped;
}
export function mergeSourceUpdates(previous,next,stamp){
 const pending=parse(previous.pendingJson),before=parse(previous.baselineJson);if(!previous.initialized)return{initialized:true,baselineJson:JSON.stringify(next),pendingJson:'{}',updatedAt:stamp};
 for(const [id,rows]of Object.entries(next)){if(JSON.stringify(before[id])===JSON.stringify(rows))continue;const changed=[];for(let c=1;c<19;c++)if(JSON.stringify((before[id]||[]).map(row=>row[c]).sort())!==JSON.stringify(rows.map(row=>row[c]).sort()))changed.push(c);
  const prior=pending[id];pending[id]={id,name:rows[0]?.[2]||id,kind:prior?.kind==='new'||!before[id]?'new':'updated',columns:[...new Set([...(prior?.columns||[]),...changed])],revision:stamp+'|'+JSON.stringify(rows),updatedAt:stamp};
 }
 for(const id of Object.keys(pending))if(!next[id])delete pending[id];
 return{initialized:true,baselineJson:JSON.stringify(next),pendingJson:JSON.stringify(pending),updatedAt:stamp};
}
export function isSourceQuotaError(error){return /resource-exhausted|quota exceeded/i.test(String(error?.code||'')+' '+String(error?.message||error));}
export function removeReviewedUpdate(data,id,revision){const pending=parse(data.pendingJson);if(pending[id]?.revision!==revision)return null;delete pending[id];return{pendingJson:JSON.stringify(pending)};}
let installed=false,captureReview=null;
export function captureSourceUpdateReview(id){return captureReview?.(String(id))||null;}
export function installGameSourceUpdates({db,openGame}){
 if(installed||!window.__omniplayCanEdit)return null;
 const host=document.querySelector('.session-controls');if(!host)return null;installed=true;
 const sourceRef=doc(db,'omniplay','game-list-online-page'),monitorRef=doc(db,'omniplay','game-list-source-updates');
 let pending={},lastSignature='',dialog=null,redrawDialog=null,toast=null,queue=Promise.resolve(),checking=0,ready=false,lastChecked='',failure='';
 const reviewStorageKey='omniplay-source-reviews-pending-v1';
 let deferredReviews={};try{deferredReviews=parse(localStorage.getItem(reviewStorageKey));}catch{}
 const saveDeferred=()=>localStorage.setItem(reviewStorageKey,JSON.stringify(deferredReviews));
 const applyPending=data=>{pending=Object.fromEntries(Object.entries(parse(data.pendingJson)).filter(([id,item])=>deferredReviews[id]!==item.revision));};
 const settleDeferred=data=>{const remote=parse(data.pendingJson);for(const id of Object.keys(deferredReviews))if(remote[id]?.revision!==deferredReviews[id])delete deferredReviews[id];try{saveDeferred();}catch{}};
 const en=()=>localStorage.getItem('omniplay-customer-language')==='en',t=(zh,english)=>en()?english:zh;
 const button=document.createElement('button');button.type='button';button.className='secondary';button.id='gameSourceUpdatesButton';host.append(button);
 const style=document.createElement('style');style.textContent='#gameSourceUpdatesButton{white-space:nowrap;padding:7px 10px;font-size:12px}#gameSourceUpdatesButton[data-pending=true]{background:#fff4da;border-color:#edce7a;color:#805500}.source-updates-dialog{width:min(780px,calc(100vw - 24px));box-sizing:border-box;max-height:85dvh;overflow:auto;border:1px solid #cbd8e8;border-radius:14px;padding:22px;background:white;color:#263e59}.source-updates-dialog::backdrop{background:#182c4655}.source-update-item{display:grid;gap:5px;width:100%;text-align:left;border:1px solid #d2e0ef;border-radius:8px;background:#f7faff;color:#294665;padding:12px;margin:8px 0;cursor:pointer}.source-update-item small{color:#687d97}.source-update-toast{position:fixed;right:20px;bottom:20px;z-index:10020;max-width:calc(100vw - 40px);box-sizing:border-box;padding:14px 18px;border:1px solid #b6cfea;border-radius:11px;box-shadow:0 6px 25px #20354a26;background:#fff;color:#264764;font-size:13px}.source-update-toast button{margin-left:12px;padding:6px 10px;border:1px solid #b6cfea;border-radius:6px;background:#f0f6ff;color:#315d8e}.sidebar.compact-navigation #gameSourceUpdatesButton{font-size:0;width:32px;min-width:32px;height:32px;padding:0;position:relative}.sidebar.compact-navigation #gameSourceUpdatesButton::before{content:"更新";font-size:10px}.sidebar.compact-navigation #gameSourceUpdatesButton[data-pending=true]::after{content:attr(data-count);position:absolute;top:-5px;right:-5px;background:#e09522;color:white;border-radius:8px;padding:1px 4px;font-size:9px}.gi-source-update-focus{outline:2px solid #4f8cff;outline-offset:-2px}'+'.source-update-item{grid-template-columns:minmax(0,1fr) auto;align-items:center;cursor:default;gap:14px}.source-update-copy{display:grid;gap:5px;min-width:0}.source-update-copy strong{overflow-wrap:anywhere}.source-update-actions-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.source-update-actions-row button{white-space:nowrap;padding:6px 9px;font-size:12px}.source-update-done{display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:13px;color:#42644c;cursor:pointer;padding:7px}.source-update-done input{width:16px;height:16px;accent-color:#4f80ed}@media(max-width:600px){.source-update-item{grid-template-columns:1fr}.source-update-actions-row{justify-content:flex-start}.source-updates-dialog{padding:18px}}';document.head.append(style);

 const renderButton=()=>{const n=Object.keys(pending).length;button.textContent=t('資料更新','Data Updates')+(n?' '+n:Object.keys(deferredReviews).length?t(' · 待同步',' · Sync pending'):failure?' ⚠':'');button.dataset.pending=String(n>0);button.dataset.count=String(n);button.title=failure||t('Game List_Online 資料更新','Game List_Online Data Updates');button.setAttribute('aria-label',t('Game List_Online 資料更新，待處理 ','Game List_Online updates, pending ')+n);};
 const paint=()=>{renderButton();redrawDialog?.();};
 const showError=error=>{failure=t('無法檢查資料更新：','Unable to check updates: ')+error.message;paint();console.error('Game source updates',error);};
 const sync=()=>runTransaction(db,async tx=>{
  const [source,monitor]=await Promise.all([tx.get(sourceRef),tx.get(monitorRef)]);if(!source.exists())throw Error(t('找不到 Game List_Online 資料','Game List_Online source is missing'));
  const next=sourceGameIndex(gameListRows(source.data())),prior=monitor.data()||{};
  let data=prior.initialized&&JSON.stringify(next)===prior.baselineJson?prior:mergeSourceUpdates(prior,next,new Date().toISOString());
  for(const [id,revision] of Object.entries(deferredReviews)){const patch=removeReviewedUpdate(data,id,revision);if(patch)data={...data,...patch};}
  if(data!==prior){if(JSON.stringify(data).length>800000)throw Error('Update history exceeds the supported size');tx.set(monitorRef,data,{merge:true});}return data;
 });
 const checkNow=async()=>{
  checking++;failure='';paint();const task=queue.catch(()=>{}).then(sync);queue=task;
  try{const latest=await task;settleDeferred(latest);applyPending(latest);ready=!!latest.initialized;lastChecked=new Date().toLocaleTimeString(en()?'en-GB':'zh-TW',{timeZone:'Asia/Taipei',hour12:false});return latest;}
  catch(error){showError(error);throw error;}finally{checking--;paint();}
 };
 const acknowledge=async(id,revision)=>{
  const task=queue.catch(()=>{}).then(()=>runTransaction(db,async tx=>{
   const [source,monitor]=await Promise.all([tx.get(sourceRef),tx.get(monitorRef)]);
   if(!source.exists())throw Error(t('找不到 Game List_Online 資料','Game List_Online source is missing'));
   const prior=monitor.data()||{},next=sourceGameIndex(gameListRows(source.data()));
   const latest=prior.initialized&&JSON.stringify(next)===prior.baselineJson?prior:mergeSourceUpdates(prior,next,new Date().toISOString());
   const patch=removeReviewedUpdate(latest,id,revision),result=patch?{...latest,...patch}:latest;
   if(patch||latest!==prior)tx.set(monitorRef,result,{merge:true});return result;
  }));queue=task;
  try{const latest=await task;settleDeferred(latest);applyPending(latest);failure='';paint();if(parse(latest.pendingJson)[id])throw Error(t('來源已有較新的更新，請重新開啟此遊戲確認。','The source has a newer update. Reopen this game to review it.'));}
  catch(error){
   if(isSourceQuotaError(error)){
    // Completion is an explicit administrator action. Keep the exact
    // reviewed revision so a later update of the same game remains visible.
    deferredReviews[id]=revision;
    try{saveDeferred();}catch(storageError){delete deferredReviews[id];showError(error);throw error;}
    if(pending[id]?.revision===revision)delete pending[id];
    failure=t('Firebase 配額已滿，完成標記已暫存於此瀏覽器，等待同步。','Firebase quota exceeded. This browser has saved the completion for later sync.');paint();
    toast?.remove();toast=document.createElement('div');toast.className='source-update-toast';toast.setAttribute('role','status');toast.textContent=t('已標記完成；此瀏覽器不再提示這筆更新，待雲端恢復後同步。','Marked done. This browser will no longer show this update; cloud sync is pending.');document.body.append(toast);const currentToast=toast;setTimeout(()=>currentToast.remove(),12000);return{deferred:true};
   }
   showError(error);throw error;
  }
 };
 const complete=async(id,revision)=>{
  const item=pending[id];if(!item||item.revision!==revision)return;
  deferredReviews[id]=revision;
  try{saveDeferred();}catch(error){delete deferredReviews[id];showError(error);throw error;}
  delete pending[id];toast?.remove();paint();
  try{return await acknowledge(id,revision);}catch(error){
   if(deferredReviews[id]===revision){delete deferredReviews[id];try{saveDeferred();}catch{}if(!pending[id])pending[id]=item;}
   paint();throw error;
  }
 };
 captureReview=id=>{const revision=pending[id]?.revision;return revision?()=>complete(id,revision):null;};
 const list=async()=>{
  dialog?.close();const current=document.createElement('dialog');dialog=current;current.className='source-updates-dialog';const h=document.createElement('h3'),intro=document.createElement('p'),status=document.createElement('p'),items=document.createElement('div'),close=document.createElement('button'),retry=document.createElement('button');status.setAttribute('role','status');status.style.cssText='font-size:12px;color:#617894';
  h.textContent=t('Game List_Online 資料更新','Game List_Online Updates');intro.textContent=t('選擇要前往的頁面；確認處理完畢後勾選「完成」，即可清除此筆提醒。','Choose a destination. Check Done after reviewing to dismiss this update.');close.type='button';close.textContent=t('關閉','Close');close.onclick=()=>current.close();retry.type='button';retry.textContent=t('重新檢查','Check Again');retry.className='ui-btn ui-btn-primary';close.className='ui-btn';retry.onclick=()=>checkNow().catch(()=>{});const actions=document.createElement('footer');actions.className='source-update-actions';actions.append(retry,close);current.append(h,intro,status,items,actions);
  const redraw=()=>{
   if(!current.isConnected)return;status.textContent=failure||(checking?t('正在檢查已儲存的資料…','Checking saved data…'):ready?t('偵測已啟用；最後檢查：','Monitoring enabled; last checked: ')+lastChecked:t('正在建立資料基準…','Establishing the data baseline…'));retry.disabled=checking>0;items.replaceChildren();
   const entries=Object.values(pending).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
   if(!entries.length){if(Object.keys(deferredReviews).length)items.textContent=t('已完成的提醒已暫存於此瀏覽器；重新檢查時會再次嘗試同步。','Completed reminders are saved in this browser. Check Again retries cloud sync.');else if(!checking&&ready&&!failure)items.textContent=t('目前已儲存的資料與基準相同，沒有待處理更新。首次啟用前的變動不會回補。','No pending differences in saved data. Changes before initial activation are not backfilled.');return;}
   for(const item of entries){
    const row=document.createElement('div');row.className='source-update-item';const copy=document.createElement('div');copy.className='source-update-copy';const title=document.createElement('strong'),info=document.createElement('small');title.textContent=(item.kind==='new'?t('新增','New'):t('更新','Updated'))+' · '+item.id+' · '+item.name;info.textContent=en()?item.columns.length+' fields updated':item.columns.length+' 個欄位更新';copy.append(title,info);
    const actions=document.createElement('div');actions.className='source-update-actions-row';
    for(const [destination,label] of [['information',t('遊戲資訊','Game Information')],['game-list','Game List']]){const go=document.createElement('button');go.type='button';go.className='ui-btn';go.dataset.destination=destination;go.textContent=label;go.onclick=async()=>{current.close();toast?.remove();try{await openGame(item.id,destination);}catch(error){showError(error)}};actions.append(go);}
    const done=document.createElement('label');done.className='source-update-done';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label',t('標記完成 ','Mark done ')+item.id);checkbox.onchange=async()=>{if(!checkbox.checked)return;checkbox.disabled=true;try{await complete(item.id,item.revision);}catch(error){checkbox.checked=false;checkbox.disabled=false;}};done.append(checkbox,document.createTextNode(t('完成','Done')));actions.append(done);row.append(copy,actions);items.append(row);
   }
  };
  redrawDialog=redraw;current.addEventListener('close',()=>{current.remove();if(dialog===current){dialog=null;redrawDialog=null;}});document.body.append(current);current.showModal();await checkNow().catch(()=>{});
 };
 button.onclick=list;
 // A local write changes pending=true to pending=false without changing its data.
 // Include metadata events so the server acknowledgement is not silently skipped.
 const sourceStop=onSnapshot(sourceRef,{includeMetadataChanges:true},snapshot=>{if(!snapshot.exists()||snapshot.metadata.hasPendingWrites)return;checkNow().catch(()=>{});},showError);
 const monitorStop=onSnapshot(monitorRef,snapshot=>{
  const data=snapshot.data()||{};applyPending(data);ready=!!data.initialized;paint();
  const signature=JSON.stringify(Object.values(pending).map(item=>item.revision).sort());
  if(signature!==lastSignature&&Object.keys(pending).length){toast?.remove();toast=document.createElement('div');toast.className='source-update-toast';toast.setAttribute('role','status');const text=document.createElement('span'),view=document.createElement('button');text.textContent=t('Game List_Online 有資料更新，請確認遊戲資訊及可查看群組。','Game List_Online has updates. Review game details and group access.');view.type='button';view.textContent=t('查看更新','View Updates');view.onclick=()=>{toast.remove();list()};toast.append(text,view);document.body.append(toast);const currentToast=toast;setTimeout(()=>currentToast.remove(),12000);}lastSignature=signature;
 },showError);
 const languageObserver=new MutationObserver(paint);languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});renderButton();window.addEventListener('beforeunload',()=>{sourceStop();monitorStop();languageObserver.disconnect()},{once:true});return{open:list,check:checkNow,acknowledge};
}




