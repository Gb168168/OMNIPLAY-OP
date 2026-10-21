import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('FBM group preview never inherits the internal editor controls or approval context', async () => {
  const source = (await readFile(new URL('../game-information.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\n/gm, '').replaceAll('export function', 'function').replaceAll('export async function', 'async function');
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', value: '', dataset: {},
      classList: { remove() {}, toggle() {}, add() {} }, addEventListener() {} });
    return nodes.get(selector);
  };
  const workspace = node('#workspace');
  workspace.querySelector = node; workspace.querySelectorAll = () => [];
  let assetArgs, colorAdmin;
  const records = { records: { '101014': { pagcor: 'Yes', groupIds: ['fbm'] } } };
  const ctx = { window: { __omniplayCanEdit: true },
    document: { querySelector: selector => selector === '#workspace' ? workspace : null,
      getElementById: () => true, createElement: () => ({ setAttribute() {}, hidden: true }), body: { append() {} } },
    localStorage: { getItem: () => null }, getApps: () => [{}], initializeApp() {}, getFirestore: () => ({}),
    doc: (_, ...path) => path.join('/'), getDoc: async ref => ({ data: () => ref.endsWith('op-game-form-records') ? records : {} }),
    uniqueGames: () => [{ id: '101014', name: 'Piñata Beat 1000' }], gameListRows: () => [], preferredGameRows: rows => rows,
    openGameAssetsFromRecords: (...args) => { assetArgs = args; },
    installInformationColors: options => { colorAdmin = options.admin; return { apply() {} }; },
  };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  const page = { id: 'info', gameInformation: true };
  await ctx.renderGameInformationPage({ state: {}, page, previewGroupId: 'fbm' });
  assert.doesNotMatch(node('tbody').innerHTML, /data-gi-edit/);
  assert.doesNotMatch(workspace.innerHTML, /data-gi-import|data-gi-header-edit/);
  assert.equal(colorAdmin, false);
  await workspace.onclick({ target: { closest: selector => selector === '[data-gi-id]' ? { dataset: { giId: '101014' } } : null } });
  assert.equal(assetArgs[4], true);
  assert.equal(assetArgs[5], 'fbm');
  await ctx.renderGameInformationPage({ state: {}, page });
  assert.match(node('tbody').innerHTML, /data-gi-edit/);
  assert.equal(colorAdmin, true);
});

test('asset entry point forces read-only mode and preserves the preview group', async () => {
  const source = await readFile(new URL('../op-game-form.js', import.meta.url), 'utf8');
  const entry = source.split('\n').find(line => line.startsWith('export function openGameAssetsFromRecords'))
    .replace('export function', 'function');
  let args;
  const ctx = { installStyles() {}, records: {}, fieldOptions: {}, DEFAULT_FIELD_OPTIONS: {}, structuredClone,
    openAssetViewer: (...value) => { args = value; } };
  vm.createContext(ctx); vm.runInContext(entry, ctx);
  ctx.openGameAssetsFromRecords({ id: '101014' }, {}, null, {}, false, 'fbm');
  assert.equal(args[4], true);
  assert.equal(args[5], 'fbm');
});
