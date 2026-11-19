import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { syncRequestedViews } from '../projection-worker/run.mjs';

test('customer reads granted sheet edits only in the assigned group', async () => {
  const projectId = 'demo-omniplay-members';
  const app = initializeApp({projectId}, 'projection-test');
  const admin = getFirestore(app);
  const env = await initializeTestEnvironment({projectId, firestore: {
    host: '127.0.0.1', port: 8088, rules: await readFile('firestore.rules','utf8')
  }});
  try {
    await env.clearFirestore();
    const groups = [{id:'client', name:'Client', allowedPages:['guide']},
      {id:'other', name:'Other', allowedPages:[]}];
    await admin.doc('omniplay/workspace').set({customerGroups:groups, categories:[
      {id:'manual',name:'Documents',pages:[{id:'guide',type:'sheet',name:'Guide'}]}
    ]});
    await admin.doc('omniplay-security/access').set({ownerUid:'rondo',credentialsMigrated:true});
    for(const [uid,groupId,groupName,role] of [['editor','support','OMNIPLAY Support','admin'],
      ['reader','client','Client','member'], ['other','other','Other','member']]) {
      await admin.doc('omniplay-member-access/'+uid).set({enabled:true,groupId,groupName,role});
    }
    await admin.doc('omniplay-page-grants/editor').set({pages:{guide:['edit']},categories:{}});
    const editor = env.authenticatedContext('editor').firestore();
    await syncRequestedViews(admin);
    const live = 'omniplay/sheet-guide-chunk-0';
    const reader = env.authenticatedContext('reader').firestore();
    await setDoc(doc(editor,live), {data:'new sheet content',index:0,updatedAt:'now'});
    assert.equal((await getDoc(doc(reader,live))).data().data, 'new sheet content');
    await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(),live)));
    const batch = writeBatch(editor);
    batch.set(doc(editor,'omniplay/sheet-guide'), {summary:'updated'});
    batch.set(doc(editor,'omniplay-sync/customer-views'), {requestedAt:serverTimestamp()});
    await batch.commit();
    await syncRequestedViews(admin);
    await syncRequestedViews(admin);
    const customer = env.authenticatedContext('reader').firestore();
    const path = 'omniplay-group-views/client/documents/sheet-guide';
    assert.equal((await getDoc(doc(customer,path))).data().summary,'updated');
    await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(),path)));
  } finally { await env.cleanup(); await deleteApp(app); }
});
