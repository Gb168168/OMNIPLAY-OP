const SOURCE='https://docs.jigaming777.com/';
export async function loadDocumentSnapshot(){const response=await fetch(new URL('./api-docs/snapshot.json?hour='+Math.floor(Date.now()/3600000),import.meta.url),{cache:'no-cache'});if(!response.ok)throw Error('Reading copy unavailable');const value=await response.json();if(value.version!==1||!value.pages)throw Error('Invalid reading copy');return value;}
const targetCache=new WeakMap();
export function documentNoteTargets(page){
 if(targetCache.has(page))return targetCache.get(page);
 const fields=[],rows={},names=new Set();let scope='other';
 const add=field=>{if(!names.has(field.name)){fields.push(field);names.add(field.name);}return field;};
 for(const [blockIndex,block] of (page.blocks||[]).entries()){
  if(block.kind==='heading'){
   if(/請求參數|请求参数|Request Parameters|Input Parameters/i.test(block.text))scope='request';
   else if(/返回參數|返回参数|回應參數|响应参数|Response Parameters|Return Parameters/i.test(block.text))scope='response';
   else if(block.level<=2)scope='other';
  }
  if(block.kind!=='table')continue;let previous=null;rows[blockIndex]={};
  for(const [index,row] of block.rows.entries()){
   if(index===0)continue;
   const raw=(page.fields||[]).find(field=>field.name===row[0]?.text&&field.type===row[1]?.text)||(/^[A-Za-z][\w.\[\]-]{0,79}$/.test(row[0]?.text||'')&&/^(String|Integer|Double|Float|Long|Boolean|DateTime|UnixTime|Decimal|Number|Array|Object|Int)/i.test(row[1]?.text||'')?{name:row[0].text,type:row[1].text}:null);
   if(raw){const field={...raw,description:row[row.length-1]?.text||'',required:row.length>=4?row[2].text:'',parameter:raw.name,scope,name:scope==='other'?raw.name:scope+'.'+raw.name};previous=field;rows[blockIndex][index]=add(field);continue;}
   if(!previous)continue;
   const text=row.map(cell=>cell.text).filter(Boolean).join(' ').trim();if(!text)continue;
   if(/^(status|code|errorCode|error_code|statusCode|status_code|err_code)$/i.test(previous.parameter)){
    const match=text.match(/^(\d{4,6})(?:\s|$)/);
    if(match){const code=match[1],parameter=previous.parameter+'.'+code,name=previous.scope==='other'?parameter:previous.scope+'.'+parameter,target={name,parameter,scope:previous.scope,type:previous.type,required:'',description:text,label:text,parent:previous.parameter,code,descriptionOnly:true};rows[blockIndex][index]=add(target);continue;}
   }
   if(!row[0]?.text)rows[blockIndex][index]={...previous,descriptionOnly:true};
  }
 }
 const result={fields,rows};targetCache.set(page,result);return result;
}
export function mountDocumentCopy(host,{snapshot,language='zh',onAction,onField,noteCount=()=>0}){
 const en=language==='en',t=(zh,english)=>en?english:zh,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!document.querySelector('#apiDocumentCopyStyle')){const style=document.createElement('style');style.id='apiDocumentCopyStyle';style.textContent=`
.api-doc-native{height:100%;min-height:0;overflow:hidden;--doc-scale:1;display:grid;grid-template-columns:calc(205px * var(--doc-scale)) minmax(0,1fr);font-family:Arial,"Noto Sans TC",sans-serif;background:#fff;color:#18212d}.api-copy-nav{overflow:auto;border-right:1px solid #e8ebf0;padding:calc(20px * var(--doc-scale)) calc(12px * var(--doc-scale));font-size:calc(13px * var(--doc-scale));line-height:1.5}.api-copy-nav strong{display:block;font-size:calc(12px * var(--doc-scale));color:#718096;margin-bottom:12px}.api-copy-nav button{display:block;width:100%;text-align:left;border:0!important;background:transparent;padding:calc(9px * var(--doc-scale))!important;font-size:inherit!important;line-height:1.5;color:#687689;white-space:normal}.api-copy-nav button[aria-current=page]{color:#175baf;background:#e6f0ff;border-radius:5px;font-weight:600}.api-copy-main{overflow:auto;padding:calc(26px * var(--doc-scale)) calc(34px * var(--doc-scale));font-size:calc(16px * var(--doc-scale));line-height:1.8;min-width:0;scroll-behavior:auto}.api-copy-main h1{font-size:calc(32px * var(--doc-scale));line-height:1.4;margin:0 0 30px;font-weight:700;color:#142132}.api-copy-main h2{font-size:calc(24px * var(--doc-scale));margin:32px 0 16px;border-bottom:1px solid #e6ebf1;padding-bottom:8px;color:#172435}.api-copy-main h3{font-size:calc(20px * var(--doc-scale));margin:24px 0 12px}.api-copy-main p{margin:14px 0}.api-copy-main ul,.api-copy-main ol{padding-left:22px;margin:14px 0}.api-copy-main li{margin:8px 0}.api-copy-table-scroll{overflow:auto;margin:20px 0}.api-copy-main table{border-collapse:collapse;width:100%;font-size:calc(14px * var(--doc-scale));text-align:left!important}.api-copy-main th,.api-copy-main td{border:1px solid #d0d8e3!important;padding:calc(10px * var(--doc-scale)) calc(12px * var(--doc-scale))!important;text-align:left!important;line-height:1.6;white-space:pre-line}.api-copy-main th{background:#f7f9fc;color:#3c506b}.api-copy-main tbody tr:nth-child(even) td{background:#f5f6f8}.api-copy-main tr[data-api-parameter]{cursor:pointer}.api-copy-main tr[data-api-parameter]:hover td{background:#edf5ff}.api-copy-param{font:inherit!important;color:#235eac!important;border:0!important;background:none!important;padding:0!important;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:4px;white-space:nowrap}.api-copy-note-badge{display:inline-block;float:right;margin:2px 0 2px 10px;padding:2px 8px;border:1px solid #f2a6a6;border-radius:5px;background:#ffe5e5;color:#ad161e;font-size:calc(13px * var(--doc-scale));line-height:1.5;font-weight:700;white-space:nowrap;vertical-align:middle}.api-copy-description{white-space:normal!important;text-align:left!important;line-height:1.6!important}.api-copy-main pre{white-space:pre;overflow:auto;padding:18px;border-radius:8px;background:#f4f6f9;font-size:calc(13px * var(--doc-scale));line-height:1.7}.api-copy-sync{font-size:11px;line-height:1.5;color:#8090a6;padding:8px 12px;border-bottom:1px solid #edf1f6;flex:none}.api-doc-original>p.api-copy-sync{display:block!important}.api-copy-sync[data-warning=true]{color:#9b670d;background:#fff9ec}.api-copy-warning{color:#965e10;background:#fff8e9;border:1px solid #f0dfbb;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.6}.api-copy-review{font-size:12px;line-height:1.6;background:#fff8e9;border:1px solid #eedbb5;color:#8a621d;border-radius:8px;padding:10px 12px;flex:none}.api-copy-review[hidden]{display:none}@media(max-width:650px){.api-doc-native{grid-template-columns:1fr}.api-copy-nav{display:none}.api-copy-main{padding:18px;font-size:calc(16px * var(--doc-scale))}}
`;document.head.append(style);}
 host.className='api-doc-native';
 const pageList=()=>Object.entries(snapshot.pages).filter(([key])=>key.startsWith(language+':')).sort(([a],[b])=>a.endsWith(':revision')?-1:b.endsWith(':revision')?1:Number(a.split(':')[1])-Number(b.split(':')[1]));let pages=pageList(),renderedAction='',renderedHash='';
 const nav=document.createElement('nav'),main=document.createElement('article');nav.className='api-copy-nav';nav.setAttribute('aria-label',t('API 文件導覽','API Documentation Navigation'));main.className='api-copy-main';host.replaceChildren(nav,main);
 const stamp=()=>new Date(snapshot.lastChecked).toLocaleString(en?'en-GB':'zh-TW',{timeZone:'Asia/Taipei',hour12:false});
 function show(action){
  const page=snapshot.pages[language+':'+action];if(!page)return null;
  if(renderedAction===action&&renderedHash===page.hash)return page;const previousScroll=renderedAction===action?main.scrollTop:0;renderedAction=action;renderedHash=page.hash;
  nav.innerHTML='<strong>'+t('API 文件','API Documentation')+'</strong>'+pages.map(([key,item])=>'<button type="button" data-copy-action="'+esc(key.split(':')[1])+'"'+(key===language+':'+action?' aria-current="page"':'')+'>'+esc(item.title)+'</button>').join('');
  main.replaceChildren();const targets=documentNoteTargets(page);
  for(const [blockIndex,block] of page.blocks.entries()){let element;
   if(block.kind==='heading'){element=document.createElement('h'+Math.max(1,Math.min(4,Number(block.level)||2)));element.textContent=block.text;}
   else if(block.kind==='paragraph'){element=document.createElement('p');element.textContent=block.text;}
   else if(block.kind==='list'){element=document.createElement(block.ordered?'ol':'ul');for(const text of block.items){const li=document.createElement('li');li.textContent=text;element.append(li);}}
   else if(block.kind==='code'){element=document.createElement('pre');element.textContent=block.text;}
   else if(block.kind==='table'){
    element=document.createElement('div');element.className='api-copy-table-scroll';const table=document.createElement('table'),tbody=document.createElement('tbody');
    for(const [index,row] of block.rows.entries()){const tr=document.createElement('tr');const field=targets.rows[blockIndex]?.[index]||null;
     if(field){tr.dataset.apiParameter=field.name;tr.setAttribute('title',t('點擊查看附加說明','Click for additional notes'));}
     for(const [cellIndex,cell] of row.entries()){const td=document.createElement(cell.header?'th':'td');td.colSpan=Math.max(1,Math.min(64,cell.colspan||1));td.rowSpan=Math.max(1,Math.min(64,cell.rowspan||1));if(field&&cell.text&&((!field.descriptionOnly&&cellIndex===0)||cellIndex===row.length-1)){const button=document.createElement('button');button.type='button';button.className='api-copy-param'+(cellIndex===row.length-1?' api-copy-description':'');button.textContent=cell.text;button.setAttribute('aria-label',(cellIndex===row.length-1?t('說明：','Description: '):'')+cell.text+' '+t('附加說明','Additional Notes'));td.append(button);}else td.textContent=cell.text;tr.append(td);}
     if(field&&noteCount(field)>0){const cell=tr.children[tr.children.length-1],badge=document.createElement('span');badge.className='api-copy-note-badge';badge.textContent=t('說明','Note');badge.title=String(noteCount(field))+t(' 則附加說明',' additional notes');cell.append(badge);tr.dataset.hasNotes='true';}tbody.append(tr);
    }
    table.append(tbody);element.append(table);
   }
   if(element)main.append(element);
  }
  main.scrollTop=previousScroll;main.onclick=event=>{const row=event.target.closest('[data-api-parameter]');if(!row)return;const field=targets.fields.find(field=>field.name===row.dataset.apiParameter);if(field)onField(field,event.target.closest('button')||row.querySelector('button'));};
  return page;
 }
 nav.onclick=event=>{const button=event.target.closest('[data-copy-action]');if(button)onAction(button.dataset.copyAction);};
 return{show,setZoom:value=>host.style.setProperty('--doc-scale',String(value/100)),get stamp(){return stamp();},updateSnapshot:next=>{snapshot=next;pages=pageList();},getFields:action=>documentNoteTargets(snapshot.pages[language+':'+action]||{}).fields,getPage:action=>snapshot.pages[language+':'+action]};
}

