import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails} from '@firebase/rules-unit-testing';
import {doc, setDoc, getDocFromServer, runTransaction} from 'firebase/firestore';
import {saveCategoryName} from '../category-name-sync.js';

test('an authorized category rename is visible to the customer when save resolves', async () => {
  const env=await initializeTestEnvironment({projectId:'demo-omniplay-members',firestore:{host:'127.0.0.1',port:8088,rules:await readFile('firestore.rules','utf8')}});
  try {
    await env.clearFirestore();
    const categories=[{id:'manual',displayName:'Old',pages:[]}];
    const source={customerGroups:[{id:'client'}],categories};
    await env.withSecurityRulesDisabled(async context => {
      const db=context.firestore();
      for (const [path,data] of Object.entries({
        'omniplay-security/access':{ownerUid:'rondo',credentialsMigrated:true},
        'omniplay/workspace':source,
        'omniplay-group-views/client':{enabled:true,categories},
        'omniplay-member-access/reader':{enabled:true,groupId:'client',groupName:'Client',role:'member'},
        'omniplay-member-access/editor':{enabled:true,groupName:'OMNIPLAY Support',role:'admin'},
        'omniplay-page-grants/editor':{pages:{},categories:{manual:['rename']}}
      })) await setDoc(doc(db,path),data);
    });
    const db=env.authenticatedContext('editor').firestore();
    const ref=doc(db,'omniplay/workspace');
    const save=name=>runTransaction(db,async tx=>{
      const incoming=(await tx.get(ref)).data();
      incoming.categories[0].displayName=name;
      await saveCategoryName(tx,ref,id=>doc(db,'omniplay-group-views',id),incoming,{action:'renameCategory',ci:0});
    });
    await save('New');
    const reader=env.authenticatedContext('reader').firestore();
    const customerName=async()=>(await getDocFromServer(doc(reader,'omniplay-group-views/client'))).data().categories[0].displayName;
    assert.equal(await customerName(),'New');
    await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'omniplay-page-grants/editor'),{pages:{},categories:{}}));
    await assertFails(save('Denied'));
    assert.equal(await customerName(),'New');
  } finally {await env.cleanup();}
});
