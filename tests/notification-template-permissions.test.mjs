import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,collection,setDoc,deleteDoc,getDoc,writeBatch,serverTimestamp} from 'firebase/firestore';

test('Rondo grants and revokes template editing; each update records an immutable version',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-release-templates',firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try{
  await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();
   await setDoc(doc(db,'omniplay-security/access'),{ownerUid:'rondo',credentialsMigrated:true});
   await setDoc(doc(db,'omniplay-member-access/staff'),{username:'Staff',enabled:true,groupName:'OMNIPLAY'});
  });
  const staff=env.authenticatedContext('staff').firestore(),owner=env.authenticatedContext('rondo').firestore();
  const grant=db=>doc(db,'omniplay-template-grants/staff');
  const ref=doc(staff,'omniplay-notification-templates/flow-uat');
  const before={titleZh:'舊標題',titleEn:'',messageZh:'',messageEn:''},fields={...before,titleZh:'新標題'};
  function change(previous,next){
   const version=doc(collection(ref,'history')),data={before:previous,fields:next,author:'Staff',uid:'staff',at:serverTimestamp(),revision:version.id};
   const batch=writeBatch(staff);batch.set(ref,data);batch.set(version,data);
   return {batch,version,data};
  }
  await assertFails(setDoc(grant(staff),{enabled:true}));
  await assertFails(change(before,fields).batch.commit());
  await assertSucceeds(setDoc(grant(owner),{enabled:true}));
  const first=change(before,fields);
  await assertFails(setDoc(ref,first.data));
  await assertSucceeds(first.batch.commit());
  await assertFails(deleteDoc(first.version));
  await assertFails(change(before,fields).batch.commit());
  await assertSucceeds(change(fields,before).batch.commit());
  await assertSucceeds(deleteDoc(grant(owner)));
  await assertFails(change(before,fields).batch.commit());
  await assertSucceeds(getDoc(ref));
 }finally{await env.cleanup()}
});
