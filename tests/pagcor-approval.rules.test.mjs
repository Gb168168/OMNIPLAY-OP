import test, { before, after, beforeEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore';
let env;
const ownerUid = 'xqDN3vaLfufEkz4TZ1omSmGkQ2A2';
const approvalPath = ['omniplay-pagcor-approvals', '90001'];
const filePath = [...approvalPath, 'files', 'file', 'chunks', '0'];
before(async () => {
  env = await initializeTestEnvironment({ projectId:'demo-omniplay-pagcor', firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')} });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [uid, platformId] of [['a','platform-a'],['b','platform-b'],['unbound',''],['disabled','platform-a']]) {
      await setDoc(doc(db,'omniplay-member-access',uid), { enabled:uid!=='disabled', username:uid, groupName:'Client',groupId:'shared',platformId });
    }
    for (const platformId of ['platform-a','platform-b']) await setDoc(doc(db,'omniplay-platform-access',platformId), { enabled:true,groupId:'shared' });
    await setDoc(doc(db,'omniplay-group-views','shared'), { enabled:true,allowedDocumentIds:['op-game-customer-records'] });
    await setDoc(doc(db,'omniplay-group-views','shared','documents','op-game-customer-records'), {records:{'90001':{}}});
    await setDoc(doc(db,...approvalPath), {allowedPlatformIds:['platform-a'],items:[{id:'file',kind:'file',name:'Approval.pdf',size:1,chunkCount:1}],fileIds:['file'],revision:1,updatedAt:''});
    await setDoc(doc(db,...filePath), {data:'YQ=='});
    await setDoc(doc(db,...approvalPath,'files','unsaved','chunks','0'), {data:'Yg=='});
  });
});
test('only the selected platform reads approval metadata and actual file bytes, even in the same group', async () => {
  const a=env.authenticatedContext('a').firestore(), b=env.authenticatedContext('b').firestore();
  await assertSucceeds(getDoc(doc(a,...approvalPath)));
  await assertSucceeds(getDoc(doc(a,...filePath)));
  await assertFails(getDoc(doc(b,...approvalPath)));
  await assertFails(getDoc(doc(b,...filePath)));
  await assertFails(getDoc(doc(a,...approvalPath,'files','unsaved','chunks','0')));
  await assertFails(getDocs(collection(a,'omniplay-pagcor-approvals')));
  await assertFails(getDocs(collection(a,...approvalPath,'files','file','chunks')));
});
test('anonymous unbound disabled and unknown users cannot fetch private data or guessed file paths', async () => {
  for (const context of [env.unauthenticatedContext(),env.authenticatedContext('unbound'),env.authenticatedContext('disabled'),env.authenticatedContext('unknown')]) {
    await assertFails(getDoc(doc(context.firestore(),...approvalPath)));
    await assertFails(getDoc(doc(context.firestore(),...filePath)));
  }
});
test('customers cannot grant themselves a platform or write approval metadata or file contents', async () => {
  const db=env.authenticatedContext('b').firestore();
  await assertFails(updateDoc(doc(db,'omniplay-member-access','b'), {platformId:'platform-a'}));
  await assertFails(setDoc(doc(db,'omniplay-platform-access','platform-b'), {enabled:true,groupId:'shared'}));
  await assertFails(updateDoc(doc(db,...approvalPath), {allowedPlatformIds:['platform-b']}));
  await assertFails(setDoc(doc(db,...filePath), {data:'evil'}));
});
test('revoking platform, group, game, page, or file denies both metadata and byte access as applicable', async () => {
  const db=env.authenticatedContext('a').firestore();
  const changes=[
    [['omniplay-platform-access','platform-a'], {enabled:false}],
    [['omniplay-platform-access','platform-a'], {groupId:'other'}],
    [['omniplay-group-views','shared'], {enabled:false}],
    [['omniplay-group-views','shared'], {allowedDocumentIds:[]}],
    [['omniplay-group-views','shared','documents','op-game-customer-records'], {records:{}}],
    [approvalPath,{allowedPlatformIds:[]}],
  ];
  for (const [path, patch] of changes) {
    let prior;
    await env.withSecurityRulesDisabled(async context=>{const ref=doc(context.firestore(),...path);prior=(await getDoc(ref)).data();await updateDoc(ref,patch);});
    await assertFails(getDoc(doc(db,...approvalPath)));
    await assertFails(getDoc(doc(db,...filePath)));
    await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),...path),prior));
  }
  await env.withSecurityRulesDisabled(context=>updateDoc(doc(context.firestore(),...approvalPath),{fileIds:[]}));
  await assertFails(getDoc(doc(db,...filePath)));
});
test('owner can create independent approvals and upload chunks but cannot write oversized chunks', async () => {
  const db=env.authenticatedContext(ownerUid).firestore();
  await assertSucceeds(setDoc(doc(db,'omniplay-pagcor-approvals','90002'), {allowedPlatformIds:[],items:[],fileIds:[],revision:1,updatedAt:''}));
  await assertSucceeds(setDoc(doc(db,...filePath), {data:'safe'}));
  await assertFails(setDoc(doc(db,...filePath), {data:'x'.repeat(349529)}));
});
