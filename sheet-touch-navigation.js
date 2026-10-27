/* Touch browsing for the Univer 0.10.10 canvas: keep gestures out of cell editing. */
(()=>{
 window.installOmniplaySheetTouchNavigation=(api,container)=>{
  if(!container||container.dataset.sheetTouchInstalled)return()=>{};
  container.dataset.sheetTouchInstalled='true';
  const media=matchMedia('(max-width:800px), (any-pointer:coarse)'),originalHeight=container.style.height;
  const shell=document.createElement('div'),bar=document.createElement('div'),label=document.createElement('span'),toggle=document.createElement('button');
  shell.className='sheet-touch-shell';shell.style.height=originalHeight||'100%';bar.className='sheet-touch-bar';bar.setAttribute('role','toolbar');bar.setAttribute('data-viewer-control','true');
  const anchor=document.createComment('sheet-touch-position');container.before(anchor,shell);shell.append(bar,container);bar.append(label);
  let editing=false,gesture=null,raf=0,pendingX=0,pendingY=0,disposed=false;
  const en=()=>localStorage.getItem('omniplay-customer-language')==='en';
  const browsing=()=>media.matches&&!editing;
  const cancelPan=()=>{gesture=null;pendingX=0;pendingY=0;if(raf)cancelAnimationFrame(raf);raf=0;};
  const scroll=(offsetX,offsetY)=>{
   if(disposed||!media.matches)return;
   try{Promise.resolve(api.executeCommand('sheet.command.set-scroll-relative',{offsetX,offsetY})).catch(()=>{label.textContent=en()?'Scroll unavailable':'捲動暫時無法使用';});}catch{label.textContent=en()?'Scroll unavailable':'捲動暫時無法使用';}
  };
  const flush=()=>{raf=0;const x=pendingX,y=pendingY;pendingX=0;pendingY=0;if(x||y)scroll(x,y);};
  const queue=(x,y)=>{pendingX+=x;pendingY+=y;if(!raf)raf=requestAnimationFrame(flush);};
  const blurEditor=()=>{const active=document.activeElement;if(container.contains(active)&&active?.matches?.('input,textarea,[contenteditable="true"]'))active.blur();};
  const render=()=>{
   bar.hidden=!media.matches;container.classList.toggle('sheet-touch-browse',browsing());
   shell.classList.toggle('sheet-touch-mobile',media.matches);container.style.height=media.matches?'calc(100% - 42px)':'100%';
   label.textContent=en()?(editing?'Editing':'Swipe to browse'):(editing?'編輯中':'滑動瀏覽');
   toggle.hidden=!window.__omniplayCanEdit;toggle.textContent=en()?(editing?'Done':'Edit'):(editing?'完成編輯':'編輯');toggle.setAttribute('aria-pressed',String(editing));
   bar.setAttribute('aria-label',en()?'Sheet touch controls':'試算表觸控操作');
   if(browsing())blurEditor();
  };
  for(const [zh,english,text,x,y]of [['向左捲動','Scroll left','←',-180,0],['向上捲動','Scroll up','↑',0,-220],['向下捲動','Scroll down','↓',0,220],['向右捲動','Scroll right','→',180,0]]){
   const button=document.createElement('button');button.type='button';button.textContent=text;button.title=en()?english:zh;button.setAttribute('aria-label',button.title);button.onclick=()=>scroll(x,y);bar.append(button);
  }
  toggle.type='button';toggle.className='sheet-touch-edit';toggle.onclick=()=>{if(!window.__omniplayCanEdit)return;cancelPan();editing=!editing;render();};bar.append(toggle);
  const stop=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
  const down=e=>{
   if(!browsing()||!['touch','pen'].includes(e.pointerType))return;
   stop(e);blurEditor();
   if(gesture)return;
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
   try{container.setPointerCapture(e.pointerId);}catch{}
  };
  const move=e=>{
   if(!browsing()||!gesture||gesture.id!==e.pointerId)return;
   stop(e);queue(gesture.x-e.clientX,gesture.y-e.clientY);gesture.x=e.clientX;gesture.y=e.clientY;
  };
  const up=e=>{
   if(!browsing()||!gesture||gesture.id!==e.pointerId)return;
   stop(e);gesture=null;try{container.releasePointerCapture(e.pointerId);}catch{}
  };
  const block=e=>{if(browsing())stop(e);};
  const focus=()=>{if(browsing())blurEditor();};
  const changed=()=>{cancelPan();editing=false;render();};
  const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['click',block],['dblclick',block],['contextmenu',block],['touchstart',block],['focusin',focus]];
  for(const [type,handler]of listeners)container.addEventListener(type,handler,{capture:true,passive:false});
  media.addEventListener('change',changed);
  if(!document.getElementById('sheetTouchStyle')){
   const style=document.createElement('style');style.id='sheetTouchStyle';style.textContent=`
    .sheet-touch-shell{position:relative;width:100%;height:100%;min-width:0;min-height:0}
    .sheet-touch-bar{height:42px;display:flex;align-items:center;gap:5px;padding:5px 9px;border-bottom:1px solid #d8e3f0;background:#f3f7fd;color:#3e5979;box-sizing:border-box;overflow:hidden}
    .sheet-touch-bar[hidden]{display:none!important}
    .sheet-touch-bar>span{flex:1;min-width:0;white-space:nowrap;font:600 12px/1.3 system-ui,sans-serif}
    .sheet-touch-bar button{flex:0 0 auto;min-width:30px;height:30px;min-height:30px;padding:4px 7px;border:1px solid #c8d7ea;border-radius:7px;background:#fff;color:#345c8b;cursor:pointer;font:600 13px/1.3 system-ui,sans-serif}
    .sheet-touch-bar .sheet-touch-edit{margin-left:3px;padding:4px 10px;background:#e7f0ff;border-color:#b4cbed;white-space:nowrap}
    .sheet-touch-bar .sheet-touch-edit[aria-pressed=true]{background:#326fd6;color:#fff;border-color:#326fd6}
    .viewer-mode .sheet-touch-bar button{pointer-events:auto!important;opacity:1}
    .sheet-touch-bar button:focus-visible{outline:2px solid #7ca9ec;outline-offset:2px}
    .sheet-touch-browse,.sheet-touch-browse canvas{touch-action:pinch-zoom!important;-webkit-user-select:none;user-select:none}
    .sheet-workspace:has(.sheet-touch-mobile)>.game-list-native-status{top:47px;right:8px}
   `;document.head.append(style);
  }
  render();
  return()=>{
   disposed=true;cancelPan();media.removeEventListener('change',changed);
   for(const [type,handler]of listeners)container.removeEventListener(type,handler,true);
   container.classList.remove('sheet-touch-browse');delete container.dataset.sheetTouchInstalled;container.style.height=originalHeight;
   if(anchor.isConnected){anchor.replaceWith(container);shell.remove();}else shell.remove();
  };
 };
})();
