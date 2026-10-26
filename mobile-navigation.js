/* Mobile navigation uses the existing buttons and handlers. */
(()=>{
 const sidebar=document.querySelector('.sidebar'),list=document.getElementById('categoryList');
 if(!sidebar||!list)return;
 const media=matchMedia('(max-width:800px)'),anchors=new Map();
 let strip=null,queued=false;
 function closeMenus(){list.querySelectorAll('.menu-open').forEach(el=>{el.classList.remove('menu-open');el.querySelector('.category-head')?.setAttribute('aria-expanded','false')});list.querySelectorAll('details[open]').forEach(el=>el.open=false);}
 function positionMenus(){
  if(!media.matches||!strip)return;
  const top=strip.getBoundingClientRect().bottom+6;
  for(const panel of list.querySelectorAll('.category.menu-open>.category-pages,.platform-custom-category[open]>div')){
   panel.style.setProperty('--mobile-menu-top',top+'px');
  }
 }
 function sync(){
  queued=false;
  if(media.matches){
   if(!strip){strip=document.createElement('nav');strip.className='mobile-navigation';strip.setAttribute('aria-label','Workspace navigation');sidebar.append(strip);strip.addEventListener('scroll',closeMenus,{passive:true});}
   for(const node of [document.getElementById('addCategoryBtn'),document.getElementById('customerBtn'),list]){
    if(node&&node.parentElement!==strip){if(!anchors.has(node)){const anchor=document.createComment('navigation position');node.before(anchor);anchors.set(node,anchor);}strip.append(node);}
   }
   positionMenus();
  }else if(strip){
   closeMenus();for(const [node,anchor] of anchors){anchor.replaceWith(node);}anchors.clear();strip.remove();strip=null;
   list.querySelectorAll('[style*="--mobile-menu-top"]').forEach(el=>el.style.removeProperty('--mobile-menu-top'));
  }
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
 new MutationObserver(schedule).observe(sidebar,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 sidebar.addEventListener('toggle',schedule,true);
 media.addEventListener('change',schedule);
 window.addEventListener('resize',schedule,{passive:true});
 sync();
})();