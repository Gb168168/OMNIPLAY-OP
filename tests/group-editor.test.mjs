import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { accessSession } from '../access-model.js';
test('only OMNIPLAY and OMNIPLAY Support can edit; external admins remain viewers', async () => {
 const config={ownerUid:'rondo',credentialsMigrated:true}, view={enabled:true,allowedPages:['op']};
 const env=await initializeTestEnvironment({projectId:'demo-omniplay-members',firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try {
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
 const db=c.firestore();
 await setDoc(doc(db,'omniplay-security','access'),config);
 await setDoc(doc(db,'omniplay','workspace'),{categories:[]});
 await setDoc(doc(db,'omniplay','op-game-form-records'),{records:{}});
 await setDoc(doc(db,'omniplay-group-views','external'),{enabled:true,allowedPages:['op'],allowedDocumentIds:['op-game-form-records']});
 await setDoc(doc(db,'omniplay-group-views','external','documents','op-game-form-records'),{records:{}});
 for(const [uid,groupName,role] of [['internal','OMNIPLAY','member'],['support','OMNIPLAY Support','member'],['external','Client','admin']]){
 await setDoc(doc(db,'omniplay-member-access',uid),{enabled:true,groupId:uid==='external'?'external':'internal',groupName,username:uid,role});
 const session=accessSession({uid},config,{enabled:true,groupId:'external',groupName,username:uid,role},view);
 assert.equal(session.canEdit,uid!=='external'); assert.equal(session.superAdmin,false);
 }});
 for(const uid of ['internal','support']){
 const db=env.authenticatedContext(uid).firestore();
 await assertSucceeds(setDoc(doc(db,'omniplay','op-game-form-records'),{records:{test:uid}}));
 await assertFails(setDoc(doc(db,'omniplay-member-access','external'),{role:'admin'}));
 await assertFails(getDoc(doc(db,'omniplay-member-secrets','private')));
 }
 const db=env.authenticatedContext('external').firestore();
 await assertSucceeds(getDoc(doc(db,'omniplay-group-views','external','documents','op-game-form-records')));
 await assertFails(getDoc(doc(db,'omniplay','workspace')));
 await assertFails(setDoc(doc(db,'omniplay','op-game-form-records'),{records:{changed:true}}));
 await assertFails(deleteDoc(doc(db,'omniplay','op-game-form-records')));
 await assertFails(setDoc(doc(db,'omniplay-group-views','external','documents','op-game-form-records'),{records:{changed:true}}));
 } finally {await env.cleanup();}
});
