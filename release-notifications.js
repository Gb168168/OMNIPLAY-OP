import {releaseTemplate} from './release-notification-templates.js?v=uat-dm-1';
import {prepareReleaseImage,uploadReleaseImages,readReleaseImage,MAX_RELEASE_IMAGES} from './release-notification-images.js?v=20261025-images-1';
import {getFirestore,doc,collection,query,orderBy,limit,where,serverTimestamp,getDocs,getDoc,getDocFromCache,runTransaction,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {gameListRows,preferredGameRows} from './game-list-source.js?v=20261020-pagcor-1';
import {ENVIRONMENTS,NOTIFICATION_LIMIT,buildReleaseNotification,publicReleaseNotification,appendReleaseNotification,visibleReleaseNotifications,filterReleaseGames,defaultReleaseGroupIds,normalizeReleaseTypes,changeReleaseTypes,upgradeReleaseTypeConfig,isPordNotification,notificationCategory,notificationTransition,notificationHasNoReleaseDate} from './release-notification-model.js?v=recipient-exceptions-1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const english=()=>localStorage.getItem('omniplay-customer-language')==='en',label=(zh,en)=>english()?en:zh;
const time=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString(english()?'en-GB':'zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'—';};
const releaseDate=value=>{const date=new Date(value);if(!Number.isFinite(date.getTime()))return '—';return new Date(date.getTime()+8*3600000).toISOString().slice(0,10).replaceAll('-','/');};
const imageMarkup=item=>(item.images||[]).map(image=>'<figure class="release-image"><img data-release-image="'+esc(image.id)+'" data-notification-id="'+esc(item.id)+'" alt="'+esc(image.name||'通知圖片')+'" loading="lazy"><figcaption>'+esc(image.name||'通知圖片')+'</figcaption></figure>').join('');
function categoryLabel(category){
 return ({'流程':'上架流程（一般／客製）','特選':'特選（獨家首發）'})[category]||category;
}
function typeOptionLabel(type){
 return ['flow-pord','selected-pord'].includes(type.id)?type.name+'（不放宣傳圖，需附上測試環境提供的連結）':type.name;
}
function defaultNotificationDate(record={}){
 const actual=String(record.releaseDate||'').trim(),planned=String(record.plannedReleaseDate||'').trim(),raw=actual||planned;
 const parts=raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);if(!parts)return '';
 const date=parts[1]+'-'+parts[2].padStart(2,'0')+'-'+parts[3].padStart(2,'0');
 const timestamp=Date.parse(date+'T00:00:00Z');return Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===date?date:'';
}
function notificationTemplateDates(copy,record){
 if(!copy)return copy;const date=defaultNotificationDate(record);if(!date)return copy;
 return {...copy,messageZh:fillDescriptionDate(copy.messageZh,0,date,'zh'),messageEn:fillDescriptionDate(copy.messageEn,0,date,'en')};
}
const selectedPeriodType=id=>['selected-uat','selected-pord','first-uat','first-pord','first-pord-extension'].includes(id);
function periodDateText(text){
 return String(text||'').replace(descriptionDatePattern(),match=>'〔UTC+8 '+(stampParts(match).date.replaceAll('-','/')||'YYYY/MM/DD')+'〕');
}
function descriptionDatePattern(){return /〔UTC\+8[ \t]+(?:YYYY\/MM\/DD|\d{4}[-/]\d{2}[-/]\d{2})(?:[ \t]+(?:HH:mm|\d{2}:\d{2}))?〕|[ \t]*(?:【請輸入 YYYY \/ MM \/ DD】|\[Enter YYYY \/ MM \/ DD\]|\d{4}[ \t]*[-/][ \t]*\d{2}[ \t]*[-/][ \t]*\d{2}(?:[ T]+\d{2}:\d{2})?)?[ \t]*(?:（UTC\+8）|\(UTC\+8\))/g;}
function stampParts(text){return {date:String(text).match(/\d{4}[ \t]*[-/][ \t]*\d{2}[ \t]*[-/][ \t]*\d{2}/)?.[0]?.replace(/[ \t]/g,'').replaceAll('/','-')||'',time:String(text).match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0]||''};}
export function descriptionDateSlots(text){return [...String(text||'').matchAll(descriptionDatePattern())].map(match=>{
 const parts=stampParts(match[0]),line=String(text).slice(String(text).lastIndexOf('\n',match.index)+1,match.index).replace(descriptionDatePattern(),'').trim();
 return {...parts,newStyle:match[0].includes('〔UTC+8'),label:line||'通知說明日期時間'};
});}
export function fillDescriptionDate(text,index,date,lang,time){
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))throw new Error('請選擇有效日期');
 if(time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('請輸入有效時間');
 let slot=0;return String(text||'').replace(descriptionDatePattern(),match=>{
  if(slot++!==index)return match;
  const clock=time===undefined?stampParts(match).time:time;
  return '〔UTC+8 '+(date?date.replaceAll('-','/'):'YYYY/MM/DD')+(time===null?'':' '+(clock||'HH:mm'))+'〕';
 });
}
export function validateDescriptionDates(zh,en,dateOnly=false){
 const z=descriptionDateSlots(zh),e=descriptionDateSlots(en);
 for(let i=0;i<Math.max(z.length,e.length);i++)if(z[i]?.newStyle||e[i]?.newStyle){
  if(dateOnly){if(!z[i]?.date||!e[i]?.date||z[i].date!==e[i].date)throw new Error('請填寫一致的中英文說明日期');continue;}
  if(!z[i]?.date||!z[i]?.time||!e[i]?.date||!e[i]?.time)throw new Error('請完整填寫通知說明的日期與時間（UTC+8）');
  if(z[i].date!==e[i].date||z[i].time!==e[i].time)throw new Error('中英文日期與時間不一致，請使用上方欄位同步填寫');
 }
}
function usesLegacyExtensionDays(form){
 return form.elements.environment.value==='first-pord-extension'&&/延長\s*(?:【請輸入延長天數】|\d+)\s*天|extended by\s+(?:\[Enter extension days\]|\d+)\s+days/i.test(form.elements.messageZh.value+'\n'+form.elements.messageEn.value);
}
export function descriptionExtensionDays(zh,en){return {zh:String(zh||'').match(/延長\s*(\d+)\s*天/)?.[1]||'',en:String(en||'').match(/extended by\s+(\d+)\s+days/i)?.[1]||''};}
export function fillExtensionDays(text,days,lang){
 if(days&&(!/^\d+$/.test(String(days))||Number(days)<1||Number(days)>365))throw new Error('延長天數請輸入 1–365');
 return lang==='zh'?String(text).replace(/(延長\s*)(?:【請輸入延長天數】|\d+)(\s*天)/,(_,prefix,suffix)=>prefix+(days||'【請輸入延長天數】')+suffix):String(text).replace(/(extended by\s+)(?:\[Enter extension days\]|\d+)(\s+days)/i,(_,prefix,suffix)=>prefix+(days||'[Enter extension days]')+suffix);
}
function notificationTitle(item){return english()?(item.titleEn||item.titleZh||item.title||''):(item.titleZh||item.title||item.titleEn||'')}
function notificationTitleMarkup(item,admin=false){return admin?'<div class="release-title-pair"><h3 lang="zh-Hant">'+esc(item.titleZh||item.title||item.titleEn||'')+'</h3>'+(item.titleEn?'<h3 lang="en">'+esc(item.titleEn)+'</h3>':'')+'</div>':'<h3>'+esc(notificationTitle(item))+'</h3>'}
function notificationGameMarkup(item){
 const game=item.game||{},names=[game.mandarinName,game.name].filter(Boolean).join(' / ');
 return '<div><button type="button" class="release-game-link" data-notification-game="'+esc(game.id)+'">'+esc([game.id,names].filter(Boolean).join(' · '))+'</button> <span class="release-meta">'+esc(game.version||'')+'</span></div><div class="release-assets-hint" lang="'+(english()?'en':'zh-Hant')+'">'+label('點選上方遊戲編號或名稱，即可查看遊戲素材。','Click the game ID or title above to view the game assets.')+'</div>';
}
function releaseFlow(history){
 const sent=new Set();
 for(const item of history){
  if(item.status!=='published')continue;
  const aliases={test:'flow-uat',production:'flow-pord','other-uat':'flow-uat','other-pord':'flow-pord'};
  sent.add(item.templateVariant==='no-dm'&&item.environment==='flow-uat'?'flow-uat-no-dm':aliases[item.environment]||item.environment);
  if(item.environment==='combined'){sent.add('flow-uat');sent.add('flow-pord');}
 }
 let steps=['flow-uat','flow-pord'];
 if(sent.has('flow-uat-no-dm')||sent.has('flow-uat-dm'))steps=['flow-uat-no-dm','flow-uat-dm','flow-pord'];
 if(sent.has('selected-uat')||sent.has('selected-pord')){
  const selected=['selected-uat','selected-pord'];
  if(sent.has('first-pord-extension'))selected.push('first-pord-extension');
  steps=steps.some(id=>sent.has(id))?selected.concat(steps):selected;
 }
 return {steps,sent};
}
function notificationReleaseTimeMarkup(item){if(item.environment==='flow-uat-dm')return '';if(notificationHasNoReleaseDate(item)||!item.releaseAt)return '';return '<div class="release-time-highlight"><span>'+label('上架時間（UTC+8）','Release time (UTC+8)')+'</span><strong>'+esc(releaseDate(item.releaseAt))+'</strong></div>'}
function notificationMessage(item){return english()?(item.messageEn||item.messageZh||item.message||''):(item.messageZh||item.message||item.messageEn||'')}
function notificationMessageMarkup(text,gameId){
 return String(text||'').split('\n').map(line=>{
  if(/^⭐️ (?:獨家開放期間調整：|Updated Exclusive Availability Period:)$/.test(line))return '⭐️ <strong>'+esc(line.slice(3))+'</strong>';
  const match=line.match(/^(遊戲清單|遊戲素材|行銷資源|Game List|Game Assets|Marketing Resources)([ \t]*[：:])[ \t]*(?:GAME ID[ \t]+[^\s]+)?[ \t]*$/i);
  if(!match||!gameId)return esc(line);
  return esc(match[1]+match[2])+' <button type="button" class="release-game-link" data-notification-game="'+esc(gameId)+'">GAME ID '+esc(gameId)+' ↗</button>';
 }).join('\n');
}
function bilingualMessageMarkup(item){return '<div class="release-message-pair"><div><strong>通知說明（中）</strong><p lang="zh-Hant">'+notificationMessageMarkup(item.messageZh??item.message??'',item.game?.id)+'</p></div><div><strong>通知說明（英）</strong><p lang="en">'+notificationMessageMarkup(item.messageEn||'',item.game?.id)+'</p></div></div>'}
function bindReleaseImagePicker(form,imageInput,addImages){
 const choose=form.querySelector('[data-choose-images]'),paste=form.querySelector('[data-image-paste]');
 choose.onclick=()=>imageInput.click();
 paste.onclick=()=>paste.focus();
 imageInput.onchange=()=>addImages([...imageInput.files]);
 form.addEventListener('paste',event=>{const files=[...(event.clipboardData?.files||[])].filter(file=>file.type.startsWith('image/'));if(files.length){event.preventDefault();void addImages(files)}});
}
function resizeReleaseMessageFields(form){
 const fields=[form.elements.messageZh,form.elements.messageEn].filter(Boolean);
 fields.forEach(field=>field.style.height='auto');
 const height=Math.max(160,...fields.map(field=>field.scrollHeight+2));
 fields.forEach(field=>field.style.height=height+'px');
}
function styles(){if(document.querySelector('#releaseNotificationStyles'))return;const style=document.createElement('style');style.id='releaseNotificationStyles';style.textContent=`
.release-list details.release-compact{display:block;padding:0}.release-compact summary{cursor:pointer;padding:9px 12px;line-height:1.5}.release-compact summary>*{margin-inline-end:6px}.release-expanded{display:grid;gap:8px;padding:4px 12px 12px}.release-pages{display:flex;gap:12px;align-items:center;justify-content:center}.release-pages:empty{display:none}

.release-compose [data-release-flow]{flex:1;align-self:center;font-size:14px}.release-flow-step{display:inline-block;padding:4px 8px;border-radius:5px;background:#eff4fc;color:#536780}.release-flow-step.sent{background:#285aba;color:white}.release-flow-note{display:block;font-size:12px;margin-top:4px}.release-compose .release-image-upload[hidden]{display:none!important}

.release-bell{display:inline-flex!important;align-items:center;gap:5px;position:relative;padding:8px 10px!important;white-space:nowrap;cursor:pointer}.release-badge{background:#dc3545;color:white;border-radius:20px;min-width:18px;padding:1px 4px;font-size:11px;line-height:18px}.release-badge[hidden]{display:none}.release-dialog{width:min(1280px,calc(100vw - 28px));max-height:88vh;padding:0;border:1px solid #cbd7e6;border-radius:16px;background:#fff;color:#172033;box-shadow:0 24px 70px #0f172a44}.release-dialog::backdrop{background:#0f172a88}.release-shell{padding:22px;display:grid;gap:16px}.release-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.release-head h2{margin:0}.release-actions{display:flex;gap:8px;flex-wrap:wrap}.release-actions button,.release-head button,.release-card button{border:1px solid #b8cce6;border-radius:8px;padding:8px 12px;background:#eef5ff;color:#24558e;cursor:pointer}.release-actions .release-primary{background:#4f83ff;color:#fff;border-color:#4f83ff}.release-dialog button:disabled{opacity:.55;cursor:wait}.release-list{display:grid;gap:10px;max-height:58vh;overflow:auto}.release-card{border:1px solid #d7e1ef;border-radius:12px;padding:14px;background:#f8fafc;display:grid;gap:8px}.release-card.unread{border-color:#88b3ff;background:#edf5ff}.release-card h3{margin:0;font-size:17px;overflow-wrap:anywhere}.release-card p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;line-height:1.55}.release-meta{font-size:12px;color:#65758c}.release-tag{display:inline-block;border-radius:7px;padding:4px 8px;background:#e3edff;color:#315c9b;font-size:12px;width:max-content}.release-tag.production{background:#e2f1e5;color:#237440}.release-tag.withdrawn{background:#f2e7e7;color:#9b3b3b}.release-form{display:grid;gap:14px}.release-form label{display:grid;gap:6px;font-size:13px;font-weight:600}.release-form input,.release-form select,.release-form textarea{width:100%;box-sizing:border-box;border:1px solid #bacbe2;border-radius:8px;padding:10px;background:white;color:#172033;font:inherit}.release-form textarea{resize:vertical;min-height:90px}.release-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}[data-recipient-list]{display:grid;gap:12px}[data-recipient-list] strong{display:block;margin-bottom:4px;font-size:13px}.release-compose [data-recipient-list] .release-recipients{max-height:none}#releaseRecipientEditor{width:min(740px,94vw);max-height:88vh;overflow:auto}#releaseRecipientEditor [data-zone]{border:1px solid #cfdaea;border-radius:10px;padding:10px;margin:8px 0}#releaseRecipientEditor [data-zone] strong{display:block;padding:5px}#releaseRecipientEditor [data-zone]>div{display:flex;flex-wrap:wrap;gap:6px;min-height:32px;padding:5px}#releaseRecipientEditor [draggable]{cursor:grab}#releaseRecipientEditor [role=alert]{color:#a12535}.release-recipients{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:160px;overflow:auto}.release-recipients label{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #d9e4f3;border-radius:7px}.release-recipients input{width:16px;height:16px}.release-preview{border:1px solid #b8cbe5;border-radius:12px;padding:16px;background:#f5f9ff;display:grid;gap:8px}.release-error{color:#aa3448;font-size:13px;white-space:pre-wrap}.release-empty{padding:24px;text-align:center;color:#66758b}.release-small{font-size:12px;color:#66758b}@media(max-width:600px){.release-shell{padding:16px}.release-pair,.release-recipients{grid-template-columns:1fr}.release-head{align-items:flex-start}.release-bell{font-size:13px}}

.release-compose{width:calc(100vw - 48px);max-width:none;max-height:calc(100dvh - 48px);background:#f5f8fc;border:0;overflow:auto;scroll-padding-bottom:90px}.release-compose .release-shell{padding:26px;gap:22px}.release-compose .release-head h2{font-size:25px;letter-spacing:.3px}.release-eyebrow{font-size:10px;letter-spacing:2px;font-weight:800;color:#4f83ff;margin-bottom:6px}.release-intro{margin:7px 0 0;color:#6b7c93;font-size:13px;line-height:1.6}.release-section{padding:22px;border:1px solid #e0e8f3;background:#fff;border-radius:16px;box-shadow:0 4px 16px #28456805;display:grid;gap:16px;min-width:0}.release-section-title{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px}.release-step{display:grid;place-items:center;background:#edf3ff;color:#4476dd;border-radius:9px;width:30px;height:30px;font-size:11px}.release-section .release-form label,.release-compose label{color:#41536e;font-weight:600;font-size:12px;gap:8px}.release-compose input,.release-compose select,.release-compose textarea{border-color:#d7e2f0;border-radius:10px;font-size:14px;padding:12px;transition:border-color .15s,box-shadow .15s}.release-compose input:focus,.release-compose select:focus,.release-compose textarea:focus{outline:none;border-color:#79a6f8;box-shadow:0 0 0 3px #4f83ff15}.release-compose textarea{min-height:138px;line-height:1.7}.release-combo{position:relative}.release-combo-field{display:flex;align-items:center;border:1px solid #d7e2f0;border-radius:10px;background:white;transition:box-shadow .15s,border-color .15s}.release-combo-field:focus-within{border-color:#79a6f8;box-shadow:0 0 0 3px #4f83ff15}.release-combo-field input{border:0;box-shadow:none!important;padding-left:38px;padding-right:8px;min-width:0;flex:1;background:transparent;outline:0}.release-search-icon{position:absolute;left:14px;top:16px;color:#91a3bc;pointer-events:none}.release-combo-toggle{align-self:stretch;width:44px;border:0;border-radius:0 10px 10px 0;background:transparent;color:#657b9a;cursor:pointer;font-size:17px}.release-combo-toggle:hover{background:#f1f6ff}.release-game-menu{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:60;padding:6px;border:1px solid #dce6f4;border-radius:13px;background:#fff;box-shadow:0 14px 35px #19345720;max-height:280px;overflow:auto;scrollbar-width:thin}.release-game-menu[hidden]{display:none}.release-game-option{display:grid;grid-template-columns:75px minmax(0,1fr) 24px;align-items:center;gap:12px;width:100%;padding:11px 12px;border:0;border-radius:9px;background:white;text-align:left;cursor:pointer;color:#23374f}.release-game-option:hover,.release-game-option.active{background:#edf4ff}.release-game-option.selected{background:#f4f8ff}.release-game-id{padding:5px 6px;border-radius:7px;background:#edf2fa;color:#526f99;text-align:center;font-size:11px;font-weight:700}.release-game-names{display:grid;gap:3px;min-width:0}.release-game-names strong{font-size:13px;font-weight:700;white-space:normal;overflow-wrap:anywhere}.release-game-names small{font-size:11px;color:#7b8da6;white-space:normal;overflow-wrap:anywhere}.release-game-check{color:#467def;font-size:15px}.release-game-empty{padding:20px 12px;text-align:center;color:#8190a4;font-size:13px}.release-compose [data-game-count]{color:#8190a4;margin-top:-6px;font-size:11px}.release-compose .release-recipients{max-height:190px;grid-template-columns:repeat(3,minmax(0,1fr));padding:2px}.release-compose .release-recipients label{padding:12px;border-color:#e0e7f2;background:#fbfcff;font-size:12px;border-radius:10px;cursor:pointer;transition:background .15s,border-color .15s}.release-compose .release-recipients label:has(input:checked){background:#edf4ff;border-color:#9bbefb;color:#315d9e}.release-compose .release-recipients input{accent-color:#4f83ff;box-shadow:none}.release-compose .release-recipients span{overflow-wrap:anywhere}.release-compose .release-small{line-height:1.65} .release-footer{position:sticky;bottom:0;z-index:30;padding:12px 0 max(12px,env(safe-area-inset-bottom));margin-top:2px;background:#f5f8fc;justify-content:flex-end;border-top:1px solid #dfe7f2}.release-footer button{min-width:100px;padding:11px 18px!important;border-radius:10px!important;font-size:13px}.release-footer .release-primary{box-shadow:0 4px 12px #4f83ff25}.release-compose .release-preview{border-color:#b7cefa;background:white;border-radius:16px;padding:22px}.release-compose .release-preview h3{margin:4px 0}.release-compose .release-error:empty{display:none}@media(max-width:640px){.release-compose .release-shell{padding:16px}.release-section{padding:16px}.release-compose .release-recipients{grid-template-columns:repeat(2,minmax(0,1fr))}.release-game-option{grid-template-columns:65px minmax(0,1fr) 18px;gap:8px}.release-footer{bottom:0}.release-compose .release-head h2{font-size:22px}}

.release-image-grid{display:flex;gap:12px;flex-wrap:wrap}.release-image{margin:0;max-width:100%;min-width:0}.release-image img{display:block;max-width:100%;max-height:440px;object-fit:contain;border:1px solid #dce5f0;border-radius:10px;background:#f4f7fb}.release-image figcaption{font-size:12px;color:#65758c;margin-top:6px;overflow-wrap:anywhere}.release-image-draft{position:relative;flex:1 1 180px;max-width:260px}.release-image-draft img{height:150px;width:100%;object-fit:contain}.release-image-draft button{margin-top:8px;padding:6px 10px;border:1px solid #d6e0ee;border-radius:7px;background:white;color:#a33448;cursor:pointer}
.release-image-upload{display:grid;gap:10px}.release-image-upload-head{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;font-weight:600}.release-image-upload input[hidden]{display:none!important}.release-compose .release-image-choose{padding:8px 13px;border:1px solid #c8d9f0;border-radius:9px;background:#edf4ff;color:#315e98;font:inherit;cursor:pointer}.release-image-paste{display:grid;justify-items:center;gap:9px;padding:25px 16px;border:1px dashed #bdd0eb;border-radius:13px;background:#f8fbff;color:#526a89;text-align:center;cursor:text;outline:none}.release-image-paste:focus-visible,.release-image-paste:focus{border-color:#5b8de3;background:#f0f6ff;box-shadow:0 0 0 3px #4f83ff18}.release-image-paste strong{font-size:14px;color:#375578}.release-image-paste>span:not(.release-image-paste-icon){font-size:12px;line-height:1.7}.release-image-paste-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#e8f0fd;color:#6890c8;font-size:26px}.release-image-paste kbd{padding:2px 5px;border:1px solid #d0dcec;border-bottom-width:2px;border-radius:4px;background:#fff;font:11px system-ui;color:#536b8b}
.release-message-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.release-message-pair>label,.release-message-pair>div{min-width:0}.release-message-pair textarea{min-height:140px}.release-date-reminder{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:8px 10px;border:1px solid #e8c46d;border-radius:8px;background:#fffaf0;color:#79551a;font-size:12px;line-height:1.4}.release-description-dates{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}.release-description-dates label{display:flex!important;flex-direction:row;align-items:center;gap:8px!important;color:#79551a!important;font-size:12px!important}.release-description-dates input{width:155px!important;max-width:100%;height:34px;padding:5px 8px!important;background:white!important;font-size:12px!important}.release-date-reminder strong{font-size:12px;white-space:nowrap}.release-date-reminder[hidden]{display:none}.release-table-section h3{margin:4px 0 10px;font-size:15px;color:#41536e}.release-table-scroll{overflow-x:auto}.release-admin-table{width:100%;border-collapse:collapse;font-size:13px;min-width:720px}.release-admin-table th{text-align:left;padding:10px;background:#edf3fc;color:#41536e;white-space:nowrap}.release-admin-table td{padding:10px;border-bottom:1px solid #e0e8f3;vertical-align:middle}.release-admin-table th:nth-child(1){width:95px}.release-admin-table th:nth-child(3){width:155px}.release-admin-table thead th{position:sticky;top:0;z-index:2}.release-admin-table .release-actions-heading{right:0;z-index:3;text-align:right}.release-admin-table .release-actions-cell{position:sticky;right:0;z-index:1;background:#fff;text-align:right;box-shadow:-5px 0 7px -7px #718096}.release-row-actions{display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap}.release-admin-table .release-category-row th{padding:10px;text-align:left;background:#f6f8fc;color:#41536e;font-size:14px;width:auto;border-bottom:1px solid #dce5f0}.release-row-actions button,.release-type-detail{font:inherit;padding:5px 8px;border:1px solid #c4d5ea;border-radius:6px;background:white;color:#24558e;cursor:pointer}.release-type-detail{border:0;background:transparent;text-align:left;text-decoration:underline;text-underline-offset:3px}.release-table-section+.release-table-section{margin-top:12px}.release-title-pair{display:grid;gap:5px}.release-title-pair h3[lang=en]{font-size:15px;color:#41536e}.release-message-pair strong{font-size:12px;color:#64748b}.release-game-link{font:inherit!important;color:#1763cf!important;border:0!important;border-radius:4px!important;background:transparent!important;padding:0 2px!important;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.release-game-link:hover{background:#e3edff!important}.release-message-pair p{margin:7px 0 0;white-space:pre;overflow-wrap:normal;word-break:normal;overflow-x:auto;max-width:100%;padding-bottom:6px;line-height:1.6;min-height:24px}@media(max-width:1100px){.release-message-pair{grid-template-columns:1fr}}
.release-type-field{display:grid;gap:8px;min-width:0}.release-type-manager summary{color:#466b9e;font-size:12px;cursor:pointer;width:fit-content}.release-type-editor{margin-top:10px;padding:14px;border:1px solid #dce6f4;border-radius:12px;background:#f8fbff;display:grid;gap:12px}.release-type-group>summary{padding:5px 0;font-weight:600}.release-type-rows{max-height:10rem;overflow-y:auto}.release-type-rows .release-type-row{padding:3px 0}.release-type-category{font-size:11px;font-weight:700;color:#7890ae;margin:10px 0 4px}.release-type-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid #e5edf7;font-size:12px}.release-type-manager button{border:1px solid #cbd9ed;border-radius:7px;background:white;color:#365d91;padding:6px 10px;cursor:pointer}.release-type-row button{color:#a53f50;font-size:11px}.release-type-add{display:grid;gap:10px}
.release-compose .release-game-section{grid-template-columns:140px minmax(260px,640px) minmax(0,1fr);align-items:center;gap:10px 14px;padding:12px 16px}.release-game-section>.release-section-title{grid-column:1;grid-row:1}.release-game-section>label{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.release-game-section>.release-combo{grid-column:2;grid-row:1;min-width:0}.release-game-section>[data-game-count]{grid-column:3;grid-row:1;margin:0!important}.release-game-section .release-combo-field input{height:38px;padding-top:8px;padding-bottom:8px}.release-game-section .release-search-icon{top:12px}.release-game-section .release-step{width:26px;height:26px}@media(max-width:700px){.release-compose{width:calc(100vw - 20px);max-height:calc(100dvh - 20px)}.release-compose .release-game-section{grid-template-columns:minmax(0,1fr);gap:7px;padding:12px}.release-game-section>.release-section-title,.release-game-section>.release-combo,.release-game-section>[data-game-count]{grid-column:1;grid-row:auto}}
.release-content-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.release-content-heading .release-template-tools{margin-inline-start:auto}.release-template-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.release-template-tools [hidden]{display:none!important}.release-template-tools button{border:1px solid #c8d9ef;background:#f2f7ff;color:#365f98;padding:8px 12px;border-radius:8px;cursor:pointer}.release-template-tools label{min-width:150px}
.release-compose .release-pair{align-items:start}.release-compose .release-pair>label,.release-type-field>label{align-content:start}.release-compose .release-pair input[type=date],.release-compose select[name=environment]{height:46px;min-height:46px}.release-compose .release-message-pair textarea{min-height:160px;max-height:none;overflow-y:hidden;resize:none}
.release-recipient-summary{display:grid;gap:7px;margin:4px 0;padding:11px 12px;background:#eef4fd;border:1px solid #dce7f6;border-radius:10px}.release-recipient-summary strong{font-size:12px;color:#4d688b}.release-recipient-summary>div{display:flex;flex-wrap:wrap;gap:6px}.release-group-pill{padding:4px 9px;border:1px solid #c9daf3;border-radius:999px;background:#fff;color:#315a94;font-size:12px}.release-card-actions{display:flex;flex-wrap:wrap;gap:8px}
.release-assets-hint{font-size:15px;font-weight:600;line-height:1.5;color:#173d70}.release-time-highlight{display:inline-flex;align-items:center;justify-self:start;gap:10px;flex-wrap:wrap;max-width:100%;box-sizing:border-box;padding:6px 10px;background:#fff;border:1px solid #8faed1;border-left:4px solid #316ba8;border-radius:6px;color:#183958}.release-time-highlight span{font-size:15px;font-weight:650;color:#244a72}.release-time-highlight strong{font-size:16px;font-weight:600;letter-spacing:0;font-variant-numeric:tabular-nums}
.release-compose{height:calc(100dvh - 48px);overflow:hidden}.release-compose>.release-shell{height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;padding:20px}.release-compose>.release-shell>.release-head{flex-shrink:0}.release-compose [data-content]{flex:1;min-height:0;display:flex}.release-compose .release-compose-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(360px,.8fr);gap:20px;width:100%;height:100%;min-height:0}.release-compose-main,.release-compose-side{min-width:0;min-height:0;overflow:auto;scrollbar-gutter:stable;scroll-padding-bottom:90px;padding:2px 4px;display:flex;flex-direction:column;gap:14px}.release-compose-main>.release-section,.release-compose-side>.release-section{flex-shrink:0}.release-compose-side .release-message-pair{grid-template-columns:1fr}#releaseComposePreview{width:min(880px,94vw);max-height:90dvh;overflow:auto}#releaseComposePreview .release-preview{overflow-wrap:anywhere}@media(min-width:1051px){.release-compose-side>.release-section{flex:1;min-height:0;display:flex;flex-direction:column}.release-compose-side [data-recipient-list]{flex:1;min-height:0;overflow:auto;align-content:start}.release-compose-side{overflow:hidden;scrollbar-gutter:auto}}.release-compose-side [data-error]:empty{display:none}.release-compose-side .release-footer{flex-shrink:0;margin-top:auto;bottom:0;padding:12px 0;box-shadow:0 -9px 15px #f5f8fce8}.release-compose-side .release-footer button{flex:1;min-width:0}.release-publish{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:15px 18px;margin-top:10px;border:1px solid #2563eb;border-radius:12px;background:linear-gradient(135deg,#2563eb,#4f83ff);color:#fff;box-shadow:0 6px 16px #2563eb26;cursor:pointer;transition:background .15s,box-shadow .15s}.release-publish:hover{background:linear-gradient(135deg,#1d4ed8,#3975f3);box-shadow:0 8px 20px #2563eb33}.release-publish-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#ffffff25;font-size:17px}.release-publish>span:last-child{display:grid;gap:4px;text-align:left}.release-publish strong{font-size:15px!important;color:#fff!important}.release-publish small{font-size:11px;color:#e5eeff}
@media(max-width:1050px){.release-compose{height:auto;overflow:auto}.release-compose>.release-shell{height:auto}.release-compose [data-content]{display:block}.release-compose .release-compose-grid{grid-template-columns:minmax(0,1fr);height:auto}.release-compose-main,.release-compose-side{overflow:visible;min-height:auto;scrollbar-gutter:auto}.release-compose-side .release-footer{margin-top:0}.release-compose-side .release-message-pair{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.release-compose{max-height:calc(100dvh - 20px)}.release-compose>.release-shell{padding:12px}.release-compose .release-game-section{grid-template-columns:minmax(0,1fr)}.release-compose-side .release-message-pair{grid-template-columns:1fr}.release-time-highlight strong{font-size:16px}}

.release-compose .release-section:not(.release-game-section){padding:18px;border-radius:12px}.release-compose-side .release-preview{border-radius:12px;padding:18px}.release-compose-side .release-message-pair{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.release-compose-side .release-preview .release-message-pair p{white-space:pre-wrap;overflow-wrap:anywhere;overflow-x:visible;line-height:1.7;font-size:14px}.release-compose-side .release-title-pair h3{font-size:16px;line-height:1.5}.release-compose-side .release-title-pair h3[lang=en]{font-size:14px}.release-compose-side .release-footer button{flex:0 1 auto;min-width:100px;padding:9px 15px!important;font-size:13px!important}.release-publish{display:block;width:max-content;max-width:100%;margin:12px 0 0 auto;padding:9px 16px;border:1px solid #3977e8;border-radius:8px;background:#3977e8;color:#fff;font-size:13px;font-weight:600;line-height:1.5;box-shadow:none;white-space:normal;text-align:center}.release-publish:hover{background:#2b65d3;box-shadow:none}@media(min-width:1051px){.release-compose .release-compose-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.release-compose .release-game-section{grid-template-columns:120px minmax(200px,1fr) auto;gap:10px}}@media(max-width:700px){.release-compose-side .release-message-pair{grid-template-columns:1fr}}

.release-recipient-card{position:relative;min-width:0}.release-recipient-card label{height:100%;box-sizing:border-box;padding-inline-end:56px!important}.release-recipient-card button{position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px 7px;border:1px solid #b8cce6;border-radius:6px;background:white;color:#315a94;font-size:12px;cursor:pointer}[data-exception-platforms]{display:block!important;max-height:55vh!important;overflow:auto}.release-exception-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:5px;padding:4px}.release-exception-row>[data-exception-reason]{grid-column:1/-1;font-size:12px;padding:5px}.release-exception-row label{padding:4px!important;white-space:nowrap}.release-description-dates{display:grid;width:100%;min-width:0}.release-date-slot{display:grid;grid-template-columns:minmax(100px,1fr) 155px 100px;gap:8px;align-items:center;min-width:0}.release-date-slot:has(input[type=date]:last-child){grid-template-columns:minmax(0,1fr) minmax(125px,155px)}.release-date-slot>span{min-width:0;overflow-wrap:anywhere}.release-date-slot input{width:100%!important;min-width:0}.release-date-slot input[type=time]{width:100px!important}@media(max-width:650px){.release-date-slot{grid-template-columns:minmax(0,1fr) 100px}.release-date-slot>span{grid-column:1/-1}}
`;document.head.append(style);}
function notificationDialog(id){let dialog=document.getElementById(id);if(!dialog){dialog=document.createElement('dialog');dialog.id=id;dialog.className='release-dialog';dialog.setAttribute('data-viewer-control','');document.body.append(dialog);}return dialog;}
const RELEASE_COLLECTION='omniplay-release-notifications';
// Keep the legacy document as a backup; never overwrite an already migrated item.
const releaseMigrationTasks=new WeakMap();
async function migrateLegacyNotifications(db){
 const legacy=await getDoc(doc(db,'omniplay','game-release-notifications'));
 for(const item of legacy.exists()?legacy.data().items||[]:[]){
  if(!item.id||String(item.id).includes('/'))throw new Error('舊通知識別碼無效，請聯絡管理者');
  const ref=doc(db,RELEASE_COLLECTION,item.id);
  await runTransaction(db,async transaction=>{
   const current=await transaction.get(ref);
   if(!current.exists())transaction.set(ref,item);
  });
 }
}
export function migrateReleaseNotifications(db){
 if(!releaseMigrationTasks.has(db)){const task=migrateLegacyNotifications(db).catch(error=>{releaseMigrationTasks.delete(db);throw error});releaseMigrationTasks.set(db,task);}return releaseMigrationTasks.get(db);
}
function recipientFeeds(db, notification){
 const feeds=new Map();
 for(const groupId of notification.recipientScope?.shared??notification.groupIds??[]){
  const ref=doc(db,'omniplay-group-views',groupId);
  feeds.set(ref.path,{ref,shared:true});
 }
 for(const [id,groupId] of Object.entries(notification.recipientScope?.targeted??{})){
  const ref=doc(db,'omniplay-group-views',groupId,'release-platform-feeds',id);
  feeds.set(ref.path,{ref,shared:false});
 }
 return feeds;
}
async function syncRecipientFeeds(db,transaction,previous,next){
 const old=previous?recipientFeeds(db,previous):new Map();
 const active=next?recipientFeeds(db,next):new Map();
 const feeds=new Map([...old,...active]);
 const groupIds=next?.groupIds??[];
 if(feeds.size>450)throw new Error('一次調整的接收對象過多，請分次調整');
 const [groups,snapshots]=await Promise.all([
  Promise.all(groupIds.map(id=>transaction.get(doc(db,'omniplay-group-views',id)))),
  Promise.all([...feeds.values()].map(({ref})=>transaction.get(ref)))
 ]);
 if(groups.some(snapshot=>!snapshot.exists()||snapshot.data().enabled!==true))throw new Error('部分接收群組尚未同步或已停用');
 const id=(next||previous).id;
 [...feeds].forEach(([path,{ref,shared}],index)=>{
  const snapshot=snapshots[index];
  if(!snapshot.exists()&&!active.has(path))return;
  const remaining=(snapshot.data()?.releaseNotifications||[]).filter(item=>item.id!==id);
  const releaseNotifications=active.has(path)?appendReleaseNotification(remaining,publicReleaseNotification(next)):remaining;
  if(shared)transaction.update(ref,{releaseNotifications});
  else transaction.set(ref,{releaseNotifications});
 });
}
export async function publishReleaseNotification(db,notification){
 await migrateReleaseNotifications(db);
 const ref=doc(db,RELEASE_COLLECTION,notification.id);
 await runTransaction(db,async transaction=>{
  const source=await transaction.get(ref);
  if(source.exists())return;
  await syncRecipientFeeds(db,transaction,null,notification);
  transaction.set(ref,notification);
 });
}
export async function editReleaseNotification(db,notification,expectedRevision){
 const ref=doc(db,RELEASE_COLLECTION,notification.id);
 await runTransaction(db,async transaction=>{
  const source=await transaction.get(ref),previous=source.exists()?source.data():null;
  if(!previous||previous.status!=='published')throw new Error('通知已撤回或不存在，請重新開啟');
  if((previous.updatedAt||previous.createdAt)!==expectedRevision)throw new Error('通知已被其他管理員修改，請重新開啟後再編輯');
  const updated={...notification,createdAt:previous.createdAt,createdBy:previous.createdBy,createdByName:previous.createdByName,updatedAt:new Date().toISOString(),updatedBy:notification.createdBy,updatedByName:notification.createdByName};
  await syncRecipientFeeds(db,transaction,previous,updated);
  transaction.set(ref,updated);
 });
}
function notificationReadKey(item){return item.updatedAt?item.id+':'+item.updatedAt:item.id}
function recipientGroupNames(item){
 const scope=item.recipientScope;
 const delivered=scope?new Set([...scope.shared,...Object.values(scope.targeted)]):null;
 return (item.groupNames||[]).filter((name,index)=>name.trim()&&name.trim()!=='OMNIPLAY Support'&&(!delivered||delivered.has(item.groupIds[index])));
}
function recipientGroupsMarkup(item,admin,ownGroup){
 if(!admin)return '';
 const names=recipientGroupNames(item);
 return '<div class="release-recipient-summary"><strong>接收群組'+(admin?'（'+names.length+'）':'')+'</strong><div>'+names.map(name=>'<span class="release-group-pill">'+esc(name)+'</span>').join('')+'</div></div>';
}
export async function withdrawReleaseNotification(db,id,status='withdrawn'){
 await migrateReleaseNotifications(db);
 const ref=doc(db,RELEASE_COLLECTION,id);
 await runTransaction(db,async transaction=>{
  const source=await transaction.get(ref),notification=source.exists()?source.data():null;
  if(!notification||notification.status==='deleted'||(status==='withdrawn'&&notification.status!=='published'))return;
  await syncRecipientFeeds(db,transaction,notification,null);
  const now=new Date().toISOString();
  transaction.update(ref,{status,...(status==='deleted'?{deletedAt:now}:{withdrawnAt:now})});
 });
}
export async function deleteReleaseNotification(db,id){return withdrawReleaseNotification(db,id,'deleted');}
const recipientCategories={
 philweb:'Philweb 旗下平台',
 restricted:'UAT 和 PROD 不可上架（尚未取得 Pagcor 驗證）',
 uatOnly:'UAT 可上架，PROD 不可上架（尚未取得 Pagcor 驗證）',
 other:'未分類'
};
function recipientLayout(groups,saved=[]){
 const remaining=new Set(groups.map(group=>String(group.id))),sections=new Map();
 for(const item of Array.isArray(saved)?saved:[]){
  if(!Object.hasOwn(recipientCategories,item?.key)||sections.has(item.key))continue;
  sections.set(item.key,(Array.isArray(item.groupIds)?item.groupIds:[]).filter(id=>remaining.delete(id)));
 }
 for(const key of Object.keys(recipientCategories))if(!sections.has(key))sections.set(key,[]);
 sections.get('other').push(...remaining);
 return Array.from(sections,([key,groupIds])=>({key,groupIds}));
}
function setupRecipientEditor(form,groups,initial,save){
 let layout=recipientLayout(groups,initial);
 const names=new Map(groups.map(group=>[String(group.id),group.name]));
 const list=form.querySelector('[data-recipient-list]');
 function render(){
  const selected=new Set(Array.from(list.querySelectorAll('input:checked'),input=>input.value));
  list.innerHTML=layout.filter(section=>section.key!=='other'||section.groupIds.length).map(({key,groupIds})=>
   '<section><strong>'+recipientCategories[key]+'</strong><div class="release-recipients">'+groupIds.map(id=>
    '<div class="release-recipient-card"><label><input type="checkbox" name="groupId" value="'+esc(id)+'"'+(selected.has(id)?' checked':'')+'><span>'+esc(names.get(id))+'</span></label><button type="button" data-group-exceptions="'+esc(id)+'" aria-label="'+esc(names.get(id))+' 選擇接收平台">平台</button></div>').join('')+(groupIds.length?'':'<small>尚無群組</small>')+'</div></section>').join('');
 }
 render();
 const edit=form.querySelector('[data-edit-recipients]');
 edit.onclick=()=>{
  const dialog=notificationDialog('releaseRecipientEditor');
  let draft=structuredClone(layout),drag=null,saving=false;
  dialog.innerHTML='<section class="release-shell"><h2>編輯接收群組</h2><p>拖曳群組可排序或移到其他分類。拖曳分類標題可調整分類順序。</p><div data-board></div><p role="alert"></p><div class="release-actions"><button type="button" data-cancel-layout>取消</button><button type="button" data-save-layout>儲存排列</button></div></section>';
  const board=dialog.querySelector('[data-board]'),error=dialog.querySelector('[role=alert]');
  const find=key=>draft.find(section=>section.key===key);
  function paint(){
   board.innerHTML=draft.map(({key,groupIds})=>'<section data-zone="'+key+'"><strong draggable="true" data-heading>⠿ '+recipientCategories[key]+'</strong><div>'+groupIds.map(id=>'<button type="button" draggable="true" data-group="'+esc(id)+'">⠿ '+esc(names.get(id))+'</button>').join('')+(groupIds.length?'':'<small>拖曳群組到這裡</small>')+'</div></section>').join('');
  }
  board.ondragstart=e=>{
   const handle=e.target.closest('[draggable]');if(!handle||saving){e.preventDefault();return;}
   drag={key:handle.closest('[data-zone]').dataset.zone,id:handle.dataset.group};
   e.dataTransfer.setData('text/plain',drag.id??drag.key);e.dataTransfer.effectAllowed='move';
  };
  board.ondragover=e=>{if(drag&&!saving)e.preventDefault();};
  board.ondragend=()=>{drag=null;};
  board.ondrop=e=>{
   const target=e.target.closest('[data-zone]');if(!drag||!target||saving)return;e.preventDefault();
   const from=find(drag.key),to=find(target.dataset.zone);
   if(drag.id===undefined){
    if(from!==to){const at=draft.indexOf(to);draft.splice(draft.indexOf(from),1);draft.splice(at,0,from);}
   }else{
    const tile=e.target.closest('[data-group]'),before=tile?.dataset.group;
    if(before!==drag.id){
     let at=to.groupIds.length;
     if(tile){const rect=tile.getBoundingClientRect();at=to.groupIds.indexOf(before)+(e.clientX>=rect.left+rect.width/2?1:0);}
     const old=from.groupIds.indexOf(drag.id);from.groupIds.splice(old,1);
     to.groupIds.splice(at-(from===to&&old<at?1:0),0,drag.id);
    }
   }
   drag=null;paint();
  };
  const close=()=>{if(!saving&&(JSON.stringify(draft)===JSON.stringify(layout)||confirm('放棄未儲存的群組排列？')))dialog.close();};
  dialog.oncancel=e=>{e.preventDefault();close();};
  dialog.querySelector('[data-cancel-layout]').onclick=close;
  const submit=dialog.querySelector('[data-save-layout]');
  submit.onclick=async()=>{
   if(saving)return;saving=true;submit.disabled=true;error.textContent='';
   try{const current=await save(layout,draft);layout=recipientLayout(groups,current??draft);render();
    if(current){draft=structuredClone(layout);paint();error.textContent='其他人已更新排列，已載入最新版本，請重新調整。';}else dialog.close();
   }catch(err){error.textContent='排列儲存失敗：'+releaseErrorMessage(err);}
   finally{saving=false;submit.disabled=false;}
  };
  paint();dialog.showModal();
 };
}

export async function updateReleaseTypes(db,change){
 let result;
 await runTransaction(db,async transaction=>{const ref=doc(db,'omniplay','release-notification-types'),snapshot=await transaction.get(ref);result=changeReleaseTypes(upgradeReleaseTypeConfig(snapshot.exists()?snapshot.data():undefined),change);transaction.set(ref,{types:result,version:6,updatedAt:new Date().toISOString()},{merge:true});});
 return result;
}
export async function ensureReleaseTypes(db){
 const snapshot=await getDoc(doc(db,'omniplay','release-notification-types'));
 return upgradeReleaseTypeConfig(snapshot.exists()?snapshot.data():undefined);
}
export function releaseQuotaError(error){return /resource-exhausted|quota.*exceed/i.test(String(error?.code||'')+' '+String(error?.message||error||''));}
export function releaseErrorMessage(error){
 if(releaseQuotaError(error))return 'Firebase 資料庫配額已用盡，暫時無法讀取或發布通知。這不是通知內容或權限設定的錯誤；請稍後再試，或由管理員查看 Firebase 用量。';
 return String(error?.message||error||'通知載入失敗');
}
export async function loadReleaseComposeData(db,state={}){
 let limited=false;
 const read=async(id,fallback)=>{const ref=doc(db,'omniplay',id);try{return await getDoc(ref);}catch(error){
  if(!releaseQuotaError(error))throw error;limited=true;
  try{const cached=await getDocFromCache(ref);if(cached.exists())return cached;}catch{}
  return {exists:()=>true,data:()=>fallback};
 }};
 const [rows,records,workspace,types]=await Promise.all([read('game-list-online-page',{rows:window.GAME_LIST_ONLINE_DATA||[]}),read('op-game-form-records',{records:{}}),read('workspace',{customerGroups:state.customerGroups||[]}),read('release-notification-types',{})]);
 return {rows,records,workspace,recipientLayout:types.data()?.recipientLayout,types:upgradeReleaseTypeConfig(types.exists()?types.data():undefined),limited};
}
function notificationTypeLabel(item,admin=false){const en=!admin&&english();return (en?item.typeNameEn||item.typeName:item.typeName)||ENVIRONMENTS[item.environment]?.[en?'en':'zh']||item.environment}
const templateLabels={titleZh:'通知標題（中）',titleEn:'通知標題（英）',messageZh:'通知說明（中）',messageEn:'通知說明（英）'};
function rawTemplateFields(type,record){
 const source=record?.fields||releaseTemplate(type)||{};
 return Object.fromEntries(Object.keys(templateLabels).map(key=>[key,source[key]||'']));
}
function composeTemplate(type,game,templates){
 const base=releaseTemplate(type,game),saved=templates.get(type);
 if(!saved)return base;
 const values={gameId:game?.id,gameNameZh:game?.mandarinName,gameNameEn:game?.name};
 const fields=Object.fromEntries(Object.entries(saved.fields).map(([key,text])=>[key,text.replace(/\{\{(gameId|gameNameZh|gameNameEn)\}\}/g,(_,token)=>values[token]||'')]));
 return {...base,...fields};
}
function editFixedTemplate(db,type,typeName,templates,author,onSaved){
 const dialog=notificationDialog('releaseFixedTemplate'),current=templates.get(type),before=rawTemplateFields(type,current);
 const fields=Object.entries(templateLabels).map(([key,title])=>'<label>'+title+'<textarea name="'+key+'" maxlength="'+(key.startsWith('title')?200:2000)+'">'+esc(before[key])+'</textarea></label>').join('');
 dialog.innerHTML='<form class="release-shell release-form"><div class="release-head"><h2>編輯固定模板 · '+esc(typeName)+'</h2><button type="button" data-close>關閉</button></div><p>儲存後，新建立的通知會套用此版本。可使用 {{gameId}}、{{gameNameZh}}、{{gameNameEn}}，日期欄位請保留模板中的日期標記。</p>'+fields+'<details><summary>修改紀錄</summary><div data-history></div></details><p role="status"></p><button type="submit">儲存為固定模板</button></form>';
 const form=dialog.querySelector('form'),status=form.querySelector('[role=status]'),ref=doc(db,'omniplay-notification-templates',type);
 form.querySelector('[data-close]').onclick=()=>dialog.close();
 form.querySelector('details').ontoggle=async event=>{
  if(!event.target.open)return;
  const target=form.querySelector('[data-history]');
  try{
   const result=await getDocs(query(collection(ref,'history'),orderBy('at','desc')));
   target.innerHTML=result.docs.map(row=>{
    const data=row.data(),changes=Object.entries(templateLabels).filter(([key])=>data.before[key]!==data.fields[key]);
    return '<details><summary>'+esc(data.author)+' · '+esc(time(data.at.toDate()))+'</summary>'+changes.map(([key,title])=>'<strong>'+title+'</strong><p>修改前<br>'+esc(data.before[key])+'</p><p>修改後<br>'+esc(data.fields[key])+'</p>').join('')+'</details>';
   }).join('')||'尚無修改紀錄';
  }catch(error){target.textContent=releaseErrorMessage(error)}
 };
 form.onsubmit=async event=>{
  event.preventDefault();
  const fields=Object.fromEntries(Object.keys(templateLabels).map(key=>[key,form.elements[key].value.trim()]));
  if(!fields.titleZh&&!fields.titleEn){status.textContent='請填寫通知標題';return}
  if(Object.keys(fields).every(key=>fields[key]===before[key])){status.textContent='內容尚未變更';return}
  const submit=form.querySelector('[type=submit]');submit.disabled=true;
  const version=doc(collection(ref,'history')),data={fields,before,uid:getAuth().currentUser.uid,author,revision:version.id,at:serverTimestamp()};
  try{
   await runTransaction(db,async tx=>{
    const snapshot=await tx.get(ref);
    if(snapshot.data()?.revision!==current?.revision){
     if(snapshot.exists())templates.set(type,snapshot.data());
     throw new Error('其他管理員已更新模板，請關閉後重新開啟編輯。');
    }
    tx.set(ref,data);tx.set(version,data);
   });
   templates.set(type,data);onSaved();dialog.close();
  }catch(error){status.textContent=releaseErrorMessage(error)}
  finally{submit.disabled=false}
 };
 dialog.showModal();
}

export function installReleaseNotifications({db=getFirestore(),state,openNotificationGame}){
 if(document.getElementById('releaseNotificationBell')||!window.__omniplaySession)return;
 const session=window.__omniplaySession,admin=!!session.canEdit,groupId=session.groupId;
 if(!admin&&!groupId)return;
 styles();const controls=document.querySelector('.session-controls');if(!controls)return;
 const button=document.createElement('button');button.id='releaseNotificationBell';button.type='button';button.className='secondary release-bell';button.innerHTML='<span data-bell-label></span><span class="release-badge" hidden></span>';controls.insertBefore(button,controls.querySelector('.account-settings'));
 const readKey='omniplay-release-read-v1:'+session.authUid+':'+(groupId||'admin');let read=new Set(),items=[],error='',loaded=false;
 try{read=new Set(JSON.parse(localStorage.getItem(readKey)||'[]'));}catch{}
 const saveRead=()=>{try{localStorage.setItem(readKey,JSON.stringify([...read].slice(-500)));}catch{}};
 const markRead=id=>{const item=items.find(item=>item.id===id);read.add(item?notificationReadKey(item):id);saveRead();paintBell();};
 function paintBell(){const unread=visibleReleaseNotifications(items).filter(item=>!read.has(notificationReadKey(item))).length;button.querySelector('[data-bell-label]').textContent=admin?'🔔 通知管理':label('🔔 通知','🔔 Notifications');const badge=button.querySelector('.release-badge');badge.hidden=admin||!unread;badge.textContent=unread>99?'99+':String(unread);button.setAttribute('aria-label',admin?'通知管理':label('通知，未讀 '+unread+' 則','Notifications, '+unread+' unread'));}
 function openList(){const dialog=notificationDialog('releaseNotificationList');dialog.innerHTML='<section class="release-shell"><div class="release-head"><h2>'+ (admin?'上架通知管理':label('通知','Notifications'))+'</h2><button type="button" data-close>'+label('關閉','Close')+'</button></div><div class="release-actions">'+(admin?'<button type="button" class="release-primary" data-compose>＋ 新增上架通知</button>':'<button type="button" data-read-all>'+label('全部標為已讀','Mark all as read')+'</button>')+'</div><div class="release-small">'+(admin?'顯示最近 '+NOTIFICATION_LIMIT+' 則發布紀錄。上架時間為通知內容，按發布後立即通知所選群組。':label('上架日期以 UTC+8 顯示。已讀狀態保留於此瀏覽器。','Release dates use UTC+8. Read status is saved in this browser.'))+'</div><div class="release-list" data-list></div><div class="release-pages" data-pages></div></section>';dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-compose]')?.addEventListener('click',()=>compose(dialog));dialog.querySelector('[data-read-all]')?.addEventListener('click',()=>{visibleReleaseNotifications(items).forEach(item=>read.add(notificationReadKey(item)));saveRead();paintBell();renderList(dialog);});renderList(dialog);if(!dialog.open)dialog.showModal();}
 const imageCache=new Map();
 function loadImages(list){list.querySelectorAll('[data-release-image]').forEach(image=>{const key=image.dataset.notificationId+'/'+image.dataset.releaseImage;if(!imageCache.has(key))imageCache.set(key,readReleaseImage(db,image.dataset.notificationId,image.dataset.releaseImage).catch(error=>{imageCache.delete(key);throw error}));imageCache.get(key).then(data=>{if(image.isConnected)image.src=data}).catch(()=>{if(image.isConnected)image.alt=label('圖片載入失敗，請重新開啟通知重試','Image unavailable. Reopen to retry.')})});}
 function bindGameLinks(container,dialog){container.querySelectorAll('[data-notification-game]').forEach(button=>button.onclick=async()=>{
  button.disabled=true;try{if(typeof openNotificationGame!=='function')throw new Error(label('遊戲資料尚未就緒，請重新整理','Game resources are not ready. Please refresh.'));await openNotificationGame(button.dataset.notificationGame);dialog?.close();}catch(error){alert(label('無法開啟遊戲資料：','Unable to open game resources: ')+(error.message||error));}finally{button.disabled=false;}
 });}
 function renderAdminList(list,dialog,rows){
  const sections=['流程','特選','其他'].map(category=>{
   const section=rows.filter(item=>notificationCategory(item)===category);
   if(!section.length)return '';
   return '<tr class="release-category-row"><th colspan="4" scope="rowgroup">'+esc(categoryLabel(category))+'</th></tr>'+section.map(item=>{
    const transition=notificationTransition(item),published=item.status==='published';
    const groups=recipientGroupNames(item);
    const groupTooltip=groups.join('\n')||label('無接收群組','No recipient groups');
    return '<tr><td><button type="button" class="release-game-link" data-notification-game="'+esc(item.game?.id)+'">'+esc(item.game?.id)+'</button></td><td><button type="button" class="release-type-detail" data-details="'+esc(item.id)+'">'+esc(notificationTypeLabel(item,true))+'</button>'+(published?'':' <span class="release-meta">已撤回</span>')+'</td><td>'+esc(notificationHasNoReleaseDate(item)?'':releaseDate(item.releaseAt))+'</td><td class="release-actions-cell"><div class="release-row-actions">'+(transition?'<button type="button" data-transition="'+esc(item.id)+'">'+esc(transition.label)+'</button>':'')+(published?'<button type="button" data-edit="'+esc(item.id)+'">編輯</button><button type="button" data-withdraw="'+esc(item.id)+'">撤回</button>':'')+'<button type="button" data-delete="'+esc(item.id)+'">刪除</button><button type="button" data-groups="'+esc(item.id)+'" title="'+esc(groupTooltip)+'">接收群組（'+groups.length+'）</button></div></td></tr>';
   }).join('');
  }).join('');
  list.innerHTML='<div class="release-table-scroll"><table class="release-admin-table"><thead><tr><th scope="col">Game ID</th><th scope="col">通知類型</th><th scope="col">上架時間（UTC+8）</th><th scope="col" class="release-actions-heading">功能鍵</th></tr></thead><tbody>'+(sections||'<tr><td colspan="4" class="release-meta">目前沒有通知</td></tr>')+'</tbody></table></div>';
  bindGameLinks(list,dialog);
  const find=button=>items.find(item=>item.id===(button.dataset.edit||button.dataset.transition||button.dataset.withdraw||button.dataset.delete||button.dataset.groups||button.dataset.details));
  list.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>compose(dialog,find(button)));
  list.querySelectorAll('[data-transition]').forEach(button=>button.onclick=()=>{const item=find(button);compose(dialog,null,{game:item.game,groupIds:item.groupIds,recipientScope:item.recipientScope,transition:notificationTransition(item)});});
  list.querySelectorAll('[data-withdraw],[data-delete]').forEach(button=>button.onclick=async()=>{
   const deleting=button.hasAttribute('data-delete');if(!confirm(deleting?'刪除這則通知？管理列表與接收端會一起移除。':'撤回這則通知？接收端會移除，管理列表保留紀錄。'))return;
   button.disabled=true;try{if(deleting)await deleteReleaseNotification(db,find(button).id);else await withdrawReleaseNotification(db,find(button).id);}catch(error){alert('操作失敗：'+(error.message||error));button.disabled=false;}
  });
  list.querySelectorAll('[data-details],[data-groups]').forEach(button=>button.onclick=()=>{
   const item=find(button),groupsOnly=button.hasAttribute('data-groups'),detail=notificationDialog('releaseNotificationDetail');
   detail.innerHTML='<section class="release-shell"><div class="release-head"><h2>'+(groupsOnly?'接收群組':'通知內容')+'</h2><button type="button" data-close>關閉</button></div>'+recipientGroupsMarkup(item,true,'')+(groupsOnly?'':notificationTitleMarkup(item,true)+notificationGameMarkup(item,true)+bilingualMessageMarkup(item)+'<div class="release-image-grid">'+imageMarkup(item)+'</div>')+'</section>';
   detail.querySelector('[data-close]').onclick=()=>detail.close();loadImages(detail);bindGameLinks(detail,detail);detail.showModal();
  });
 }
 function renderCustomerList(list,dialog,rows){
  const expanded=new Set([...list.querySelectorAll('details[open]')].map(row=>row.dataset.item));
  list.innerHTML=rows.map(item=>{
   const unread=!read.has(notificationReadKey(item)),game=item.game||{};
   const name=[game.id,english()?game.name||game.mandarinName:game.mandarinName||game.name].filter(Boolean).join(' · ');
   const tag='<span class="release-tag">'+esc(notificationTypeLabel(item))+'</span>';
   const summary='<summary>'+tag+' <strong>'+esc(name)+'</strong> <span class="release-meta">'+esc(releaseDate(item.createdAt))+'</span>'+(unread?' <span class="release-meta">'+label('未讀','Unread')+'</span>':'')+'</summary>';
   const body=notificationTitleMarkup(item)+recipientGroupsMarkup(item,false,session.groupName||state.customerGroups?.find(group=>group.id===groupId)?.name)+notificationGameMarkup(item)+notificationReleaseTimeMarkup(item)+'<p>'+notificationMessageMarkup(notificationMessage(item),game.id)+'</p><div class="release-image-grid">'+imageMarkup(item)+'</div><div class="release-meta">'+label('發布時間','Published')+'：'+esc(time(item.createdAt))+'</div>';
   return '<details class="release-card release-compact '+(unread?'unread':'')+'" data-item="'+esc(item.id)+'"'+(expanded.has(String(item.id))?' open':'')+'>'+summary+'<div class="release-expanded">'+body+(unread?'<button type="button" data-read="'+esc(item.id)+'">'+label('標為已讀','Mark as read')+'</button>':'')+'</div></details>';
  }).join('')||'<div class="release-empty">'+label('目前沒有通知','No notifications yet')+'</div>';
  list.querySelectorAll('details').forEach(row=>{row.ontoggle=()=>{if(row.open)loadImages(row)};if(row.open)loadImages(row)});
  bindGameLinks(list,dialog);
  list.querySelectorAll('[data-read]').forEach(button=>button.onclick=()=>{markRead(button.dataset.read);renderList(dialog)});
 }
 function groupNotifications(rows){
  const games=new Map();
  for(const item of rows){
   const id=String(item.game?.id??'').trim(),key=id?'game:'+id:'notification:'+item.id;
   if(!games.has(key))games.set(key,[]);
   games.get(key).push(item);
  }
  return [...games.entries()];
 }
 function renderGameGroups(list,dialog,groups){
  const openGames=new Set([...list.querySelectorAll('[data-game-group][open]')].map(row=>row.dataset.gameGroup));
  const openItems=new Set([...list.querySelectorAll('[data-item][open]')].map(row=>row.dataset.item));
  list.replaceChildren();
  if(!groups.length){list.textContent=label('目前沒有通知','No notifications yet');return;}
  for(const [key,rows] of groups){
   const latest=rows[0],game=latest.game||{},useEnglish=!admin&&english();
   const name=[game.id,useEnglish?game.name||game.mandarinName:game.mandarinName||game.name].filter(Boolean).join(' · ');
   const types=[...new Set(rows.map(item=>notificationTypeLabel(item,admin)))];
   const unread=!admin&&rows.filter(item=>!read.has(notificationReadKey(item))).length;
   const group=document.createElement('details');
   group.className='release-card release-compact'+(unread?' unread':'');
   group.dataset.gameGroup=key;
   group.open=openGames.has(key);
   group.innerHTML='<summary><strong>'+esc(name)+'</strong> '+types.map(type=>'<span class="release-tag">'+esc(type)+'</span>').join(' ')+' <span class="release-meta">'+rows.length+(useEnglish?' notifications':' 則通知')+'</span>'+(unread?' <span>'+unread+label(' 則未讀',' unread')+'</span>':'')+'</summary><div class="release-expanded" data-group-body></div>';
   list.append(group);
   const body=group.querySelector('[data-group-body]');
   const show=()=>{
    if(!group.open||body.childElementCount)return;
    if(admin){renderAdminList(body,dialog,rows);return;}
    renderCustomerList(body,dialog,rows);
    body.querySelectorAll('[data-item]').forEach(row=>{if(openItems.has(row.dataset.item))row.open=true;});
   };
   group.ontoggle=show;
   show();
  }
 }
 function renderList(dialog){
  const list=dialog.querySelector('[data-list]'),pager=dialog.querySelector('[data-pages]');
  if(!list)return;
  pager.replaceChildren();
  if(error&&!items.length){list.innerHTML='<div class="release-error">'+esc(error)+'</div>';return}
  if(!loaded){list.textContent=label('載入中…','Loading…');return}
  const rows=admin?items.filter(item=>item.status!=='deleted'):visibleReleaseNotifications(items);
  const groups=groupNotifications(rows);
  const size=10,pages=Math.max(1,Math.ceil(groups.length/size)),page=Math.min(pages,Number(list.dataset.page)||1);
  list.dataset.page=page;
  renderGameGroups(list,dialog,groups.slice((page-1)*size,page*size));
  if(pages===1)return;
  pager.innerHTML='<button type="button" data-prev>'+label('上一頁','Previous')+'</button><span>'+page+' / '+pages+'</span><button type="button" data-next>'+label('下一頁','Next')+'</button>';
  for(const [selector,delta] of [['[data-prev]',-1],['[data-next]',1]]){
   const button=pager.querySelector(selector);
   button.disabled=page+delta<1||page+delta>pages;
   button.onclick=()=>{list.dataset.page=page+delta;renderList(dialog);list.scrollTop=0;};
  }
 }
 async function compose(parent,existing=null,prefill=null){
  const dialog=notificationDialog('releaseNotificationCompose');dialog.classList.add('release-compose');dialog.innerHTML='<section class="release-shell"><div class="release-head"><div><div class="release-eyebrow">GAME RELEASE · NOTIFICATION</div><h2>'+(existing?'編輯上架通知':'新增上架通知')+'</h2><p class="release-intro">選擇遊戲後，自動帶入可查看該遊戲的接收群組，再編寫通知內容。</p></div><div data-release-flow role="status"></div><button type="button" data-close>關閉</button></div><div data-content>載入遊戲與接收群組…</div></section>';dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.showModal();
  try{
   let existingReadLimited=false;if(existing){try{const latest=await getDoc(doc(db,RELEASE_COLLECTION,existing.id));if(!latest.exists()||latest.data().status!=='published')throw new Error('通知已撤回或不存在');existing=latest.data();}catch(error){if(!releaseQuotaError(error))throw error;existingReadLimited=true;}}
   const sourceData=await loadReleaseComposeData(db,state),{rows:rowsSnapshot,records:recordsSnapshot,workspace:workspaceSnapshot,types:typesSnapshot,limited:sourceLimited}=sourceData,quotaLimited=sourceLimited||existingReadLimited;
   let notificationTypes=typesSnapshot;
   const templates=new Map(),uid=getAuth().currentUser.uid;
   const rondo=session.superAdmin&&!session.bootstrap;
   let editorName=rondo?'Rondo':'';
   if(!quotaLimited){
    const saved=await getDocs(collection(db,'omniplay-notification-templates'));
    saved.forEach(row=>templates.set(row.id,row.data()));
    if(!rondo&&!session.bootstrap){
     const [profile,grant]=await Promise.all([getDoc(doc(db,'omniplay-member-access',uid)),getDoc(doc(db,'omniplay-template-grants',uid))]);
     if(profile.data()?.enabled&&grant.exists())editorName=profile.data().username;
    }
   }
   const records=recordsSnapshot.data()?.records||{},rows=preferredGameRows(gameListRows(rowsSnapshot.data()||{})),games=new Map();
   for(const row of rows){const id=String(row[0]??'').trim();if(id&&!games.has(id))games.set(id,{id,name:String(row[2]??''),version:String(row[1]??''),mandarinName:String(records[id]?.mandarinName||'')});}
   if(existing?.game&&!games.has(existing.game.id))games.set(existing.game.id,existing.game);
   if(existing&&!notificationTypes.some(type=>type.id===existing.environment))notificationTypes.push({id:existing.environment,category:existing.typeCategory||'舊通知類型',name:existing.typeName||ENVIRONMENTS[existing.environment]?.zh||existing.environment,nameEn:existing.typeNameEn||ENVIRONMENTS[existing.environment]?.en||''});
   const groups=workspaceSnapshot.data()?.customerGroups||state.customerGroups||[];
   const supportGroup=groups.find(group=>group.name?.trim()==='OMNIPLAY Support');
   const selectableGroups=groups.filter(group=>group!==supportGroup);
   if(!games.size)throw new Error(quotaLimited?'Firebase 配額不足，且此瀏覽器沒有可用的遊戲快取，暫時無法開啟通知表單。':'尚無遊戲資料，請先建立 Game List');
   if(!groups.length)throw new Error(quotaLimited?'Firebase 配額不足，且此瀏覽器沒有可用的接收群組資料，暫時無法開啟通知表單。':'尚無接收群組，請先建立群組');
   const local='';
   if(quotaLimited){const warning=document.createElement('p');warning.className='release-error';warning.setAttribute('role','status');warning.textContent='目前使用上次資料或內建資料編寫草稿。Firebase 配額不足，暫時無法發布、儲存修改或變更通知類型。';dialog.querySelector('[data-content]').before(warning);}
   dialog.querySelector('[data-content]').innerHTML='<form class="release-form release-compose-grid"><div class="release-compose-main"><section class="release-section release-game-section"><div class="release-section-title"><span class="release-step">01</span>選擇遊戲</div><label for="releaseGameSearch">遊戲</label><div class="release-combo" data-game-combo><span class="release-search-icon" aria-hidden="true">⌕</span><div class="release-combo-field"><input id="releaseGameSearch" type="text" name="gameSearch" role="combobox" aria-autocomplete="list" aria-controls="releaseGameOptions" aria-expanded="false" placeholder="搜尋 Game ID、中文或英文名稱" autocomplete="off" required><button type="button" class="release-combo-toggle" data-game-toggle aria-label="展開遊戲選單">⌄</button></div><div id="releaseGameOptions" class="release-game-menu" role="listbox" aria-label="可選遊戲" hidden></div><input type="hidden" name="gameId"></div><div class="release-small" data-game-count></div></section><section class="release-section"><div class="release-content-heading"><div class="release-section-title"><span class="release-step">02</span>通知內容</div><div class="release-template-tools"><button type="button" data-apply-template>重新套用模板</button></div></div><div class="release-pair"><div class="release-type-field"><label>通知類型<select name="environment" required></select></label><details class="release-type-manager"><summary>管理類型（新增／刪除）</summary><div class="release-type-editor"><div class="release-small">類型清單會同步給所有管理員；刪除類型不影響已發布的通知。</div><div data-type-list></div><details class="release-type-group" name="release-type-tools"><summary>＋ 新增類型</summary><div class="release-type-add"><label>分類<select name="newTypeCategory"><option value="流程">'+categoryLabel('流程')+'</option><option value="特選">特選（獨家首發）</option><option>其他</option></select></label><label>類型名稱<input name="newTypeName" maxlength="80" placeholder="例如：維護通知 UAT"></label><label>英文名稱（選填）<input name="newTypeEnglish" maxlength="120" placeholder="例如：Maintenance UAT"></label><button type="button" data-add-type>新增</button></div></details></div></details></div><label><span data-release-date-label>上架時間（UTC+8）</span><input type="date" name="releaseAt" value="'+local+'" required></label></div><div class="release-message-pair"><label>通知標題（中）<input name="titleZh" lang="zh-Hant" required maxlength="200" placeholder="依通知類型自動帶入，可自行修改"></label><label>通知標題（英）<input name="titleEn" lang="en" required maxlength="200" placeholder="Auto-filled by notification type; editable"></label></div><span class="release-small" data-template-note role="status"></span><div class="release-date-reminder" data-date-reminder role="status" hidden><strong>說明日期時間（UTC+8）</strong><div class="release-description-dates" data-description-dates></div></div><div class="release-message-pair"><label>通知說明（中）<textarea name="messageZh" lang="zh-Hant" maxlength="2000" rows="5" placeholder="例如：遊戲已於測試環境上架，請安排驗收。"></textarea></label><label>通知說明（英）<textarea name="messageEn" lang="en" maxlength="2000" rows="5" placeholder="Example: The game is now available in the test environment. Please arrange acceptance testing."></textarea></label></div><div class="release-image-upload"><div class="release-image-upload-head"><span>通知圖片</span><button type="button" class="release-image-choose" data-choose-images>＋ 選擇圖片</button></div><input type="file" name="notificationImages" accept="image/jpeg,image/png,image/webp" multiple hidden><div class="release-image-paste" data-image-paste tabindex="0" role="group" aria-label="貼上通知圖片" aria-describedby="releaseImagePasteHelp"><span class="release-image-paste-icon" aria-hidden="true">▧</span><strong>在這裡貼上圖片</strong><span>點一下此區域，再按 <kbd>Ctrl</kbd> + <kbd>V</kbd>（Mac：⌘V）</span></div><div class="release-small" id="releaseImagePasteHelp">最多 3 張 JPG、PNG 或 WebP，單張上限 10 MB；圖片會自動縮圖。</div></div><div class="release-image-grid" data-image-drafts></div><div class="release-small" data-image-status role="status"></div></section></div><aside class="release-compose-side"><section class="release-section"><div class="release-head"><div class="release-section-title"><span class="release-step">03</span>接收群組</div><div class="release-actions"><button type="button" data-edit-recipients'+(quotaLimited?' disabled':'')+'>編輯排列</button><button type="button" data-select-all>全選／取消全選</button></div></div><p class="release-small">依所有平台列表的「所屬群組 / GAME LIST 權限」帶入平台。</p><div data-recipient-list></div><div class="release-small" data-recipient-hint>選擇遊戲後，自動勾選該遊戲所屬群組，可再手動調整。</div><div class="release-small">通知不會變更遊戲上架狀態或群組查看權限。發布後立即送出；上架時間不是排程時間。</div><div class="release-error" data-error role="alert"></div><div class="release-actions release-footer"><button type="button" data-cancel>取消</button><button type="submit" class="release-primary">預覽通知</button></div></section></aside></form>';
   const form=dialog.querySelector('form'),preview=notificationDialog('releaseComposePreview'),errorBox=form.querySelector('[data-error]');form.onsubmit=event=>event.preventDefault();form.querySelector('[type="submit"]').disabled=true;
   preview.setAttribute('aria-labelledby','releasePreviewTitle');
   dialog.addEventListener('close',()=>preview.close(),{once:true});
   setupRecipientEditor(form,selectableGroups,sourceData.recipientLayout,(previous,next)=>runTransaction(db,async transaction=>{
    const ref=doc(db,'omniplay','release-notification-types'),snapshot=await transaction.get(ref);
    const current=recipientLayout(selectableGroups,snapshot.data()?.recipientLayout);
    if(JSON.stringify(previous)!==JSON.stringify(current))return current;
    transaction.set(ref,{recipientLayout:next},{merge:true});
   }));
   let draftImages=[],imageBusy=false;
   const imageInput=form.elements.notificationImages,imageDrafts=form.querySelector('[data-image-drafts]'),imageStatus=form.querySelector('[data-image-status]');
   const renderDrafts=()=>{imageDrafts.innerHTML=draftImages.map(image=>'<figure class="release-image release-image-draft">'+(image.data?'<img src="'+esc(image.data)+'" alt="'+esc(image.name)+'">':'<div class="release-small">原圖片暫時無法預覽，儲存時仍會保留。</div>')+'<figcaption>'+esc(image.name)+'</figcaption><button type="button" data-remove-image="'+esc(image.id)+'" aria-label="移除 '+esc(image.name)+'">移除圖片</button></figure>').join('');};
   imageDrafts.onclick=event=>{const remove=event.target.closest('[data-remove-image]');if(!remove||imageBusy)return;draftImages=draftImages.filter(image=>image.id!==remove.dataset.removeImage);renderDrafts();preview.close();};
   const omitImages=()=>['flow-pord','selected-pord','other-pord','production'].includes(form.elements.environment.value);
   const addImages=async files=>{
    if(omitImages())return;
    if(imageBusy)return;errorBox.textContent='';preview.close();
    if(draftImages.length+files.length>MAX_RELEASE_IMAGES){errorBox.textContent='每則通知最多 3 張圖片';imageInput.value='';return}
    imageBusy=true;imageInput.disabled=true;form.querySelector('[data-choose-images]').disabled=true;form.querySelector('[type="submit"]').disabled=true;imageStatus.textContent='正在處理圖片…';
    try{const prepared=[];for(const file of files)prepared.push(await prepareReleaseImage(file));draftImages.push(...prepared);renderDrafts();imageStatus.textContent='已加入 '+draftImages.length+' 張圖片';}
    catch(error){errorBox.textContent=error.message||'圖片處理失敗';imageStatus.textContent='';}
    finally{imageBusy=false;imageInput.disabled=false;form.querySelector('[data-choose-images]').disabled=false;imageInput.value='';form.querySelector('[type="submit"]').disabled=false;}
   };
   bindReleaseImagePicker(form,imageInput,addImages);

   const updateDateReminder=()=>{
    const dateOnly=selectedPeriodType(form.elements.environment.value);
    form.querySelector('[data-date-reminder] strong').textContent=dateOnly?'說明日期（UTC+8）':'說明日期時間（UTC+8）';
    const slots=text=>form.elements.environment.value==='flow-uat-dm'?[]:descriptionDateSlots(text);
    const zh=slots(form.elements.messageZh.value),en=slots(form.elements.messageEn.value),count=Math.max(zh.length,en.length),panel=form.querySelector('[data-date-reminder]'),fields=form.querySelector('[data-description-dates]'),extension=usesLegacyExtensionDays(form),days=descriptionExtensionDays(form.elements.messageZh.value,form.elements.messageEn.value);panel.hidden=!count&&!extension;
    fields.innerHTML=(extension?'<label>延長天數 <input type="number" min="1" max="365" required data-extension-days aria-label="延長天數（同步中英文）" placeholder="請輸入實際天數" value="'+esc(days.zh&&days.zh===days.en?days.zh:'')+'"></label>':'')+Array.from({length:count},(_,index)=>{const slot=zh[index]||en[index],required=slot.newStyle?' required':'';return '<div class="release-date-slot"><span>'+esc(slot.label)+'</span><input type="date" data-description-date="'+index+'" aria-label="通知說明日期 '+(index+1)+'" title="預設採實際發行日期，空白才用預計日期；同步帶入中英文。" value="'+esc(zh[index]?.date||en[index]?.date||'')+'"'+required+'>'+(dateOnly?'':'<input type="time" step="60" data-description-time="'+index+'" aria-label="通知說明時間 '+(index+1)+'（UTC+8）" value="'+esc(zh[index]?.time||en[index]?.time||'')+'"'+required+'>')+'</div>';}).join('');
    const daysInput=fields.querySelector('[data-extension-days]');if(daysInput)daysInput.oninput=()=>{if(daysInput.value&&!daysInput.validity.valid)return;for(const [field,lang]of [['messageZh','zh'],['messageEn','en']])form.elements[field].value=fillExtensionDays(form.elements[field].value,daysInput.value,lang);resizeReleaseMessageFields(form);preview.close();};
    fields.querySelectorAll('[data-description-date],[data-description-time]').forEach(input=>input.oninput=()=>{
     const index=Number(input.dataset.descriptionDate??input.dataset.descriptionTime),date=fields.querySelector('[data-description-date="'+index+'"]').value,time=fields.querySelector('[data-description-time="'+index+'"]')?.value??null;
     for(const [field,lang] of [['messageZh','zh'],['messageEn','en']])form.elements[field].value=fillDescriptionDate(form.elements[field].value,index,date,lang,time);
     resizeReleaseMessageFields(form);preview.close();
    });
   };
   let previousDateGameId='',previousAutoReleaseDate='';
   let previousTemplate={titleZh:'',titleEn:'',messageZh:'',messageEn:''},previousTemplateType='';
   const applyTemplate=(force=false)=>{
    form.querySelector('.release-image-upload').hidden=omitImages();
    const selectedType=form.elements.environment.value,game=games.get(form.elements.gameId.value);const copy=selectedType==='flow-uat-dm'?composeTemplate(selectedType,game,templates):notificationTemplateDates(composeTemplate(selectedType,game,templates),selectedType==='first-pord-extension'?{}:(records[game?.id]||{})),fields=['titleZh','titleEn','messageZh','messageEn'];
    if(copy&&selectedPeriodType(selectedType)){for(const key of ['messageZh','messageEn'])copy[key]=periodDateText(copy[key]);}
    const selectedTypeInfo=notificationTypes.find(type=>type.id===selectedType),pord=isPordNotification({environment:selectedType,typeName:selectedTypeInfo?.name}),noReleaseDate=notificationHasNoReleaseDate({environment:selectedType,typeName:selectedTypeInfo?.name});
    if(form.elements.releaseAt){form.elements.releaseAt.required=!noReleaseDate;form.elements.releaseAt.disabled=noReleaseDate;form.querySelector('[data-release-date-label]').textContent=selectedType==='flow-uat-dm'?'正式環境預計上線日期（UTC+8）':(pord?'PROD ':'')+'上架時間（UTC+8）';if(noReleaseDate)form.elements.releaseAt.value='';}
    if(!noReleaseDate&&game&&form.elements.releaseAt){const record=records[game.id]||{},date=selectedType==='flow-uat-dm'?defaultNotificationDate({plannedReleaseDate:record.plannedReleaseDate}):defaultNotificationDate(record);if(previousDateGameId!==game.id||!form.elements.releaseAt.value||form.elements.releaseAt.value===previousAutoReleaseDate)form.elements.releaseAt.value=date;previousDateGameId=game.id;previousAutoReleaseDate=date;}
    for(const field of fields){const input=form.elements[field];if(force||!input.value||input.value===previousTemplate[field])input.value=copy?.[field]||'';}
    previousTemplate={titleZh:copy?.titleZh||'',titleEn:copy?.titleEn||'',messageZh:copy?.messageZh||'',messageEn:copy?.messageEn||''};previousTemplateType=selectedType;syncDmDate();resizeReleaseMessageFields(form);updateDateReminder();
    form.querySelector('[data-template-note]').textContent=copy?copy.note||'已依通知類型帶入中英文模板，內容可再編輯。':'此類型尚無預設模板，可自行填寫內容。';preview.close();
   };
   const syncDmDate=()=>{
    if(form.elements.environment.value!=='flow-uat-dm')return;
    const date=form.elements.releaseAt.value.replaceAll('-','/');
    for(const [field,pattern,placeholder] of [
     ['messageZh',/(📅 正式環境預計上線日期：)(?:〔日期〕|\d{4}\/\d{2}\/\d{2})/,'〔日期〕'],
     ['messageEn',/(📅 Expected PROD release date: )(?:〔Date〕|\d{4}\/\d{2}\/\d{2})/,'〔Date〕']
    ]){form.elements[field].value=form.elements[field].value.replace(pattern,(_,prefix)=>prefix+(date||placeholder));previousTemplate[field]=previousTemplate[field].replace(pattern,(_,prefix)=>prefix+(date||placeholder));}
   };
   form.elements.releaseAt.addEventListener('input',syncDmDate);
   const replaceTemplate=()=>{const edited=['titleZh','titleEn','messageZh','messageEn'].some(field=>form.elements[field].value&&form.elements[field].value!==previousTemplate[field]);if(edited&&!confirm('重新套用會取代目前已修改的中英文標題與說明，是否繼續？'))return false;applyTemplate(true);return true;};
   if(editorName&&!quotaLimited){
    const edit=document.createElement('button');
    edit.type='button';edit.textContent='編輯固定模板';
    form.querySelector('[data-apply-template]').after(edit);
    edit.onclick=()=>{
     const type=notificationTypes.find(row=>row.id===form.elements.environment.value);
     if(type)editFixedTemplate(db,type.id,type.name,templates,editorName,()=>{form.querySelector('[data-template-note]').textContent='固定模板已儲存。需要更新當次草稿時，請選「重新套用模板」。';});
    };
   }
   const autoTitle=()=>{applyTemplate();paintFlow();};
   form.querySelector('[data-apply-template]').onclick=replaceTemplate;


   const paintTypes=()=>{const select=form.elements.environment,previous=select.value,categories=[...new Set(notificationTypes.map(type=>type.category))];select.innerHTML=notificationTypes.length?categories.map(category=>'<optgroup label="'+esc(categoryLabel(category))+'">'+notificationTypes.filter(type=>type.category===category).map(type=>'<option value="'+esc(type.id)+'">'+esc(typeOptionLabel(type))+'</option>').join('')+'</optgroup>').join(''):'<option value="">請先新增通知類型</option>';if(notificationTypes.some(type=>type.id===previous))select.value=previous;
    const list=form.querySelector('[data-type-list]');
    const active=list.querySelector('details[open]')?.dataset.category;
    list.innerHTML=categories.map(category=>{
     const types=notificationTypes.filter(type=>type.category===category);
     const rows=types.map(type=>'<div class="release-type-row"><span>'+esc(type.name)+'</span><button type="button" data-remove-type="'+esc(type.id)+'" aria-label="刪除 '+esc(type.name)+'">刪除</button></div>').join('');
     return '<details class="release-type-group" name="release-type-tools" data-category="'+esc(category)+'"'+(category===active?' open':'')+'><summary>'+esc(categoryLabel(category))+'（'+types.length+'）</summary><div class="release-type-rows">'+rows+'</div></details>';
    }).join('');
    autoTitle();preview.close();};
   const saveTypeChange=async change=>{if(quotaLimited){errorBox.textContent=releaseErrorMessage({code:'resource-exhausted'});return}errorBox.textContent='';const controls=[...form.querySelectorAll('.release-type-manager button,.release-type-manager input,.release-type-manager select')];controls.forEach(control=>control.disabled=true);try{notificationTypes=await updateReleaseTypes(db,change);paintTypes();if(change.add){form.elements.newTypeName.value='';form.elements.newTypeEnglish.value='';form.elements.environment.value=change.add.id;autoTitle();}}catch(error){errorBox.textContent='類型更新失敗：'+(error.message||error)}finally{controls.forEach(control=>control.disabled=false)}};
   form.querySelector('[data-add-type]').onclick=()=>{const name=form.elements.newTypeName.value.trim();if(!name){errorBox.textContent='請輸入通知類型名稱';form.elements.newTypeName.focus();return}void saveTypeChange({add:{id:crypto.randomUUID(),category:form.elements.newTypeCategory.value,name,nameEn:form.elements.newTypeEnglish.value.trim()}});};
   form.querySelector('[data-type-list]').onclick=event=>{const remove=event.target.closest('[data-remove-type]');if(remove)void saveTypeChange({removeId:remove.dataset.removeType});};
   const gameLabel=game=>game.id+' · '+(game.mandarinName?game.mandarinName+' / ':'')+game.name;
   const allowedGames=()=>[...games.values()];
   let recipientGameId=null;
   const syncRecipients=gameId=>{if(gameId===recipientGameId)return;recipientGameId=gameId;const defaults=new Set(defaultReleaseGroupIds(gameId,records,selectableGroups));form.querySelectorAll('[name="groupId"]').forEach(input=>input.checked=defaults.has(input.value));form.querySelector('[data-recipient-hint]').textContent=!gameId?'選擇遊戲後，自動勾選該遊戲所屬群組，可再手動調整。':defaults.size?'已預設勾選 '+defaults.size+' 個接收群組，可手動調整；切換遊戲會重新帶入。':'此遊戲尚未設定所屬群組，請手動選擇接收群組。';};
   const platforms=(workspaceSnapshot.data()?.customers||state.customers||[]).filter(platform=>platform.id&&platform.groupId);
   const platformDialog=notificationDialog('releaseGameRecipientPlatforms');
   platformDialog.innerHTML='<section class="release-shell"><div class="release-head"><h2 data-platform-heading>選擇接收平台</h2><button type="button" data-done-platforms>完成</button></div><div class="release-recipients" data-exception-platforms></div></section>';
   const platformList=platformDialog.querySelector('[data-exception-platforms]');
   const selections=new Map();
   let platformGroupId='';
   const groupCheckbox=groupId=>Array.from(form.querySelectorAll('[name="groupId"]')).find(input=>input.value===groupId);
   platformDialog.querySelector('[data-done-platforms]').onclick=()=>platformDialog.close();
   function refreshPlatformButtons(){
    for(const button of form.querySelectorAll('[data-group-exceptions]')){
     const selection=selections.get(button.dataset.groupExceptions);
     button.textContent=selection?selection.size+' 個':'平台';
    }
   }
   function restoreRecipients(source){
    selections.clear();
    form.querySelectorAll('[name="groupId"]').forEach(input=>{
     input.checked=(source.groupIds||[]).includes(input.value);
     if(!input.checked||!source.recipientScope||source.recipientScope.shared.includes(input.value))return;
     const selected=new Set(Object.entries(source.recipientScope.targeted).filter(([,groupId])=>groupId===input.value).map(([id])=>id));
     if(selected.size)selections.set(input.value,selected);
     else input.checked=false;
    });
    refreshPlatformButtons();
   }
   const recipientList=form.querySelector('[data-recipient-list]');
   new MutationObserver(refreshPlatformButtons).observe(recipientList,{childList:true});
   recipientList.addEventListener('click',event=>{
    const button=event.target.closest('[data-group-exceptions]');
    if(!button)return;
    if(!form.elements.gameId.value){
     errorBox.textContent='請先選擇遊戲，再選擇接收平台。';
     return;
    }
    errorBox.textContent='';
    platformGroupId=button.dataset.groupExceptions;
    const group=selectableGroups.find(group=>group.id===platformGroupId);
    platformDialog.querySelector('[data-platform-heading]').textContent=group.name+' · 選擇接收平台';
    const selection=selections.get(platformGroupId);
    const groupSelected=groupCheckbox(platformGroupId).checked;
    const members=platforms.filter(platform=>platform.groupId===platformGroupId);
    platformList.innerHTML=members.map(platform=>{
     const name=platform.name||platform.id;
     const matched=members.filter(member=>member.name===platform.name).length>1;
     const domain=platform.domain||platform.website||platform.url||platform.id;
     const caption=matched&&domain!==name?name+' · '+domain:name;
     const checked=groupSelected&&(!selection||selection.has(platform.id));
     return '<label><input type="checkbox" data-platform-recipient value="'+esc(platform.id)+'"'+(checked?' checked':'')+'><span>'+esc(caption)+'</span></label>';
    }).join('')||'<small>這個群組沒有個別平台資料，可用群組勾選。</small>';
    platformDialog.showModal();
   });
   platformList.onchange=event=>{
    if(!event.target.matches('[data-platform-recipient]'))return;
    const inputs=Array.from(platformList.querySelectorAll('[data-platform-recipient]'));
    const selected=new Set(inputs.filter(input=>input.checked).map(input=>input.value));
    if(selected.size===inputs.length||!selected.size)selections.delete(platformGroupId);
    else selections.set(platformGroupId,selected);
    groupCheckbox(platformGroupId).checked=selected.size>0;
    refreshPlatformButtons();
    preview.close();
   };
   const resolveGame=()=>{const value=form.elements.gameSearch.value.trim(),allowed=allowedGames(),exact=allowed.find(game=>game.id===value||gameLabel(game)===value);if(exact)return exact;const names=allowed.filter(game=>[game.name,game.mandarinName].some(name=>name&&name.toLowerCase()===value.toLowerCase()));return names.length===1?names[0]:null;};
   const filteredGames=()=>{const selected=resolveGame();return selected?[selected]:filterReleaseGames([...games.values()],records,groups,'',form.elements.gameSearch.value);};
   const gameInput=form.elements.gameSearch,menu=form.querySelector('#releaseGameOptions'),combo=form.querySelector('[data-game-combo]');let optionGames=[],activeOption=-1;
   const closeGames=()=>{menu.hidden=true;gameInput.setAttribute('aria-expanded','false');gameInput.removeAttribute('aria-activedescendant');};
   const paintOptions=()=>{menu.innerHTML=optionGames.length?optionGames.map((game,index)=>'<button type="button" tabindex="-1" role="option" id="release-game-option-'+index+'" class="release-game-option'+(index===activeOption?' active':'')+(form.elements.gameId.value===game.id?' selected':'')+'" aria-selected="'+(form.elements.gameId.value===game.id)+'" data-game-option="'+index+'"><span class="release-game-id">'+esc(game.id)+'</span><span class="release-game-names"><strong>'+esc(game.mandarinName||game.name)+'</strong><small>'+esc(game.mandarinName?game.name:game.version||'')+'</small></span><span class="release-game-check">'+(form.elements.gameId.value===game.id?'✓':'')+'</span></button>').join(''):'<div class="release-game-empty">沒有符合條件的遊戲，請調整搜尋文字。</div>';if(activeOption>=0)gameInput.setAttribute('aria-activedescendant','release-game-option-'+activeOption);else gameInput.removeAttribute('aria-activedescendant');};
   const openGames=()=>{optionGames=resolveGame()?allowedGames():filteredGames();activeOption=optionGames.findIndex(game=>game.id===form.elements.gameId.value);paintOptions();menu.hidden=false;gameInput.setAttribute('aria-expanded','true');};
   const progress=dialog.querySelector('[data-release-flow]');
   let flowGame=null,request=0,manualEdit=0;
   form.addEventListener('input',event=>{if(event.target!==gameInput)manualEdit++});
   let flowHistory=null,typeChosen=false,loadingFlow=false,flowFailed=false;
   const paintFlow=()=>{
    const id=form.elements.environment.value,{sent}=releaseFlow(flowHistory||[]);
    const steps=selectedPeriodType(id)?['selected-uat','selected-pord',...(id==='first-pord-extension'||sent.has('first-pord-extension')?['first-pord-extension']:[])]:(['flow-uat-no-dm','flow-uat-dm'].includes(id)||(id==='flow-pord'&&(sent.has('flow-uat-dm')||sent.has('flow-uat-no-dm'))))?['flow-uat-no-dm','flow-uat-dm','flow-pord']:['flow-uat','flow-pord','other-uat','other-pord','combined'].includes(id)?['flow-uat','flow-pord']:id?[id]:[];
     const names={'flow-uat':'UAT','flow-pord':'PROD','flow-uat-no-dm':'UAT（無 DM）','flow-uat-dm':'UAT（補 DM）','selected-uat':'UAT 特選','selected-pord':'PROD 特選','first-pord-extension':'PROD 特選延長'};
    progress.innerHTML=steps.map(step=>{
     const name=names[step]||notificationTypes.find(type=>type.id===step)?.name||step;
     const status=flowHistory?(sent.has(step)?' · 已發送':' · 待發送'):'';
     return '<span class="release-flow-step'+(sent.has(step)?' sent':'')+'">'+esc(name)+status+'</span>';
    }).join(' → ');
    const note=loadingFlow?'讀取發送紀錄中…':flowFailed?'無法讀取發送紀錄。':!flowGame?'選擇遊戲後顯示發送狀態。':steps.some(step=>['flow-pord','selected-pord'].includes(step))?'PROD 不放宣傳圖，沿用 UAT 的遊戲素材入口。':'';
    if(note)progress.insertAdjacentHTML('beforeend','<small class="release-flow-note">'+note+'</small>');

   };
   paintTypes();
   const syncFlow=async gameId=>{
    if(gameId===flowGame)return;
    flowGame=gameId;flowHistory=null;
    const ticket=++request,edit=manualEdit;
    loadingFlow=Boolean(gameId);flowFailed=false;paintFlow();
    if(!gameId)return;
    try{
     const result=await getDocs(query(collection(db,RELEASE_COLLECTION),where('game.id','==',gameId)));
     if(ticket!==request||!progress.isConnected)return;
     loadingFlow=false;flowHistory=result.docs.map(row=>row.data());
     const {steps,sent}=releaseFlow(flowHistory);
     const next=steps.find(id=>!sent.has(id));
     if(!typeChosen&&!existing&&!prefill&&next&&manualEdit===edit&&notificationTypes.some(type=>type.id===next)){
      form.elements.environment.value=next;
      applyTemplate(true);
     }
     paintFlow();
    }catch{
     if(ticket===request){loadingFlow=false;flowFailed=true;paintFlow();}
    }
   };
   const redrawGames=()=>{const selected=resolveGame(),visible=filteredGames();form.elements.gameId.value=selected?.id||'';if(recipientGameId!==form.elements.gameId.value){selections.clear();refreshPlatformButtons();}syncRecipients(form.elements.gameId.value);void syncFlow(form.elements.gameId.value);gameInput.setCustomValidity(gameInput.value&&!selected?'請輸入完整遊戲名稱、Game ID，或從下拉結果選擇遊戲':'');if(selected)autoTitle();form.querySelector('[data-game-count]').textContent='可選 '+allowedGames().length+' 款遊戲';preview.close();};
   const chooseGame=index=>{const game=optionGames[index];if(!game)return;gameInput.value=gameLabel(game);redrawGames();closeGames();gameInput.focus();closeGames();};
   menu.addEventListener('mousedown',event=>event.preventDefault());menu.addEventListener('click',event=>{const option=event.target.closest('[data-game-option]');if(option)chooseGame(Number(option.dataset.gameOption));});
   form.querySelector('[data-game-toggle]').onclick=()=>{if(menu.hidden){gameInput.focus();openGames();}else closeGames();};
   gameInput.onfocus=openGames;gameInput.oninput=()=>{redrawGames();openGames();activeOption=-1;paintOptions();};gameInput.onchange=redrawGames;
   gameInput.onblur=event=>{if(!combo.contains(event.relatedTarget))closeGames();};
   gameInput.onkeydown=event=>{if(event.isComposing)return;if(event.key==='Escape'){event.preventDefault();closeGames();return;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(menu.hidden)openGames();if(optionGames.length){activeOption=activeOption<0?(event.key==='ArrowDown'?0:optionGames.length-1):(activeOption+(event.key==='ArrowDown'?1:-1)+optionGames.length)%optionGames.length;paintOptions();menu.querySelector('#release-game-option-'+activeOption)?.scrollIntoView({block:'nearest'});}return;}if(event.key==='Enter'&&!menu.hidden){event.preventDefault();if(activeOption>=0)chooseGame(activeOption);else if(optionGames.length===1)chooseGame(0);return;}if(event.key==='Tab')closeGames();};
   dialog.onclick=event=>{if(!combo.contains(event.target))closeGames();};
   if(typeof ResizeObserver!=='undefined'){let messageWidth=0;const observer=new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width!==messageWidth){messageWidth=width;resizeReleaseMessageFields(form);}});observer.observe(form.querySelector('.release-message-pair'));dialog.addEventListener('close',()=>observer.disconnect(),{once:true});}
   resizeReleaseMessageFields(form);
   form.elements.environment.onchange=()=>{const previous=previousTemplateType;if(!replaceTemplate()){form.elements.environment.value=previous;return}typeChosen=true;autoTitle();};redrawGames();
   form.querySelector('[data-cancel]').onclick=()=>dialog.close();form.querySelector('[data-select-all]').onclick=()=>{const checkboxes=[...form.querySelectorAll('[name="groupId"]')],checked=!checkboxes.every(input=>input.checked);selections.clear();checkboxes.forEach(input=>input.checked=checked);refreshPlatformButtons();preview.close();};
   if(existing){
    const savedVariant=existing.templateVariant||(/revised release schedule/i.test(existing.messageEn||'')?'rescheduled':/game materials|遊戲資料預計/i.test((existing.messageEn||'')+(existing.messageZh||''))?'no-dm':'standard');const promoted=savedVariant==='rescheduled'&&existing.environment==='schedule-change'?'schedule-updated':savedVariant==='combined'&&existing.environment==='flow-pord'?'combined':savedVariant==='no-dm'&&['flow-uat','other-uat','selected-uat'].includes(existing.environment)?'flow-uat-no-dm':'';
    form.elements.environment.value=notificationTypes.some(type=>type.id===promoted)?promoted:existing.environment;form.elements.gameSearch.value=gameLabel(games.get(existing.game.id));redrawGames();
    form.elements.titleZh.value=existing.titleZh||existing.title||'';form.elements.titleEn.value=existing.titleEn||releaseTemplate(existing.environment,games.get(existing.game.id))?.titleEn||'';form.elements.releaseAt.value=notificationHasNoReleaseDate(existing)||!existing.releaseAt?'':new Date(new Date(existing.releaseAt).getTime()+8*3600000).toISOString().slice(0,10);
    form.elements.messageZh.value=existing.messageZh??existing.message??'';form.elements.messageEn.value=existing.messageEn||'';
    if(selectedPeriodType(form.elements.environment.value)){for(const key of ['messageZh','messageEn'])form.elements[key].value=periodDateText(form.elements[key].value);}
    restoreRecipients(existing);
    form.querySelector('[data-recipient-hint]').textContent='已帶入原通知的接收群組；儲存後會同步更新新增、保留與移除的群組。';
    draftImages=await Promise.all((existing.images||[]).map(async image=>{if(quotaLimited)return {...image,data:''};try{return {...image,data:await readReleaseImage(db,existing.id,image.id)}}catch{return {...image,data:''}}}));renderDrafts();resizeReleaseMessageFields(form);
   }
   if(prefill){
    let target=notificationTypes.find(type=>type.id===prefill.transition.typeId)||notificationTypes.find(type=>type.name.replace(/\s/g,'')===String(prefill.transition.targetName||'').replace(/\s/g,''));
    if(!target)throw new Error('找不到對應的通知類型，請先在管理類型新增：'+(prefill.transition.targetName||prefill.transition.label));
    if(!games.has(prefill.game.id))throw new Error('此遊戲已不存在，無法帶入新通知');
    form.elements.environment.value=target.id;form.elements.gameSearch.value=gameLabel(games.get(prefill.game.id));redrawGames();applyTemplate(true);
    restoreRecipients(prefill);
   }
   updateDateReminder();form.addEventListener('input',event=>{resizeReleaseMessageFields(form);if(!event.target.matches('[data-description-date],[data-description-time],[data-extension-days]'))updateDateReminder();preview.close();});form.addEventListener('change',()=>preview.close());
   form.querySelector('[type="submit"]').disabled=false;
   form.onsubmit=event=>{event.preventDefault();errorBox.textContent='';try{syncDmDate();validateDescriptionDates(form.elements.messageZh.value,form.elements.messageEn.value,selectedPeriodType(form.elements.environment.value));if(usesLegacyExtensionDays(form)){const days=descriptionExtensionDays(form.elements.messageZh.value,form.elements.messageEn.value);if(!days.zh||days.zh!==days.en)throw new Error('請填寫延長天數，並確認中英文天數一致');}if(imageBusy)throw new Error('圖片處理中，請稍候');if(!filteredGames().some(game=>game.id===form.elements.gameId.value))throw new Error('請輸入或選擇有效的遊戲');if(loadingFlow)throw new Error('正在讀取通知流程，請稍候再預覽');const images=omitImages()?[]:draftImages;const notification=buildReleaseNotification({images,environment:form.elements.environment.value,titleZh:form.elements.titleZh.value,titleEn:form.elements.titleEn.value,messageZh:form.elements.messageZh.value,messageEn:form.elements.messageEn.value,releaseAt:form.elements.releaseAt.value?form.elements.releaseAt.value+'T00:00:00+08:00':'',groupIds:[...(supportGroup?[supportGroup.id]:[]),...Array.from(form.querySelectorAll('[name="groupId"]:checked'),input=>input.value)]},{uid:getAuth().currentUser?.uid,name:session.name||session.username,game:games.get(form.elements.gameId.value),groups,types:notificationTypes,id:existing?.id||crypto.randomUUID()});const scope={shared:[],targeted:{}};
    for(const groupId of notification.groupIds){
     const selected=selections.get(groupId);
     if(selected)for(const id of selected)scope.targeted[id]=groupId;
     else scope.shared.push(groupId);
    }
    if(Object.keys(scope.targeted).length)notification.recipientScope=scope;
    const recipients=platforms.filter(platform=>scope.shared.includes(platform.groupId)||scope.targeted[platform.id]===platform.groupId);
    const scopeMarkup=recipients.length?'<div class="release-small"><strong>本次接收平台</strong> '+recipients.map(platform=>esc(platform.name||platform.id)).join('、')+'</div>':'';
    notification.templateVariant=({'flow-uat-no-dm':'no-dm','combined':'combined','schedule-updated':'rescheduled'})[notification.environment]||'standard';preview.innerHTML='<section class="release-shell"><div class="release-head"><h2 id="releasePreviewTitle">通知預覽</h2><button type="button" data-back autofocus>返回編輯</button></div><div class="release-preview"><span class="release-tag '+notification.environment+'">'+esc(notification.typeName||ENVIRONMENTS[notification.environment]?.zh||notification.environment)+'</span>'+notificationTitleMarkup(notification,true)+notificationGameMarkup(notification,true)+notificationReleaseTimeMarkup(notification)+bilingualMessageMarkup(notification)+'<div class="release-image-grid">'+images.map(image=>'<figure class="release-image"><img src="'+esc(image.data)+'" alt="'+esc(image.name)+'"></figure>').join('')+'</div>'+recipientGroupsMarkup(notification,true)+scopeMarkup+'<button type="button" class="release-publish" data-publish>'+(existing?'儲存修改並同步群組':'確認發布通知')+'</button><div class="release-error" role="alert"></div></div></section>';preview.querySelector('[data-back]').onclick=()=>preview.close();preview.oncancel=null;bindGameLinks(preview,null);preview.querySelector('[data-publish]').disabled=quotaLimited;preview.querySelector('[data-publish]').onclick=async()=>{if(quotaLimited){errorBox.textContent=releaseErrorMessage({code:'resource-exhausted'});return}const buttons=[...preview.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);preview.oncancel=e=>e.preventDefault();const publishError=preview.querySelector('[role=alert]');publishError.textContent='';try{await uploadReleaseImages(db,notification.id,images.filter(image=>image.data));if(existing)await editReleaseNotification(db,notification,existing.updatedAt||existing.createdAt);else await publishReleaseNotification(db,notification);preview.close();dialog.close();parent.close();openList();}catch(error){publishError.textContent='發布失敗：'+releaseErrorMessage(error);}finally{buttons.forEach(button=>button.disabled=false);preview.oncancel=null;}};preview.showModal();}catch(error){errorBox.textContent=error.message||String(error);}};
  }catch(error){dialog.querySelector('[data-content]').innerHTML='<div class="release-error" role="alert">'+esc(releaseErrorMessage(error))+'</div><button type="button" data-retry-compose>重新載入表單</button>';dialog.querySelector('[data-retry-compose]').onclick=()=>{dialog.close();compose(parent,existing,prefill);};}
 }
 button.onclick=openList;paintBell();
 const ref=admin?query(collection(db,RELEASE_COLLECTION),orderBy('createdAt','desc'),limit(NOTIFICATION_LIMIT)):doc(db,'omniplay-group-views',groupId);
 const feeds=[ref];
 if(!admin&&session.platformId)feeds.push(doc(db,'omniplay-group-views',groupId,'release-platform-feeds',session.platformId));
 const inboxes=feeds.map(()=>[]),failures=feeds.map(()=>''),ready=new Set();
 function updateInbox(index,contents,failure=''){
  inboxes[index]=contents;failures[index]=failure;ready.add(index);
  loaded=ready.size===feeds.length;
  error=failures.filter(Boolean).join(' / ');
  items=[...new Map(inboxes.flat().map(item=>[item.id,item])).values()];
  paintBell();
  const dialog=document.getElementById('releaseNotificationList');
  if(dialog?.open)renderList(dialog);
 }
 const subscriptions=feeds.map((feed,index)=>onSnapshot(feed,snapshot=>{
  updateInbox(index,admin?snapshot.docs.map(item=>item.data()):snapshot.data()?.releaseNotifications||[]);
 },failure=>updateInbox(index,[],label('通知載入失敗，請重新整理後再試：','Unable to load notifications. Refresh and try again: ')+releaseErrorMessage(failure))));
 if(admin)migrateReleaseNotifications(db).catch(failure=>{console.warn('Legacy notification migration deferred',failure.code||failure.message);});
 window.addEventListener('storage',event=>{if(event.key!==readKey)return;try{read=new Set(JSON.parse(event.newValue||'[]'));paintBell();const dialog=document.getElementById('releaseNotificationList');if(dialog?.open)renderList(dialog);}catch{}});
 const observer=new MutationObserver(()=>{paintBell();const dialog=document.getElementById('releaseNotificationList');if(dialog?.open)openList();});observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('pagehide',()=>{subscriptions.forEach(unsubscribe=>unsubscribe());observer.disconnect();},{once:true});
}
