(()=>{
 const sidebar=document.querySelector('.sidebar'),list=document.getElementById('categoryList');if(!sidebar||!list)return;
 const media=matchMedia('(max-width:1200px), (hover:none) and (pointer:coarse)'),anchors=new Map();let panel=null,toggle=null,queued=false;
 function close(){if(!panel)return;panel.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false');}
 function sync(){queued=false;
  for(const [node,anchor]of anchors)if(!node.isConnected){anchor.remove();anchors.delete(node);}
  if(media.matches){
   sidebar.classList.add('compact-navigation');
   if(!panel){panel=document.createElement('nav');panel.id='compactWorkspaceMenu';panel.className='compact-workspace-menu';panel.setAttribute('aria-label','Workspace navigation');toggle=document.createElement('button');toggle.type='button';toggle.className='workspace-menu-toggle';toggle.textContent='☰';toggle.setAttribute('aria-label','Workspace menu');toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>{const open=panel.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));};sidebar.prepend(toggle);sidebar.append(panel);
    panel.addEventListener('click',event=>{if(event.target.closest('.page-link,.customer-section,#customerBtn,#platformViewBtn,#addCategoryBtn,.mini,.page-rename,.platform-custom-category button'))close();});
   }
   for(const node of [document.getElementById('addCategoryBtn'),document.getElementById('customerBtn'),list,document.getElementById('resourceNavigation')])if(node&&node.parentElement!==panel){if(!anchors.has(node)){const anchor=document.createComment('navigation position');node.before(anchor);anchors.set(node,anchor);}panel.append(node);}
  }else if(panel){close();for(const [node,anchor]of anchors)anchor.replaceWith(node);anchors.clear();panel.remove();toggle.remove();panel=toggle=null;sidebar.classList.remove('compact-navigation');}
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
 new MutationObserver(schedule).observe(sidebar,{childList:true,subtree:true});
 media.addEventListener('change',schedule);
 document.addEventListener('pointerdown',event=>{if(panel&&!panel.contains(event.target)&&!toggle.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel?.classList.contains('is-open')){close();toggle.focus();}});
 sync();
})();