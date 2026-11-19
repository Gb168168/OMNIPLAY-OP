// Identify the one category and optional page touched by a workspace save.
export function describeCategoryChange(before, after) {
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  const equal = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  function changedIndex(previous, next) {
    if (next.length > previous.length || previous.length - next.length > 1) return -1;
    return previous.findIndex((item, i) => !equal(item, next[i]));
  }
  const ci = changedIndex(before, after);
  if (ci < 0) throw Error('請重新載入後再修改一個分類或頁面');
  const old = before[ci], updated = after[ci];
  if (before.length > after.length) return {ci, action:'deleteCategory'};
  const pi = changedIndex(old.pages || [], updated.pages || []);
  if (pi < 0) return {ci, action:old.platformVisible !== updated.platformVisible ? 'categoryVisibility' : 'renameCategory'};
  if (old.pages.length > updated.pages.length) return {ci, pi, action:'deletePage'};
  return {ci, pi, action:old.pages[pi].platformVisible !== updated.pages[pi].platformVisible ? 'pageVisibility' : 'editPage'};
}
