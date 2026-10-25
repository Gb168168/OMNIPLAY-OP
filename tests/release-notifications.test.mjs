import {releaseTemplate,RELEASE_TEMPLATES} from '../release-notification-templates.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildReleaseNotification,publicReleaseNotification,appendReleaseNotification,preserveReleaseNotifications,visibleReleaseNotifications,NOTIFICATION_LIMIT,filterReleaseGames,defaultReleaseGroupIds,DEFAULT_NOTIFICATION_TYPES,normalizeReleaseTypes,changeReleaseTypes,upgradeReleaseTypeConfig} from '../release-notification-model.js';
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
 return{data,publish:item=>context.publishReleaseNotification({},item),withdraw:id=>context.withdrawReleaseNotification({},id),migrate:()=>context.migrateReleaseNotifications({})};
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
  visibleReleaseNotifications,
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
 assert.deepEqual(normalizeReleaseTypes(undefined).map(type=>[type.category,type.name]),[['流程','上架 UAT'],['流程','上架 PORD'],['首發','首發平台 UAT'],['首發','首發平台 PORD'],['首發','首發平台 PORD 延長'],['首發','其他平台(首發後) UAT'],['首發','其他平台(首發後) PORD'],['特選遊戲','特選遊戲 UAT'],['特選遊戲','特選遊戲 PORD'],['其他','素材補充通知'],['其他','新遊戲上線時間調整通知']]);
 const types=normalizeReleaseTypes(undefined);types[0].name='changed';assert.equal(DEFAULT_NOTIFICATION_TYPES[0].name,'上架 UAT');
});
test('types can be added and deleted including all defaults without resurrection',()=>{
 const custom={id:'custom-uat',category:'流程',name:'維護 UAT',nameEn:'Maintenance UAT'};
 const types=changeReleaseTypes(undefined,{add:custom});assert.equal(types.length,12);
 assert.throws(()=>changeReleaseTypes(types,{add:custom}),/已存在/);
 assert.equal(changeReleaseTypes(types,{removeId:'custom-uat'}).length,11);
 let empty=types;for(const type of types)empty=changeReleaseTypes(empty,{removeId:type.id});
 assert.deepEqual(normalizeReleaseTypes(empty),[]);
});
test('custom type snapshots survive deletion and customer delivery; unknown current selections fail closed',()=>{
 const types=normalizeReleaseTypes(undefined),context={uid:'admin',id:'n',game:{id:'1'},groups,types};
 const input={environment:'first-uat',title:'首發',releaseAt:'2026-10-25',groupIds:['a']};
 const item=buildReleaseNotification(input,context);assert.equal(item.typeName,'首發平台 UAT');assert.equal(publicReleaseNotification(item).typeNameEn,'First-launch Platform UAT');
 const remaining=changeReleaseTypes(types,{removeId:'first-uat'});assert.throws(()=>buildReleaseNotification(input,{...context,types:remaining}),/通知類型/);
 assert.equal(item.typeName,'首發平台 UAT');assert.throws(()=>buildReleaseNotification(input,{...context,types:[]}),/通知類型/);
 assert.equal(make().environment,'test');
});

test('all eleven requested types map to the supplied bilingual Excel templates',()=>{
 for(const type of DEFAULT_NOTIFICATION_TYPES){const copy=releaseTemplate(type.id);assert.ok(copy?.messageZh.includes('OMNIPLAY'));assert.ok(copy?.messageEn.includes('OMNIPLAY'));}
 assert.equal(releaseTemplate('flow-uat').messageZh,RELEASE_TEMPLATES.uat.zh.replace(/^遊戲 ID：$/m,'遊戲 ID： ').replace(/^遊戲名稱：$/m,'遊戲名稱： '));
 assert.equal(releaseTemplate('first-pord-extension').messageEn.includes('7 days'),true);
 assert.equal(releaseTemplate('materials').messageZh.includes('素材補充'),true);
 assert.equal(releaseTemplate('schedule-change').messageZh.includes('延後上線'),true);
 assert.equal(releaseTemplate('custom-type'),null);
});
test('templates fill game details literally without changing unknown dates, links or source text',()=>{
 const game={id:'001',mandarinName:'測試$&遊戲',name:'Test $& Game'};
 const copy=releaseTemplate('first-uat',game);
 assert.match(copy.messageZh,/遊戲 ID： 001/);assert.ok(copy.messageZh.includes('遊戲名稱： 測試$&遊戲'));
 assert.ok(copy.messageEn.includes('Game Name： Test $& Game'));assert.ok(copy.messageZh.includes('遊戲素材：\n'));
 assert.ok(copy.messageZh.includes('（UTC+8）'));
 const noDm=releaseTemplate('flow-uat',game,'no-dm');assert.ok(noDm.messageZh.includes('遊戲相關資料提供日期'));assert.equal(noDm.messageZh.includes('遊戲素材：'),false);
 assert.equal(releaseTemplate('flow-pord',game).note.includes('不放宣傳圖'),true);
});
test('upgrades shared old type config once, preserves custom types and respects later deletions',()=>{
 const custom={id:'custom',category:'其他',name:'自訂',nameEn:''};
 const upgraded=upgradeReleaseTypeConfig({types:[...DEFAULT_NOTIFICATION_TYPES.slice(0,4),custom]});assert.equal(upgraded.length,12);assert.equal(upgraded.at(-1).id,'custom');
 const removed=upgraded.filter(type=>type.id!=='materials');
 assert.deepEqual(upgradeReleaseTypeConfig({version:2,types:removed}),removed);
 assert.deepEqual(upgradeReleaseTypeConfig({version:2,types:[]}),[]);
});

test('composer automatically applies templates and preserves manual edits during game updates',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('   let previousTemplate='),end=source.indexOf('   const paintTypes=',start);
 const fields={environment:{value:'flow-uat'},gameId:{value:'001'},templateVariant:{value:'standard'},messageZh:{value:''},messageEn:{value:''},title:{value:''}};
 const nodes=new Map(),form={elements:fields,querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector)}};
 const context={form,preview:{hidden:false},resizeReleaseMessageFields:()=>{},releaseTemplate,notificationTypes:normalizeReleaseTypes(undefined),games:new Map([['001',{id:'001',name:'Test',mandarinName:'測試'}],['002',{id:'002',name:'Next',mandarinName:'下一款'}]]),previousAutoTitle:'',confirm:()=>false};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 vm.runInContext('autoTitle()',context);assert.ok(fields.messageZh.value.includes('遊戲 ID： 001'));assert.ok(fields.messageEn.value.includes('Game Name： Test'));
 fields.messageZh.value='人工修改';fields.gameId.value='002';vm.runInContext('autoTitle()',context);assert.equal(fields.messageZh.value,'人工修改');assert.ok(fields.messageEn.value.includes('Game Name： Next'));
 fields.environment.value='materials';assert.equal(vm.runInContext('replaceTemplate()',context),false);assert.equal(fields.messageZh.value,'人工修改');
 context.confirm=()=>true;assert.equal(vm.runInContext('replaceTemplate()',context),true);assert.ok(fields.messageZh.value.includes('素材補充通知'));assert.ok(fields.messageZh.value.includes('遊戲 ID： 002'));assert.ok(fields.messageEn.value.includes('Marketing Materials Update'));
});

test('description fields grow to longest content, stay equal, and shrink for shorter templates',async()=>{
 const source=await readFile(new URL('../release-notifications.js',import.meta.url),'utf8'),start=source.indexOf('function resizeReleaseMessageFields('),end=source.indexOf('function styles()',start),context={};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const zh={style:{},scrollHeight:510},en={style:{},scrollHeight:650},form={elements:{messageZh:zh,messageEn:en}};
 context.resizeReleaseMessageFields(form);assert.equal(zh.style.height,'652px');assert.equal(en.style.height,'652px');
 zh.scrollHeight=100;en.scrollHeight=140;context.resizeReleaseMessageFields(form);assert.equal(zh.style.height,'160px');assert.equal(en.style.height,'160px');
});
