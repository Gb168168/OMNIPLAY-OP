export const ENVIRONMENTS={test:{zh:'測試環境上架',en:'Test Environment Release'},production:{zh:'正式環境上架',en:'Production Environment Release'}};
export const NOTIFICATION_LIMIT=100;
export function buildReleaseNotification(input,{uid,name,game,groups,now=new Date().toISOString(),id}){
 if(!uid||!id||!game?.id)throw new Error('請選擇遊戲並確認登入狀態');
 if(!Object.hasOwn(ENVIRONMENTS,input.environment))throw new Error('請選擇上架環境');
 const title=String(input.title||'').trim(),message=String(input.message||'').trim(),releaseAt=String(input.releaseAt||'');
 if(!title||title.length>200||message.length>2000)throw new Error('標題必填且限 200 字；說明限 2000 字');
 if(!releaseAt||!Number.isFinite(Date.parse(releaseAt)))throw new Error('請填寫有效的上架時間');
 const selected=[...new Set(input.groupIds||[])],known=new Map(groups.map(group=>[group.id,group]));
 if(!selected.length||selected.length>400||selected.some(groupId=>!known.has(groupId)))throw new Error('請選擇有效的接收群組（最多 400 個）');
 return{id,environment:input.environment,title,message,releaseAt:new Date(releaseAt).toISOString(),game:{id:String(game.id),name:String(game.name||''),mandarinName:String(game.mandarinName||''),version:String(game.version||'')},groupIds:selected,groupNames:selected.map(groupId=>String(known.get(groupId).name||'')),createdAt:now,createdBy:uid,createdByName:String(name||''),status:'published'};
}
export function publicReleaseNotification(notification){const{groupIds,groupNames,createdBy,createdByName,...content}=notification;return content;}
export function appendReleaseNotification(existing,notification){return[notification,...(Array.isArray(existing)?existing:[]).filter(item=>item.id!==notification.id)].slice(0,NOTIFICATION_LIMIT);}
export function preserveReleaseNotifications(incoming,latest){if(!Object.hasOwn(incoming,'releaseNotifications')&&Object.hasOwn(latest,'releaseNotifications'))incoming.releaseNotifications=structuredClone(latest.releaseNotifications);return incoming;}
export function visibleReleaseNotifications(items){return(Array.isArray(items)?items:[]).filter(item=>item.status==='published').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
