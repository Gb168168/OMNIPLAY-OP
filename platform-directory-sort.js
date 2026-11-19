const compareRank=(a,b)=>(a??Infinity)-(b??Infinity);
export function orderSections(sections){
 const rank=section=>section.children.reduce((min,row)=>Math.min(min,row.directorySectionOrder??Infinity),Infinity);
 for(const section of sections)section.children.sort((a,b)=>compareRank(a.directoryRowOrder,b.directoryRowOrder));
 return sections.sort((a,b)=>Number(!!a.ungrouped)-Number(!!b.ungrouped)||compareRank(rank(a),rank(b)));
}

export function openDirectorySort(sections,{en,save}){
 const t=(zh,english)=>en?english:zh;
 const groups=sections.map(section=>({...section,children:[...section.children]}));
 if(!groups.some(g=>g.ungrouped))groups.push({ungrouped:true,children:[]});
 const dialog=document.createElement('dialog');
 dialog.className='directory-sort';
 dialog.innerHTML='<header><h2></h2><p></p></header><div class="sort-create"><input maxlength="100"><button type="button" class="secondary"></button></div><div class="sort-list"></div><footer><span role="status"></span><button class="secondary"></button><button class="primary"></button></footer>';
 const find=s=>dialog.querySelector(s),list=find('.sort-list'),input=find('input'),status=find('[role=status]');
 find('h2').textContent=t('編輯平台分組與順序','Arrange Platform Groups');
 find('p').textContent=t('拖移群組標題調整順序。拖移平台到群組標題可加入該組，拖到平台列可排在它前面。','Drag a group header to reorder groups. Drop a platform on a header to join that group, or on a platform to insert before it.');
 input.placeholder=t('新平台群組名稱','New platform group name');input.setAttribute('aria-label',input.placeholder);
 const add=find('.sort-create button'),cancel=find('footer .secondary'),submit=find('footer .primary');
 add.textContent=t('＋ 建立群組','＋ Create Group');cancel.textContent=t('取消','Cancel');submit.textContent=t('儲存','Save');
 let dragging=null,busy=false,dirty=false;
 const positions=new WeakMap();
 function row(group,platform){
  const el=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');
  el.className=platform?'sort-platform':'sort-heading';el.draggable=!!platform||!group.ungrouped;
  const handle=document.createElement('span');handle.className='sort-grip';handle.textContent=el.draggable?'⠿':'';
  title.textContent=platform?platform.name:(group.parentName||t('未分組平台','Ungrouped Platforms'));
  detail.textContent=platform?(platform.domain||platform.username||'—'):String(group.children.length);
  el.append(handle,title,detail);positions.set(el,{group,platform});list.append(el);
 }
 function draw(){
  list.replaceChildren();
  for(const group of groups){row(group,null);for(const platform of group.children)row(group,platform);}
  submit.disabled=busy||!dirty||groups.some(g=>g.created&&!g.children.length);
 }
 function create(){
  const name=input.value.trim();
  if(!name){input.focus();return;}
  if(groups.some(g=>g.parentName?.toLowerCase()===name.toLowerCase())){status.textContent=t('已有相同群組名稱','Group name already exists');return;}
  const group={parentName:name,children:[],created:true};
  groups.unshift(group);dirty=true;input.value='';draw();list.scrollTop=0;
  status.textContent=t('請將平台拖入新群組後儲存。','Drag a platform into the new group, then save.');
 }
 add.onclick=create;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();create();}};
 const target=e=>e.target.closest('.sort-heading,.sort-platform');
 const clear=()=>{list.querySelector('.sort-target')?.classList.remove('sort-target');};
 list.ondragstart=e=>{
  const el=target(e);if(!el?.draggable||busy){e.preventDefault();return;}
  dragging=positions.get(el);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','platform-directory');
 };
 const accepts=dest=>dragging&&dest&&(dragging.platform?dragging.platform!==dest.platform:!dest.platform&&dragging.group!==dest.group);
 list.ondragover=e=>{
  const el=target(e);clear();if(!accepts(positions.get(el)))return;
  e.preventDefault();e.dataTransfer.dropEffect='move';el.classList.add('sort-target');
 };
 list.ondragend=()=>{dragging=null;clear();};
 list.ondrop=e=>{
  e.preventDefault();const dest=positions.get(target(e));clear();if(!accepts(dest))return;
  const {group,platform}=dragging;dragging=null;
  if(platform){
   group.children.splice(group.children.indexOf(platform),1);
   const index=dest.platform?dest.group.children.indexOf(dest.platform):dest.group.children.length;
   dest.group.children.splice(index,0,platform);
   if(group!==dest.group){
    dest.group.membersChanged=true;group.membersChanged=true;
    if(!group.children.length&&!group.ungrouped)groups.splice(groups.indexOf(group),1);
   }
  }else{
   groups.splice(groups.indexOf(group),1);groups.splice(groups.indexOf(dest.group),0,group);
  }
  dirty=true;status.textContent='';draw();
 };
 cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};
 submit.onclick=async()=>{
  if(busy||submit.disabled)return;busy=true;dialog.inert=true;
  try{
   const changes=new Map();
   groups.forEach((group,sectionOrder)=>{
    const id=group.membersChanged&&!group.ungrouped?(group.customId||crypto.randomUUID()):null;
    group.children.forEach((platform,rowOrder)=>{
     const change={directorySectionOrder:sectionOrder,directoryRowOrder:rowOrder};
     if(group.membersChanged&&!group.ungrouped)Object.assign(change,{directoryGroupId:id,directoryGroupName:group.parentName,directoryAutoGroupDisabled:false});
     if(group.ungrouped&&sections.some(s=>!s.ungrouped&&s.children.includes(platform)))Object.assign(change,{directoryGroupId:null,directoryGroupName:'',directoryAutoGroupDisabled:true});
     changes.set(platform.id,change);
    });
   });
   await save(changes);dialog.close();
  }catch(error){status.textContent=t('儲存失敗，請重試。','Save failed. Please try again.');console.error(error);}
  finally{busy=false;dialog.inert=false;draw();}
 };
 dialog.onclose=()=>dialog.remove();document.body.append(dialog);draw();dialog.showModal();
}
