// Read and write the source and its customer copies in one transaction.
export async function saveCategoryName(transaction, workspaceRef, viewRef, incoming, change) {
  const category = incoming.categories[change.ci];
  const snapshots = await Promise.all((incoming.customerGroups || []).map(group => transaction.get(viewRef(group.id))));
  transaction.set(workspaceRef, {...incoming, grantChange:change});
  for (const snapshot of snapshots) {
    if (!snapshot.exists()) continue;
    const current = snapshot.data();
    if (!current.enabled) continue;
    const index = current.categories.findIndex(item => item.id === category.id);
    if (index < 0 || current.categories[index].displayName === category.displayName) continue;
    const categories = current.categories.slice();
    categories[index] = {...categories[index], displayName:category.displayName};
    transaction.update(snapshot.ref,{categories,categoryRename:{ci:change.ci,index}});
  }
}
