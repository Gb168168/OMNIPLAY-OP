import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { refreshGroup } from './sync.js';

initializeApp();
export const syncCustomerViews = onDocumentWritten({
  document: 'omniplay/{sourceId}', retry: true, maxInstances: 1, concurrency: 1,
  timeoutSeconds: 540, memory: '512MiB'
}, async () => {
  const db = getFirestore();
  const workspace = await db.doc('omniplay/workspace').get();
  if (!workspace.exists) throw new Error('Workspace missing');
  const previous = await db.collection('omniplay-group-views').listDocuments();
  const ids = new Set(previous.map(ref => ref.id));
  for (const group of workspace.get('customerGroups') || []) ids.add(group.id);
  for (const id of ids) await refreshGroup(db, id);
});
