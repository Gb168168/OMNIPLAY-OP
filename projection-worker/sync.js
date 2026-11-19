import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { groupWorkspace, groupDocumentIds, projectGroupGameDocument } from '../member-model.js';

// Re-read the source in the transaction. Repeated or out-of-order events
// must publish the current data, never the contents of an old event.
export async function refreshGroup(db, groupId) {
  const source = db.collection('omniplay');
  const root = db.collection('omniplay-group-views').doc(groupId);
  await db.runTransaction(async tx => {
    const sourceDocs = await tx.get(source);
    const values = new Map(sourceDocs.docs.map(doc => [doc.id, doc.data()]));
    const workspace = values.get('workspace');
    if (!workspace) throw new Error('Workspace missing');
    const group = workspace.customerGroups?.find(group => group.id === groupId);
    const old = (await tx.get(root)).data();
    if (!group) {
      if (old && old.enabled !== false) tx.set(root, { enabled: false });
      return;
    }
    const documents = root.collection('documents');
    const previous = await tx.get(documents);
    const existing = new Map(previous.docs.map(doc => [doc.id, doc.data()]));
    const view = groupWorkspace(workspace, group, values);
    view.permissionsUpdatedAt = group.permissionsUpdatedAt || '';
    view.allowedDocumentIds = groupDocumentIds(workspace, group, [...values.keys()]);
    const revision = createHash('sha256').update(JSON.stringify(view.categories));
    for (const id of view.allowedDocumentIds) {
      const next = projectGroupGameDocument(id, values.get(id), values.get('game-list-online-page'),
        values.get('op-game-form-records'), group, workspace);
      revision.update(JSON.stringify([id, next]));
      if (!isDeepStrictEqual(existing.get(id), next)) tx.set(documents.doc(id), next);
      existing.delete(id);
    }
    for (const id of existing.keys()) tx.delete(documents.doc(id));
    view.documentRevision = revision.digest('hex');
    if (old?.releaseNotifications) view.releaseNotifications = old.releaseNotifications;
    if (!isDeepStrictEqual(old, view)) tx.set(root, view);
  });
}
