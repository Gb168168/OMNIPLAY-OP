import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, getDoc, doc } from 'firebase/firestore';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { ADMIN_UID, memberCredentials } from '../member-model.js';

test('actual account sync provisions explicit platform binding, reassignment and platform removal', async () => {
  const projectId='demo-omniplay-pagcor-sync';
  process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9098';
  const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
  const server=initializeAdmin({projectId},'pagcor-sync-admin');
  await adminAuth(server).createUser({uid:ADMIN_UID,email:'goldbricks168@gmail.com',password:'test-owner-password'});
  const cfg={projectId,apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com'}, app=initializeApp(cfg);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});
  const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8088);
  await signInWithEmailAndPassword(auth,'goldbricks168@gmail.com','test-owner-password');
  globalThis.window={__omniplaySession:{superAdmin:true,canEdit:true}};
  globalThis.document={querySelector:()=>null};
  const production=await readFile(new URL('../member-access.js',import.meta.url),'utf8');
  const source="import {connectAuthEmulator} from 'firebase/auth';\n"+production
    .replaceAll('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js','firebase/app')
    .replaceAll('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js','firebase/auth')
    .replaceAll('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js','firebase/firestore')
    .replace(/'\.\/member-model\.js(?:\?[^']*)?'/,"'../member-model.js'")
    .replace(/'\.\/release-notification-model\.js(?:\?[^']*)?'/,"'../release-notification-model.js'")
    .replace('const auth = getAuth(auxiliary);',"const auth = getAuth(auxiliary);if(!auth.emulatorConfig)connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});");
  const tmp=new URL('../tmp/',import.meta.url);await mkdir(tmp,{recursive:true});
  await writeFile(new URL('pagcor-member-access.mjs',tmp),source);
  const access=await import(new URL('pagcor-member-access.mjs',tmp));
  const group={id:'shared',name:'Clients',allowedPages:[],members:[{id:'member',name:'User',username:'User',password:'test',platformId:'a'}]};
  const workspace={categories:[],customerGroups:[group],customers:[{id:'a',groupId:'shared'},{id:'b',groupId:'shared'}]};
  const viewer=initializeApp(cfg,'pagcor-viewer'),viewerAuth=getAuth(viewer);
  connectAuthEmulator(viewerAuth,'http://127.0.0.1:9098',{disableWarnings:true});
  try {
    await access.setDoc(doc(db,'omniplay','workspace'),workspace);
    const login=await memberCredentials('User','test');await signInWithEmailAndPassword(viewerAuth,login.email,login.password);
    const uid=viewerAuth.currentUser.uid;
    assert.equal((await getDoc(doc(db,'omniplay-member-access',uid))).data().platformId,'a');
    assert.deepEqual((await getDoc(doc(db,'omniplay-platform-access','a'))).data(),{enabled:true,groupId:'shared'});
    group.members[0].platformId='b';await access.setDoc(doc(db,'omniplay','workspace'),workspace);
    assert.equal((await getDoc(doc(db,'omniplay-member-access',uid))).data().platformId,'b');
    workspace.customers=workspace.customers.filter(platform=>platform.id!=='b');
    await access.setDoc(doc(db,'omniplay','workspace'),workspace);
    assert.equal((await getDoc(doc(db,'omniplay-member-access',uid))).data().platformId,'');
    assert.equal((await getDoc(doc(db,'omniplay-platform-access','b'))).data().enabled,false);
    assert.equal(auth.currentUser.uid,ADMIN_UID);
  } finally {
    const auxiliary=getApps().find(app=>app.name==='member-provisioning');
    if(auxiliary)await deleteApp(auxiliary);
    await deleteApp(viewer);await deleteApp(app);await deleteAdmin(server);await env.cleanup();
  }
});
