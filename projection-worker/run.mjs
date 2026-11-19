import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { refreshGroup } from './sync.js';

export async function syncRequestedViews(db, force = false) {
  const request = db.doc('omniplay-sync/customer-views');
  const completed = db.doc('omniplay-sync/customer-views-completed');
  const [pending, previous] = await db.getAll(request, completed);
  const revision = pending.updateTime || null;
  if (!force && previous.exists && (!revision || previous.get('revision')?.isEqual(revision))) return;
  const workspace = await db.doc('omniplay/workspace').get();
  if (!workspace.exists) throw new Error('Workspace missing');
  const views = await db.collection('omniplay-group-views').listDocuments();
  const ids = new Set(views.map(ref => ref.id));
  for (const group of workspace.get('customerGroups') || []) ids.add(group.id);
  for (const id of ids) await refreshGroup(db, id);
  await completed.set({revision});
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  initializeApp({projectId: 'omniplay-op'});
  await syncRequestedViews(getFirestore(), process.argv.includes('--full'));
}
