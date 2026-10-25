import {releaseTemplate,RELEASE_TEMPLATES} from '../release-notification-templates.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildReleaseNotification,publicReleaseNotification,appendReleaseNotification,preserveReleaseNotifications,visibleReleaseNotifications,NOTIFICATION_LIMIT,filterReleaseGames,defaultReleaseGroupIds,DEFAULT_NOTIFICATION_TYPES,normalizeReleaseTypes,changeReleaseTypes,upgradeReleaseTypeConfig,isPordNotification,notificationCategory,notificationTransition,notificationHasNoReleaseDate} from '../release-notification-model.js';
const groups=[{id:'a',name:'客戶 A'},{id:'b',name:'客戶 B'}];
const make=(overrides={})=>buildReleaseNotification({environment:'test',title:'龍門天下測試上架',message:'請安排驗收',releaseAt:'2026-10-14T16:00+08:00',groupIds:['a'],...overrides},{uid:'admin',name:'管理者',id:'n1',game:{id:'001',name:'Power Dragon',mandarinName:'龍門天下',version:'2.0.0'},groups,now:'2026-10-14T07:00:00.000Z'});
test('validates environment, game, recipients, length and dates; stores Taipei time as UTC',()=>{
 const item=make();assert.equal(item.releaseAt,'2026-10-14T08:00:00.000Z');assert.equal(item.game.id,'001');
 for(const patch of [{environment:'invalid'},{title:''},{title:'x'.repeat(201)},{message:'x'.repeat(2001)},{releaseAt:'invalid'},{groupIds:[]},{groupIds:['unknown']}])assert.throws(()=>make(patch));
 assert.deepEqual(make({groupIds:['a','a']}).groupIds,['a']);
 assert.equal(make({environment:'production'}).environment,'production');
});
test('customer payload excludes other recipient identities and publisher account',()=>{
 const data=publicReleaseNotification(make({groupIds:['a','b']}));assert.equal(data.title,'龍門天下測試上架');
 for(const key of ['groupIds','groupNames','createdBy','createdByName'])assert.equal(key in data,false);
});
test('preserves notification history through workspace sync and permission changes',()=>{
 const previous={releaseNotifications:[publicReleaseNotification(make())]};
 const view=preserveReleaseNotifications({allowedPages:['new']},previous);assert.deepEqual(view.releaseNotifications,previous.releaseNotifications);view.releaseNotifications[0].title='changed';assert.notEqual(view.releaseNotifications[0].title,previous.releaseNotifications[0].title);
 assert.deepEqual(preserveReleaseNotifications({releaseNotifications:[]},previous).releaseNotifications,[]);
});
test('limits history, de-duplicates IDs, hides withdrawals and orders newest first',()=>{
 const history=Array.from({length:150},(_,i)=>({...make(),id:String(i),createdAt:'2026-10-13T00:00:00.000Z'}));
 const rows=appendReleaseNotification(history,make());assert.equal(rows.length,NOTIFICATION_LIMIT);assert.equal(rows[0].id,'n1');
 assert.equal(appendReleaseNotification(rows,make()).filter(item=>item.id==='n1').length,1);
 assert.deepEqual(visibleReleaseNotifications([{...make(),id:'old',createdAt:'2020'},{...make(),id:'withdrawn',status:'withdrawn'},make()]).map(item=>item.id),['n1','old']);
});
async function mockStore(seed={}){
 const data=new Map(Object.entries(seed)),source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const context={console,Date,structuredClone,appendReleaseNotification,publicReleaseNotification,
  getDoc:async ref=>({exists:()=>data.has(ref),data:()=>structuredClone(data.get(ref))}),
  doc:(db,...parts)=>parts.join('/'),runTransaction:async(db,callback)=>{
   const next=new Map([...data].map(([key,value])=>[key,structuredClone(value)]));let writing=false;
   const snapshot=ref=>({exists:()=>next.has(ref),data:()=>structuredClone(next.get(ref))});
   await callback({get:async ref=>{assert.equal(writing,false,'all reads must precede writes');return snapshot(ref);},
    set:(ref,value)=>{writing=true;next.set(ref,{...(next.get(ref)||{}),...structuredClone(value)});},
    update:(ref,value)=>{writing=true;assert.ok(next.has(ref));next.set(ref,{...next.get(ref),...structuredClone(value)});}});
   data.clear();for(const [key,value] of next)data.set(key,value);
  }};
 vm.createContext(context);vm.runInContext(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
 return{data,edit:(item,revision)=>context.editReleaseNotification({},item,revision),publish:item=>context.publishReleaseNotification({},item),withdraw:id=>context.withdrawReleaseNotification({},id),delete:id=>context.deleteReleaseNotification({},id),migrate:()=>context.migrateReleaseNotifications({})};
}
test('publishes only selected groups atomically, preserves permission fields, retries once per ID',async()=>{
 const base={enabled:true,allowedPages:['game'],allowedDocumentIds:['op-game-customer-records']};
 const store=await mockStore({'omniplay-group-views/a':base,'omniplay-group-views/b':base});
 await store.publish(make());await store.publish(make());
 assert.equal(store.data.get('omniplay-release-notifications/n1').id,'n1');
 assert.equal(store.data.get('omniplay-group-views/a').releaseNotifications.length,1);
 assert.equal(store.data.get('omniplay-group-views/b').releaseNotifications,undefined);
 assert.deepEqual(store.data.get('omniplay-group-views/a').allowedPages,['game']);
});
test('disabled recipients reject the entire publication without partial customer delivery',async()=>{
 const store=await mockStore({'omniplay-group-views/a':{enabled:true},'omniplay-group-views/b':{enabled:false}});
 await assert.rejects(store.publish(make({groupIds:['a','b']})),/停用/);
 assert.equal(store.data.has('omniplay-release-notifications/n1'),false);
 assert.equal(store.data.get('omniplay-group-views/a').releaseNotifications,undefined);
});
test('withdrawal removes customer copies and keeps management history; deleted groups do not block it',async()=>{
 const store=await mockStore({'omniplay-group-views/a':{enabled:true},'omniplay-group-views/b':{enabled:true}});
 await store.publish(make({groupIds:['a','b']}));store.data.delete('omniplay-group-views/b');
 await store.withdraw('n1');await store.withdraw('n1');
 assert.deepEqual(store.data.get('omniplay-group-views/a').releaseNotifications,[]);
 assert.equal(store.data.get('omniplay-release-notifications/n1').status,'withdrawn');
});

test('customer bell reads only its group, shows unread notifications, marks read and never exposes publish controls',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),nodes=new Map(),storage=new Map();let subscription;
 class Node{
  constructor(){this.nodes=new Map();this.listeners={};this.textContent='';this.innerHTML='';this.open=false;}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
  querySelectorAll(){return[];}
  append(node){if(node.id)nodes.set(node.id,node);}
  insertBefore(node){this.append(node);}
  setAttribute(){}
  addEventListener(type,fn){this.listeners[type]=fn;}
  showModal(){this.open=true;}
  close(){this.open=false;}
 }
 const controls=new Node(),head=new Node(),body=new Node(),callbacks={},context={
  console,Date,Map,Set,structuredClone,ENVIRONMENTS:{test:{zh:'測試環境上架',en:'Test Environment Release'}},NOTIFICATION_LIMIT,
  visibleReleaseNotifications,isPordNotification,notificationHasNoReleaseDate,
  window:{__omniplaySession:{authUid:'client-uid',groupId:'a',canEdit:false},addEventListener:(type,fn)=>callbacks[type]=fn},
  document:{getElementById:id=>nodes.get(id),querySelector:selector=>selector==='.session-controls'?controls:null,
   createElement:()=>new Node(),head,body,documentElement:new Node()},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  doc:(db,...parts)=>parts.join('/'),onSnapshot:(ref,success)=>{subscription={ref,success};return()=>{};},
  MutationObserver:class{observe(){}disconnect(){}}
 };
 vm.createContext(context);vm.runInContext(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
 context.installReleaseNotifications({db:{},state:{}});assert.equal(subscription.ref,'omniplay-group-views/a');
 subscription.success({exists:()=>true,data:()=>({releaseNotifications:[publicReleaseNotification(make())]})});
 const bell=nodes.get('releaseNotificationBell');assert.equal(bell.querySelector('.release-badge').hidden,false);assert.equal(bell.querySelector('.release-badge').textContent,'1');
 bell.onclick();const list=nodes.get('releaseNotificationList');assert.doesNotMatch(list.innerHTML,/data-compose|新增上架通知/);
 assert.match(list.querySelector('[data-list]').innerHTML,/龍門天下測試上架/);
 list.querySelector('[data-read-all]').listeners.click();assert.equal(bell.querySelector('.release-badge').hidden,true);
 assert.match(storage.get('omniplay-release-read-v1:client-uid:a'),/n1/);
 assert.equal(list.open,true);
});

test('group game search matches only assigned games and rejects unknown groups',()=>{
 const games=[{id:'106010',name:'Sexbomb MHYCA',mandarinName:'性感炸彈 麥卡'},{id:'100001',name:'Power Dragon',mandarinName:'龍門天下'},{id:'100002',name:'Power Fortune'}],records={'106010':{groupIds:['a']},'100001':{groupIds:['b']}},searchGroups=[{id:'a'},{id:'b'},{id:'unset'}];
 assert.deepEqual(filterReleaseGames(games,records,searchGroups,'a').map(game=>game.id),['106010']);
 for(const term of ['106010','性感','mhyca'])assert.equal(filterReleaseGames(games,records,searchGroups,'a',term).length,1);
 assert.equal(filterReleaseGames(games,records,searchGroups,'a','Power').length,0);
 assert.equal(filterReleaseGames(games,records,searchGroups,'b','106010').length,0);
 assert.equal(filterReleaseGames(games,records,searchGroups,'unset').length,0);
 assert.equal(filterReleaseGames(games,records,searchGroups,'unknown').length,0);
 assert.equal(filterReleaseGames(games,records,searchGroups).length,3);
});
test('OMNIPLAY and OMNIPLAY Support can be selected as notification recipients',()=>{
 const item=buildReleaseNotification({environment:'test',title:'內部測試通知',releaseAt:'2026-10-15T00:00:00+08:00',groupIds:['internal','support']},{uid:'admin',id:'internal-test',game:{id:'106010'},groups:[{id:'internal',name:'OMNIPLAY'},{id:'support',name:'OMNIPLAY Support'}]});
 assert.deepEqual(item.groupNames,['OMNIPLAY','OMNIPLAY Support']);
});


test('legacy migration preserves history and never resurrects withdrawn notifications',async()=>{
 const old=make();
 const store=await mockStore({'omniplay/game-release-notifications':{items:[old]},'omniplay-group-views/a':{enabled:true,releaseNotifications:[publicReleaseNotification(old)]}});
 await store.migrate();assert.equal(store.data.get('omniplay-release-notifications/n1').title,old.title);
 await store.withdraw('n1');await store.migrate();
 assert.equal(store.data.get('omniplay-release-notifications/n1').status,'withdrawn');
 assert.deepEqual(store.data.get('omniplay-group-views/a').releaseNotifications,[]);
 assert.equal(store.data.get('omniplay/game-release-notifications').items[0].status,'published');
});

test('game selection defaults only assigned existing groups, without duplicates or unknown recipients',()=>{
 const records={'g1':{groupIds:['a','b','a','removed']},'g2':{groupIds:['b']}};
 assert.deepEqual(defaultReleaseGroupIds('g1',records,groups),['a','b']);
 assert.deepEqual(defaultReleaseGroupIds('g2',records,groups),['b']);
 for(const gameId of ['missing','g3'])assert.deepEqual(defaultReleaseGroupIds(gameId,records,groups),[]);
 assert.deepEqual(defaultReleaseGroupIds('g1',records,[]),[]);
});
test('malformed group assignments never default to all recipients',()=>{
 for(const groupIds of [null,'a',{},undefined])assert.deepEqual(defaultReleaseGroupIds('game',{game:{groupIds}},groups),[]);
});

test('notification images survive delivery as descriptors without embedding large image data',()=>{
 const image={id:'image-123',name:'遊戲海報.png',data:'private-image-bytes'};
 const item=make({images:[image]});
 assert.deepEqual(item.images,[{id:'image-123',name:'遊戲海報.png'}]);
 assert.deepEqual(publicReleaseNotification(item).images,item.images);
 assert.equal(JSON.stringify(item).includes('private-image-bytes'),false);
});
test('rejects invalid, duplicate and excessive notification images',()=>{
 for(const images of [[{id:'../bad',name:'x'}],[{id:'x',name:'a'},{id:'x',name:'b'}],Array.from({length:4},(_,i)=>({id:'image-'+i,name:'x'})),[null],{}])assert.throws(()=>make({images}),/圖片/);
 assert.equal(make().images,undefined);
});
test('image descriptors remain available to selected customers and disappear on withdrawal',async()=>{
 const store=await mockStore({'omniplay-group-views/a':{enabled:true},'omniplay-group-views/b':{enabled:true}});
 await store.publish(make({images:[{id:'poster-1',name:'poster.jpg'}]}));
 assert.equal(store.data.get('omniplay-group-views/a').releaseNotifications[0].images[0].id,'poster-1');
 assert.equal(store.data.get('omniplay-group-views/b').releaseNotifications,undefined);
 await store.withdraw('n1');assert.deepEqual(store.data.get('omniplay-group-views/a').releaseNotifications,[]);
});

test('image file storage validates payloads and keeps bytes separate from notification copies',async()=>{
 const source=await readFile(new URL('../release-notification-images.js',import.meta.url),'utf8'),data=new Map();
 const context={console,doc:(_db,...parts)=>parts.join('/'),setDoc:async(ref,value)=>data.set(ref,value),getDocFromServer:async ref=>({exists:()=>data.has(ref),data:()=>data.get(ref)})};
 vm.createContext(context);vm.runInContext(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
 const image={id:'poster-1',data:'data:image/jpeg;base64,/9j/2Q=='};
 await context.uploadReleaseImages({},'n1',[image]);assert.equal(data.get('omniplay-release-notifications/n1/images/poster-1').data,image.data);
 assert.equal(await context.readReleaseImage({},'n1','poster-1'),image.data);
 await assert.rejects(context.uploadReleaseImages({},'n1',[{...image,data:'https://untrusted.example/image.jpg'}]),/無效/);
 await assert.rejects(context.uploadReleaseImages({},'n1',[{...image,data:'data:image/jpeg;base64,'+'a'.repeat(400000)}]),/無效/);
 await assert.rejects(context.readReleaseImage({},'n1','missing'),/載入/);
 await assert.rejects(context.prepareReleaseImage({type:'image/svg+xml',size:10}),/JPG/);
 await assert.rejects(context.prepareReleaseImage({type:'image/jpeg',size:11*1024*1024}),/10 MB/);
});

test('paste area focuses without opening file picker; only explicit button opens picker',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function bindReleaseImagePicker('),end=source.indexOf('function styles()',start);
 let opens=0,focuses=0,received=[],prevented=0;const choose={},paste={focus:()=>focuses++},listeners={},input={files:[{type:'image/png',name:'chosen.png'}],click:()=>opens++},form={querySelector:selector=>selector==='[data-choose-images]'?choose:paste,addEventListener:(type,fn)=>listeners[type]=fn};
 const context={};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 context.bindReleaseImagePicker(form,input,files=>received.push(Array.from(files)));
 paste.onclick();assert.equal(focuses,1);assert.equal(opens,0);
 const image={type:'image/png',name:'clipboard.png'};
 listeners.paste({clipboardData:{files:[image]},preventDefault:()=>prevented++});
 assert.equal(opens,0);assert.equal(prevented,1);assert.equal(received[0][0],image);
 listeners.paste({clipboardData:{files:[]},preventDefault:()=>prevented++});assert.equal(prevented,1);
 choose.onclick();assert.equal(opens,1);input.onchange();assert.equal(received[1][0].name,'chosen.png');
});

test('stores independent Chinese and English messages and retains legacy compatibility',()=>{
 const item=make({messageZh:' 中文說明\n第二行 ',messageEn:' English description '});
 assert.equal(item.messageZh,'中文說明\n第二行');assert.equal(item.messageEn,'English description');
 assert.equal(item.message,item.messageZh);assert.equal(publicReleaseNotification(item).messageEn,item.messageEn);
 assert.equal(make({message:'舊版說明'}).messageZh,'舊版說明');
 assert.equal(make({messageZh:'',messageEn:'English only'}).message,'English only');
 for(const field of ['messageZh','messageEn'])assert.throws(()=>make({[field]:'x'.repeat(2001)}),/2000/);
});
test('customer display follows language selection with fallback for single-language and legacy notifications',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function notificationMessage('),end=source.indexOf('function bilingualMessageMarkup(',start);let en=false;
 const context={english:()=>en};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const item={messageZh:'中文',messageEn:'English',message:'legacy'};
 assert.equal(context.notificationMessage(item),'中文');en=true;assert.equal(context.notificationMessage(item),'English');
 assert.equal(context.notificationMessage({message:'舊通知'}),'舊通知');assert.equal(context.notificationMessage({messageZh:'只有中文'}),'只有中文');
 en=false;assert.equal(context.notificationMessage({messageEn:'English only'}),'English only');
});

test('default notification types preserve requested groups, names and order',()=>{
 assert.deepEqual(normalizeReleaseTypes(undefined).map(type=>[type.category,type.name]),[['流程','上架 UAT'],['流程','上架 PORD'],['首發','首發平台 PORD'],['首發','首發平台 PORD 延長'],['首發','其他平台(首發後) UAT'],['首發','其他平台(首發後) PORD'],['特選','特選遊戲 UAT'],['特選','特選遊戲 PORD'],['其他','素材補充通知'],['其他','新遊戲上線時間調整通知']]);
 const types=normalizeReleaseTypes(undefined);types[0].name='changed';assert.equal(DEFAULT_NOTIFICATION_TYPES[0].name,'上架 UAT');
});
test('types can be added and deleted including all defaults without resurrection',()=>{
 const custom={id:'custom-uat',category:'流程',name:'維護 UAT',nameEn:'Maintenance UAT'};
 const types=changeReleaseTypes(undefined,{add:custom});assert.equal(types.length,11);
 assert.throws(()=>changeReleaseTypes(types,{add:custom}),/已存在/);
 assert.equal(changeReleaseTypes(types,{removeId:'custom-uat'}).length,10);
 let empty=types;for(const type of types)empty=changeReleaseTypes(empty,{removeId:type.id});
 assert.deepEqual(normalizeReleaseTypes(empty),[]);
});
test('custom type snapshots survive deletion and customer delivery; unknown current selections fail closed',()=>{
 const types=normalizeReleaseTypes(undefined),context={uid:'admin',id:'n',game:{id:'1'},groups,types};
 const input={environment:'first-pord',title:'首發',releaseAt:'2026-10-25',groupIds:['a']};
 const item=buildReleaseNotification(input,context);assert.equal(item.typeName,'首發平台 PORD');assert.equal(publicReleaseNotification(item).typeNameEn,'First-launch Platform PORD');
 const remaining=changeReleaseTypes(types,{removeId:'first-pord'});assert.throws(()=>buildReleaseNotification(input,{...context,types:remaining}),/通知類型/);
 assert.equal(item.typeName,'首發平台 PORD');assert.throws(()=>buildReleaseNotification(input,{...context,types:[]}),/通知類型/);
 assert.equal(make().environment,'test');
});

test('all notification templates extract bilingual titles and retain useful instructions',()=>{
 for(const type of DEFAULT_NOTIFICATION_TYPES){const copy=releaseTemplate(type.id);assert.ok(copy?.titleZh);assert.ok(copy?.titleEn);assert.ok(copy.messageZh);assert.ok(copy.messageEn);assert.ok(!copy.messageZh.includes(copy.titleZh));assert.ok(!copy.messageEn.includes(copy.titleEn));}
 assert.equal(releaseTemplate('flow-uat').titleZh,RELEASE_TEMPLATES.uat.zh.split('\n')[0]);
 assert.equal(releaseTemplate('first-pord-extension').messageEn.includes('7 days'),true);
 assert.equal(releaseTemplate('custom-type'),null);
});
test('compact descriptions remove repeated game details and release date but keep independent deadlines',()=>{
 const copy=releaseTemplate('flow-uat',{id:'100001',name:'Power Dragon'});
 assert.doesNotMatch(copy.messageZh,/遊戲 ID|遊戲名稱|遊戲清單|遊戲素材|行銷資源|正式環境上線日期|團隊 敬上/);
 assert.doesNotMatch(copy.messageEn,/Game ID|Game Name|Game List|Game Assets|Marketing Resources|PROD Environment Release Date|Best regards/);
 assert.match(copy.messageZh,/更新至測試環境/);assert.match(copy.messageZh,/收到通知後/);
 assert.match(releaseTemplate('first-pord').messageZh,/搶先體驗期間/);
 assert.match(releaseTemplate('flow-uat',null,'no-dm').messageZh,/遊戲相關資料提供日期/);
});
test('upgrades shared old type config once, preserves custom types and respects later deletions',()=>{
 const custom={id:'custom',category:'其他',name:'自訂',nameEn:''};
 const upgraded=upgradeReleaseTypeConfig({types:[...DEFAULT_NOTIFICATION_TYPES.slice(0,4),custom]});assert.equal(upgraded.length,11);assert.equal(upgraded.at(-1).id,'custom');
 const removed=upgraded.filter(type=>type.id!=='materials');
 assert.deepEqual(upgradeReleaseTypeConfig({version:2,types:removed}),removed);
 assert.deepEqual(upgradeReleaseTypeConfig({version:2,types:[]}),[]);
});

test('composer automatically applies templates and preserves manual edits during game updates',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('   let previousDateGameId='),end=source.indexOf('   const paintTypes=',start);
 const fields={releaseAt:{value:''},environment:{value:'flow-uat'},gameId:{value:'001'},templateVariant:{value:'standard'},messageZh:{value:''},messageEn:{value:''},titleZh:{value:''},titleEn:{value:''}};
 const nodes=new Map(),form={elements:fields,querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector)}};
 const context={form,isPordNotification,notificationHasNoReleaseDate,preview:{hidden:false},resizeReleaseMessageFields:()=>{},updateDateReminder:()=>{},notificationTemplateDates:copy=>copy,defaultNotificationDate:()=>'',records:{},releaseTemplate,notificationTypes:normalizeReleaseTypes(undefined),games:new Map([['001',{id:'001',name:'Test',mandarinName:'測試'}],['002',{id:'002',name:'Next',mandarinName:'下一款'}]]),previousAutoTitle:'',confirm:()=>false};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 vm.runInContext('autoTitle()',context);assert.equal(fields.titleZh.value,releaseTemplate('flow-uat').titleZh);assert.equal(fields.titleEn.value,releaseTemplate('flow-uat').titleEn);
 fields.messageZh.value='人工修改';fields.gameId.value='002';vm.runInContext('autoTitle()',context);assert.equal(fields.messageZh.value,'人工修改');assert.equal(fields.messageEn.value,releaseTemplate('flow-uat').messageEn);
 fields.environment.value='materials';assert.equal(vm.runInContext('replaceTemplate()',context),false);assert.equal(fields.messageZh.value,'人工修改');
 context.confirm=()=>true;assert.equal(vm.runInContext('replaceTemplate()',context),true);assert.match(fields.titleZh.value,/素材補充通知/);assert.match(fields.titleEn.value,/Marketing Materials Update/);assert.match(fields.messageZh.value,/補充提供/);
});

test('description fields grow to longest content, stay equal, and shrink for shorter templates',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function resizeReleaseMessageFields('),end=source.indexOf('function styles()',start),context={};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const zh={style:{},scrollHeight:510},en={style:{},scrollHeight:650},form={elements:{messageZh:zh,messageEn:en}};
 context.resizeReleaseMessageFields(form);assert.equal(zh.style.height,'652px');assert.equal(en.style.height,'652px');
 zh.scrollHeight=100;en.scrollHeight=140;context.resizeReleaseMessageFields(form);assert.equal(zh.style.height,'160px');assert.equal(en.style.height,'160px');
});

test('editing atomically updates retained recipients, adds new recipients, and removes old copies',async()=>{
 const store=await mockStore({'omniplay-group-views/a':{enabled:true,allowedPages:['keep']},'omniplay-group-views/b':{enabled:true}});
 const original=make();await store.publish(original);
 const changed=make({groupIds:['b'],messageZh:'更新的中文',messageEn:'Updated English',images:[{id:'poster',name:'poster.jpg'}]});
 await store.edit({...changed,createdBy:'editor',createdByName:'Editor'},original.createdAt);
 assert.deepEqual(store.data.get('omniplay-group-views/a').releaseNotifications,[]);
 const copy=store.data.get('omniplay-group-views/b').releaseNotifications[0];
 assert.equal(copy.messageZh,'更新的中文');assert.equal(copy.messageEn,'Updated English');assert.equal(copy.images[0].id,'poster');
 assert.equal(copy.createdAt,original.createdAt);assert.ok(copy.updatedAt);
 for(const key of ['groupIds','groupNames','createdBy','createdByName','updatedBy','updatedByName'])assert.equal(key in copy,false);
 const source=store.data.get('omniplay-release-notifications/n1');assert.equal(source.createdBy,'admin');assert.equal(source.updatedBy,'editor');
 assert.deepEqual(store.data.get('omniplay-group-views/a').allowedPages,['keep']);
 await assert.rejects(store.edit(changed,original.createdAt),/其他管理員修改/);
});
test('editing disabled recipients or withdrawn notifications fails without partial changes',async()=>{
 const store=await mockStore({'omniplay-group-views/a':{enabled:true},'omniplay-group-views/b':{enabled:false}});
 const original=make();await store.publish(original);
 await assert.rejects(store.edit(make({groupIds:['b']}),original.createdAt),/停用/);
 assert.equal(store.data.get('omniplay-group-views/a').releaseNotifications.length,1);
 await store.withdraw('n1');await assert.rejects(store.edit(original,original.createdAt),/撤回/);
});
test('group badges expose only own group to recipients, and updated notifications become unread',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function notificationReadKey('),end=source.indexOf('export async function withdrawReleaseNotification(',start),context={esc:value=>String(value)};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const item={id:'n',groupNames:['Support','OKBET']};
 assert.match(context.recipientGroupsMarkup(item,true,''),/Support/);assert.match(context.recipientGroupsMarkup(item,true,''),/OKBET/);
 const customer=context.recipientGroupsMarkup(item,false,'OKBET');assert.match(customer,/OKBET/);assert.doesNotMatch(customer,/Support/);
 assert.equal(context.notificationReadKey(item),'n');assert.notEqual(context.notificationReadKey({...item,updatedAt:'new'}),'n');
});


test('notification resource links open the matching Game ID in both languages and safely escape text',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const start=source.indexOf('function notificationMessageMarkup('),end=source.indexOf('function bilingualMessageMarkup(',start);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context={esc};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 for(const key of ['遊戲清單','遊戲素材','行銷資源','Game List','Game Assets','Marketing Resources']){
  const html=context.notificationMessageMarkup(key+'： GAME ID 100001','100001');
  assert.match(html,/data-notification-game="100001"/);assert.match(html,/GAME ID 100001 ↗/);
 }
 const legacy=context.notificationMessageMarkup('遊戲清單：\n\n遊戲素材：\n行銷資源：','100001');
 assert.equal((legacy.match(/data-notification-game=/g)||[]).length,3);assert.ok(legacy.includes('\n\n'));
 assert.doesNotMatch(context.notificationMessageMarkup('Game Assets: https://drive.google.com/example','100001'),/<button/);
 assert.equal(context.notificationMessageMarkup('<img src=x onerror=alert(1)>','100001'),'&lt;img src=x onerror=alert(1)&gt;');
 assert.doesNotMatch(context.notificationMessageMarkup('遊戲素材：',''),/<button/);
 const template=releaseTemplate('flow-uat',{id:'100001',name:'Power Dragon'});
 assert.doesNotMatch(template.messageZh,/遊戲清單/);assert.doesNotMatch(template.messageEn,/Marketing Resources/);
});
test('notification game opener uses the authorized customer catalog and rejects inaccessible games',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
 const body=app.slice(app.indexOf('async function openNotificationGame('),app.indexOf('function isAdminWorkspaceView('));
 let opened=null;const context={window:{__omniplaySession:{canEdit:false}},db:{},state:{},save:()=>{},renderNav:()=>{},
  getCustomerGameCatalog:async()=>({rowsJson:'[]',records:{}}),gameListRows:()=>[['100001']],uniqueGames:()=>[{id:'100001',name:'Power Dragon'}],
  openGameAssetsFromRecords:(...args)=>{opened=args;}};
 vm.createContext(context);vm.runInContext(body,context);await context.openNotificationGame('100001');assert.equal(opened[0].id,'100001');assert.equal(opened[4],true);
 opened=null;await assert.rejects(context.openNotificationGame('100003'),/access denied/);assert.equal(opened,null);
});

test('bilingual titles persist through recipient payloads, support legacy fallback and validate length',async()=>{
 const item=make({titleZh:'中文標題',titleEn:'English title'});
 assert.equal(item.title,'中文標題');assert.equal(publicReleaseNotification(item).titleEn,'English title');
 assert.throws(()=>make({titleEn:'x'.repeat(201)}));assert.equal(make().titleZh,'龍門天下測試上架');
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const start=source.indexOf('function notificationTitle('),end=source.indexOf('function notificationGameMarkup(',start);
 let en=false;const context={english:()=>en,esc:value=>String(value)};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 assert.equal(context.notificationTitle(item),'中文標題');en=true;assert.equal(context.notificationTitle(item),'English title');assert.equal(context.notificationTitle({title:'Legacy'}),'Legacy');
 const html=context.notificationTitleMarkup(item,true);assert.match(html,/中文標題/);assert.match(html,/English title/);
 const gameStart=source.indexOf('function notificationGameMarkup('),gameEnd=source.indexOf('function notificationMessage(',gameStart);vm.runInContext(source.slice(gameStart,gameEnd),context);
 assert.match(context.notificationGameMarkup(item),/data-notification-game="001"/);
});

test('removes first-launch UAT from defaults and existing shared configurations without restoring deleted types',()=>{
 const types=[...DEFAULT_NOTIFICATION_TYPES,{id:'first-uat',category:'首發',name:'首發平台 UAT'},{id:'custom',category:'其他',name:'Custom'}];
 for(const version of [1,2,3]){const result=upgradeReleaseTypeConfig({version,types});assert.ok(!result.some(type=>type.id==='first-uat'));assert.ok(result.some(type=>type.id==='custom'));}
 assert.deepEqual(upgradeReleaseTypeConfig({version:3,types:[]}),[]);assert.equal(releaseTemplate('first-uat'),null);
});
test('early access release uses requested bilingual wording, signatures and visible date placeholders',async()=>{
 const copy=releaseTemplate('first-pord');
 assert.equal(copy.titleZh,'◀️ OMNIPLAY 正式環境－遊戲搶先體驗上架通知 ▶️');
 assert.match(copy.messageZh,/即日起至【請輸入 YYYY \/ MM \/ DD】 （UTC\+8）/);
 assert.match(copy.messageZh,/如有延長安排，將另行通知。/);assert.ok(copy.messageZh.endsWith('OMNIPLAY 團隊 敬上'));
 assert.match(copy.messageEn,/From now until \[Enter YYYY \/ MM \/ DD\] \(UTC\+8\)/);
 assert.ok(copy.messageEn.endsWith('Best regards,\nOMNIPLAY Team'));
 assert.match(copy.messageEn,/Kindly assist with arranging its launch on your platform/);
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');assert.match(source,/data-date-reminder/);assert.match(source,/data-description-dates/);
});

test('description date input synchronizes both languages and updates only the selected date slot',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function descriptionDatePattern('),end=source.indexOf('function notificationTitle(',start),context={};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const template=releaseTemplate('first-pord');
 const zh=context.fillDescriptionDate(template.messageZh,0,'2026-11-09','zh');
 const en=context.fillDescriptionDate(template.messageEn,0,'2026-11-09','en');
 assert.match(zh,/即日起至 2026 \/ 11 \/ 09 （UTC\+8）/);assert.match(en,/until 2026 \/ 11 \/ 09 \(UTC\+8\)/);
 assert.equal(context.descriptionDateSlots(zh)[0].date,'2026-11-09');
 assert.match(context.fillDescriptionDate(zh,0,'2026-12-02','zh'),/2026 \/ 12 \/ 02/);
 assert.match(context.fillDescriptionDate(en,0,'','en'),/\[Enter YYYY \/ MM \/ DD\]/);
 const multi='開始【請輸入 YYYY / MM / DD】（UTC+8）\n結束【請輸入 YYYY / MM / DD】（UTC+8）';
 const changed=context.fillDescriptionDate(multi,1,'2026-12-02','zh');assert.match(changed,/開始【請輸入 YYYY/);assert.match(changed,/結束 2026 \/ 12 \/ 02/);
 assert.equal(context.fillDescriptionDate('保留我的說明與 7 天期限',0,'2026-12-02','zh'),'保留我的說明與 7 天期限');
 assert.throws(()=>context.fillDescriptionDate(multi,0,'12/02/2026','zh'));
});

test('notification dates prefer actual release, fall back only when blank, and validate calendar dates',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function defaultNotificationDate('),end=source.indexOf('function notificationTitle(',start),context={};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 assert.equal(context.defaultNotificationDate({releaseDate:'2026-11-02',plannedReleaseDate:'2026-10-28'}),'2026-11-02');
 assert.equal(context.defaultNotificationDate({releaseDate:'  ',plannedReleaseDate:'2026/10/28'}),'2026-10-28');
 assert.equal(context.defaultNotificationDate({}), '');
 assert.equal(context.defaultNotificationDate({releaseDate:'2026-02-30',plannedReleaseDate:'2026-10-28'}),'');
 const copy=context.notificationTemplateDates(releaseTemplate('first-pord'),{releaseDate:'2026-11-02'});
 assert.match(copy.messageZh,/2026 \/ 11 \/ 02/);assert.match(copy.messageEn,/2026 \/ 11 \/ 02/);
 assert.doesNotMatch(copy.messageZh,/請輸入/);assert.doesNotMatch(copy.messageEn,/Enter YYYY/);
 const planned=context.notificationTemplateDates(releaseTemplate('first-pord'),{plannedReleaseDate:'2026-12-03'});assert.match(planned.messageZh,/2026 \/ 12 \/ 03/);
});

test('composer defaults release time and bilingual descriptions from the selected game and preserves manual date edits',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const elements={releaseAt:{value:''},environment:{value:'other-uat'},gameId:{value:'001'},templateVariant:{value:'no-dm'},titleZh:{value:''},titleEn:{value:''},messageZh:{value:''},messageEn:{value:''}};
 const nodes=new Map(),context={isPordNotification,notificationHasNoReleaseDate,notificationTypes:normalizeReleaseTypes(undefined),form:{elements,querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);}},
 records:{'001':{releaseDate:'2026-11-04',plannedReleaseDate:'2026-10-20'},'002':{plannedReleaseDate:'2026-12-05'},'003':{}},
 games:new Map([['001',{id:'001'}],['002',{id:'002'}],['003',{id:'003'}]]),releaseTemplate,preview:{},resizeReleaseMessageFields:()=>{},updateDateReminder:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function defaultNotificationDate('),source.indexOf('function notificationTitle(')),context);
 vm.runInContext(source.slice(source.indexOf('   let previousDateGameId='),source.indexOf('   const replaceTemplate=')),context);
 vm.runInContext('applyTemplate()',context);assert.equal(elements.releaseAt.value,'2026-11-04');assert.match(elements.messageZh.value,/2026 \/ 11 \/ 04/);assert.match(elements.messageEn.value,/2026 \/ 11 \/ 04/);
 elements.releaseAt.value='2026-11-09';vm.runInContext('applyTemplate()',context);assert.equal(elements.releaseAt.value,'2026-11-09');
 elements.gameId.value='002';vm.runInContext('applyTemplate()',context);assert.equal(elements.releaseAt.value,'2026-12-05');assert.match(elements.messageEn.value,/2026 \/ 12 \/ 05/);
 elements.gameId.value='003';vm.runInContext('applyTemplate()',context);assert.equal(elements.releaseAt.value,'');assert.match(elements.messageZh.value,/請輸入 YYYY/);
});

test('PORD types clear release dates while UAT still requires a valid date',()=>{
 for(const environment of ['flow-pord','first-pord','first-pord-extension','other-pord','selected-pord']){
  assert.equal(make({environment,releaseAt:''}).releaseAt,'');assert.equal(make({environment}).releaseAt,'');
 }
 assert.throws(()=>make({environment:'flow-uat',releaseAt:''}),/上架時間/);
 const custom=[{id:'custom',category:'其他',name:'維護 PORD'}];assert.equal(buildReleaseNotification({environment:'custom',title:'維護',groupIds:['a']},{uid:'admin',id:'custom',game:{id:'1'},groups,types:custom}).releaseAt,'');
});
test('transition buttons map only UAT to PORD and first platform PORD to other-platform UAT',()=>{
 for(const prefix of ['flow','other','selected'])assert.equal(notificationTransition(make({environment:prefix+'-uat'})).typeId,prefix+'-pord');
 for(const environment of ['first-pord','first-pord-extension']){const transition=notificationTransition(make({environment}));assert.equal(transition.typeId,'other-uat');assert.equal(transition.label,'其他平台(首發後) UAT');}
 assert.equal(notificationTransition(make({environment:'flow-pord'})),null);
 assert.equal(notificationTransition({...make({environment:'flow-uat'}),status:'withdrawn'}),null);
 const custom=[{id:'a',name:'Maintenance UAT'},{id:'b',name:'Maintenance PORD'}];assert.equal(notificationTransition({environment:'a',typeName:'Maintenance UAT',status:'published'},custom).typeId,'b');
 assert.equal(notificationCategory({typeCategory:'特選遊戲'}),'特選');
});
test('delete removes recipient copies while keeping a tombstone to prevent legacy resurrection',async()=>{
 const base={enabled:true,allowedPages:['game'],allowedDocumentIds:['op-game-customer-records']};
 const store=await mockStore({'omniplay-group-views/a':base,'omniplay-group-views/b':base});await store.publish(make());await store.delete('n1');
 assert.equal(store.data.get('omniplay-release-notifications/n1').status,'deleted');assert.equal(store.data.get('omniplay-group-views/a').releaseNotifications.length,0);
 store.data.set('omniplay/game-release-notifications',{items:[make()]});await store.migrate();assert.equal(store.data.get('omniplay-release-notifications/n1').status,'deleted');
 await store.withdraw('n1');assert.equal(store.data.get('omniplay-release-notifications/n1').status,'deleted');
});

test('admin table shares one header, omits empty sections and seeds transitions as new notifications',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const rows=[make({environment:'flow-uat'}),{...make({environment:'first-pord'}),id:'first',releaseAt:'2026-10-25T00:00:00Z'},{...make({environment:'flow-pord'}),id:'prod'}];
 const transitionButton={dataset:{transition:'n1'}},list={innerHTML:'',querySelectorAll:selector=>selector==='[data-transition]'?[transitionButton]:[]};let draft;
 const context={items:rows,notificationCategory,notificationTransition,isPordNotification,notificationHasNoReleaseDate,esc:value=>String(value??''),notificationTypeLabel:item=>item.typeName,releaseDate:value=>'DATE:'+value,bindGameLinks:()=>{},compose:(...args)=>{draft=args;}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf(' function renderAdminList('),source.indexOf(' function renderList(')),context);
 context.renderAdminList(list,{},rows);const html=list.innerHTML;
 const offsets=['流程','首發'].map(category=>html.indexOf('-------'+category+'-------'));assert.ok(offsets.every((value,index)=>value>=0&&(!index||value>offsets[index-1])));
 assert.equal((html.match(/<thead>/g)||[]).length,1);assert.doesNotMatch(html,/-------特選-------|-------其他-------/);assert.match(html,/release-actions-cell/);assert.match(html,/Game ID/);assert.match(html,/功能鍵/);assert.match(html,/data-transition="n1"/);assert.match(html,/data-transition="first"/);assert.doesNotMatch(html,/data-transition="prod"/);
 assert.doesNotMatch(html,/DATE:2026-10-25T00:00:00Z/);assert.match(html,/data-delete="n1"/);assert.match(html,/data-groups="n1"/);
 transitionButton.onclick();assert.equal(draft[1],null);assert.equal(draft[2].transition.typeId,'flow-pord');assert.equal(draft[2].game.id,'001');assert.deepEqual(draft[2].groupIds,['a']);
});

test('PORD composer disables and clears release time without clearing the description deadline',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const elements={releaseAt:{value:'2026-10-25'},environment:{value:'first-pord'},gameId:{value:'001'},templateVariant:{value:'standard'},titleZh:{value:''},titleEn:{value:''},messageZh:{value:''},messageEn:{value:''}};
 const nodes=new Map(),context={isPordNotification,notificationHasNoReleaseDate,notificationTypes:normalizeReleaseTypes(undefined),form:{elements,querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);}},records:{'001':{releaseDate:'2026-11-04'}},games:new Map([['001',{id:'001'}]]),releaseTemplate,preview:{},resizeReleaseMessageFields:()=>{},updateDateReminder:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function defaultNotificationDate('),source.indexOf('function notificationTitle(')),context);
 vm.runInContext(source.slice(source.indexOf('   let previousDateGameId='),source.indexOf('   const replaceTemplate=')),context);
 vm.runInContext('applyTemplate()',context);assert.equal(elements.releaseAt.value,'');assert.equal(elements.releaseAt.required,false);assert.equal(elements.releaseAt.disabled,true);assert.match(elements.messageZh.value,/2026 \/ 11 \/ 04/);
 elements.environment.value='other-uat';vm.runInContext('applyTemplate(true)',context);assert.equal(elements.releaseAt.value,'2026-11-04');assert.equal(elements.releaseAt.disabled,false);assert.equal(elements.releaseAt.required,true);
});

test('materials have an editable bilingual description date while release time is always blank',async()=>{
 const copy=releaseTemplate('materials');assert.match(copy.messageZh,/素材補充日期：【請輸入 YYYY \/ MM \/ DD】/);assert.match(copy.messageEn,/Materials Update Date: \[Enter YYYY/);
 assert.equal(make({environment:'materials',releaseAt:''}).releaseAt,'');assert.equal(make({environment:'materials',releaseAt:'2026-12-02'}).releaseAt,'');
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const elements={releaseAt:{value:'2026-10-25'},environment:{value:'materials'},gameId:{value:'001'},templateVariant:{value:'standard'},titleZh:{value:''},titleEn:{value:''},messageZh:{value:''},messageEn:{value:''}};
 const nodes=new Map(),context={isPordNotification,notificationHasNoReleaseDate,notificationTypes:normalizeReleaseTypes(undefined),form:{elements,querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);}},records:{'001':{}},games:new Map([['001',{id:'001'}]]),releaseTemplate,preview:{},resizeReleaseMessageFields:()=>{},updateDateReminder:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function defaultNotificationDate('),source.indexOf('function notificationTitle(')),context);
 vm.runInContext(source.slice(source.indexOf('   let previousDateGameId='),source.indexOf('   const replaceTemplate=')),context);vm.runInContext('applyTemplate()',context);
 assert.equal(elements.releaseAt.value,'');assert.equal(elements.releaseAt.disabled,true);assert.equal(elements.releaseAt.required,false);
 assert.equal(context.descriptionDateSlots(elements.messageZh.value).length,1);assert.equal(context.descriptionDateSlots(elements.messageEn.value).length,1);
 assert.match(context.fillDescriptionDate(elements.messageZh.value,0,'2026-11-05','zh'),/2026 \/ 11 \/ 05/);
});
test('admin type labels remain Chinese even when recipient language is English',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8');
 const start=source.indexOf('function notificationTypeLabel('),end=source.indexOf('export function installReleaseNotifications(',start),context={english:()=>true,ENVIRONMENTS:{}};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const item={environment:'first-pord',typeName:'首發平台 PORD',typeNameEn:'First-launch Platform PORD'};
 assert.equal(context.notificationTypeLabel(item,true),'首發平台 PORD');assert.equal(context.notificationTypeLabel(item),'First-launch Platform PORD');
});
